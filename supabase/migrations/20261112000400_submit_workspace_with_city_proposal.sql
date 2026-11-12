BEGIN;

-- These legacy triggers are also invoked by RPCs with a restricted search path.
ALTER FUNCTION public.auto_set_first_photo_primary() SET search_path TO public, pg_temp;
ALTER FUNCTION public.update_city_workspace_count() SET search_path TO public, pg_temp;

ALTER TABLE public.workspaces
  ADD COLUMN proposed_city_name varchar(255),
  ADD COLUMN proposed_city_country varchar(100),
  ADD CONSTRAINT workspace_city_proposal_is_complete CHECK (
    (proposed_city_name IS NULL AND proposed_city_country IS NULL)
    OR (proposed_city_name IS NOT NULL AND proposed_city_country IS NOT NULL
      AND btrim(proposed_city_name) <> '' AND btrim(proposed_city_country) <> ''
      AND city_id IS NULL AND status <> 'approved')
  );

CREATE FUNCTION public.submit_workspace_with_photos(
  submission_uuid uuid, city_name text, country_name text, details jsonb, photo_urls text[]
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  existing_owner uuid;
  matched_city uuid;
  requested_city text := btrim(city_name);
  requested_country text := btrim(country_name);
  place_name text;
  slug_base text;
  inserted_id uuid;
  columns_sql text;
  values_sql text;
  payload jsonb;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in to submit a place.' USING ERRCODE = '42501'; END IF;
  IF submission_uuid IS NULL THEN RAISE EXCEPTION 'Missing submission ID.' USING ERRCODE = '22023'; END IF;

  -- Serialize retries for the same draft without granting members an UPDATE lock.
  PERFORM pg_advisory_xact_lock(hashtextextended('workspace-submission:' || submission_uuid::text, 0));
  SELECT submitted_by INTO existing_owner FROM public.workspaces WHERE id = submission_uuid;
  IF FOUND THEN
    IF existing_owner = actor THEN RETURN submission_uuid; END IF;
    RAISE EXCEPTION 'Submission ID is unavailable.' USING ERRCODE = '22023';
  END IF;

  IF requested_city IS NULL OR char_length(requested_city) NOT BETWEEN 1 AND 255
    OR requested_country IS NULL OR char_length(requested_country) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Enter the city and country.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(details) IS DISTINCT FROM 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(details) AS key(col) WHERE col NOT IN (
      'name', 'type', 'address', 'latitude', 'longitude', 'location_source', 'location_provider',
      'location_provider_id', 'location_confidence', 'location_raw', 'website', 'phone', 'description',
      'short_description', 'has_wifi', 'wifi_speed', 'has_power_outlets', 'power_outlet_availability',
      'seating_capacity', 'seating_comfort', 'has_outdoor_seating', 'has_standing_desks', 'noise_level',
      'has_natural_light', 'has_air_conditioning', 'has_heating', 'music_volume', 'has_restrooms',
      'has_parking', 'has_bike_parking', 'is_accessible', 'allows_pets', 'has_food', 'has_veg',
      'has_coffee', 'has_alcohol', 'price_range', 'laptop_friendly', 'time_limit_hours',
      'minimum_purchase_required', 'good_for_meetings', 'good_for_calls', 'good_for_groups',
      'wifi_password_required'
    )
  ) THEN
    RAISE EXCEPTION 'Invalid workspace details.' USING ERRCODE = '22023';
  END IF;
  place_name := btrim(details ->> 'name');
  IF place_name IS NULL OR char_length(place_name) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'Enter a place name.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(details -> 'latitude') IS DISTINCT FROM 'number'
    OR jsonb_typeof(details -> 'longitude') IS DISTINCT FROM 'number'
    OR (details ->> 'latitude')::numeric NOT BETWEEN -90 AND 90
    OR (details ->> 'longitude')::numeric NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Select a valid map location.' USING ERRCODE = '22023';
  END IF;
  IF coalesce(cardinality(photo_urls), 0) NOT BETWEEN 1 AND 5 OR array_ndims(photo_urls) <> 1
    OR EXISTS (
      SELECT 1 FROM unnest(photo_urls) AS photo(url)
      WHERE url IS NULL OR length(url) > 2048
        OR url !~ ('^(https://[^/?#]+|http://(127[.]0[.]0[.]1|localhost):[0-9]+)/storage/v1/object/public/workspace-photos/'
          || actor::text || '/temp/[A-Za-z0-9_.-]+$')
    )
    OR (SELECT count(DISTINCT url) FROM unnest(photo_urls) AS photo(url)) <> cardinality(photo_urls) THEN
    RAISE EXCEPTION 'Attach one to five distinct photos uploaded for this draft.' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO matched_city FROM public.cities
  WHERE lower(btrim(name)) = lower(requested_city) AND lower(btrim(country)) = lower(requested_country)
  ORDER BY created_at, id LIMIT 1;

  slug_base := coalesce(nullif(left(btrim(regexp_replace(lower(place_name), '[^a-z0-9]+', '-', 'g'), '-'), 215), ''), 'place');
  payload := details || jsonb_build_object(
    'id', submission_uuid, 'name', place_name, 'slug', slug_base, 'status', 'pending', 'submitted_by', actor,
    'city_id', matched_city,
    'proposed_city_name', CASE WHEN matched_city IS NULL THEN requested_city END,
    'proposed_city_country', CASE WHEN matched_city IS NULL THEN requested_country END
  );
  SELECT string_agg(format('%I', col), ', ' ORDER BY col),
         string_agg(format('incoming.%I', col), ', ' ORDER BY col)
  INTO columns_sql, values_sql FROM jsonb_object_keys(payload) AS key(col);

  -- Keep legacy public URLs unchanged; only use the UUID suffix on a collision.
  EXECUTE format('INSERT INTO public.workspaces (%s) SELECT %s FROM jsonb_populate_record(NULL::public.workspaces, $1) AS incoming ON CONFLICT (slug) DO NOTHING RETURNING id',
    columns_sql, values_sql) INTO inserted_id USING payload;
  IF inserted_id IS NULL THEN
    payload := payload || jsonb_build_object('slug', slug_base || '-' || replace(submission_uuid::text, '-', ''));
    EXECUTE format('INSERT INTO public.workspaces (%s) SELECT %s FROM jsonb_populate_record(NULL::public.workspaces, $1) AS incoming',
      columns_sql, values_sql) USING payload;
  END IF;

  INSERT INTO public.workspace_photos (workspace_id, user_id, url, is_primary, is_approved)
  SELECT submission_uuid, actor, photo.url, photo.position = 1, false
  FROM unnest(photo_urls) WITH ORDINALITY AS photo(url, position)
  ORDER BY photo.position;

  RETURN submission_uuid;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submit_workspace_with_photos(uuid, text, text, jsonb, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_workspace_with_photos(uuid, text, text, jsonb, text[]) TO authenticated;

CREATE FUNCTION lumen_private.publish_workspace_city_proposal()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  city_name text := btrim(NEW.proposed_city_name);
  country_name text := btrim(NEW.proposed_city_country);
  city_key text := jsonb_build_array(lower(city_name), lower(country_name))::text;
  slug_base text;
  candidate text;
BEGIN
  IF NEW.status <> 'approved' OR city_name IS NULL THEN RETURN NEW; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501'; END IF;
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL OR NEW.latitude NOT BETWEEN -90 AND 90
    OR NEW.longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Select a valid map location before approving.' USING ERRCODE = '22023';
  END IF;
  IF NEW.city_id IS NULL THEN
    IF city_name = '' OR country_name IS NULL OR country_name = '' THEN
      RAISE EXCEPTION 'Enter the city and country before approving.' USING ERRCODE = '22023';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('workspace-city:' || city_key, 0));
    SELECT id INTO NEW.city_id FROM public.cities
    WHERE lower(btrim(name)) = lower(city_name) AND lower(btrim(country)) = lower(country_name)
    ORDER BY created_at, id LIMIT 1;
    IF NEW.city_id IS NULL THEN
      slug_base := coalesce(nullif(left(btrim(regexp_replace(lower(city_name || '-' || country_name), '[^a-z0-9]+', '-', 'g'), '-'), 215), ''), 'city');
      candidate := slug_base;
      LOOP
        INSERT INTO public.cities (name, country, slug, latitude, longitude)
        VALUES (city_name, country_name, candidate, NEW.latitude, NEW.longitude)
        ON CONFLICT (slug) DO NOTHING RETURNING id INTO NEW.city_id;
        EXIT WHEN NEW.city_id IS NOT NULL;
        SELECT id INTO NEW.city_id FROM public.cities
        WHERE slug = candidate AND lower(btrim(name)) = lower(city_name) AND lower(btrim(country)) = lower(country_name);
        EXIT WHEN NEW.city_id IS NOT NULL;
        candidate := slug_base || '-' || CASE WHEN candidate = slug_base
          THEN md5(city_key) ELSE replace(gen_random_uuid()::text, '-', '') END;
      END LOOP;
    END IF;
  END IF;
  NEW.proposed_city_name := NULL;
  NEW.proposed_city_country := NULL;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION lumen_private.publish_workspace_city_proposal() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER publish_workspace_city_proposal
BEFORE INSERT OR UPDATE OF status, city_id ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION lumen_private.publish_workspace_city_proposal();

-- Set reviewed city text in the same transaction as the existing atomic AI save.
CREATE FUNCTION public.save_workspace_ai_review_with_city_proposal(
  workspace_uuid uuid, enrichment_uuid uuid, patch jsonb, applied_paths text[], city_name text, country_name text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE resolved_city jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501'; END IF;
  UPDATE public.workspaces
  SET proposed_city_name = btrim(city_name), proposed_city_country = btrim(country_name)
  WHERE id = workspace_uuid AND proposed_city_name IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'City proposal is no longer available.' USING ERRCODE = '22023'; END IF;
  PERFORM public.save_workspace_ai_review(workspace_uuid, enrichment_uuid, patch, applied_paths);
  SELECT jsonb_build_object('id', c.id, 'slug', c.slug) INTO resolved_city
  FROM public.workspaces w LEFT JOIN public.cities c ON c.id = w.city_id
  WHERE w.id = workspace_uuid;
  RETURN resolved_city;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.save_workspace_ai_review_with_city_proposal(uuid, uuid, jsonb, text[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_workspace_ai_review_with_city_proposal(uuid, uuid, jsonb, text[], text, text) TO authenticated;

COMMIT;
