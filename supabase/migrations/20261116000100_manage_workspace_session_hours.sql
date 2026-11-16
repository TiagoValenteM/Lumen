BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.workspace_session_hours (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  draft jsonb,
  published jsonb,
  checked_at timestamptz,
  checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revision integer NOT NULL DEFAULT 1,
  CHECK ((published IS NULL) = (checked_at IS NULL))
);

ALTER TABLE public.workspace_session_hours ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_session_hours FROM PUBLIC, anon, authenticated;
GRANT SELECT (workspace_id, published, checked_at) ON public.workspace_session_hours TO anon, authenticated;
CREATE POLICY "Read current hours for published places" ON public.workspace_session_hours
  FOR SELECT TO anon, authenticated USING (
    checked_at >= now() - interval '720 hours' AND checked_at <= now()
    AND least(published->'opening'->>'exceptionsCheckedThrough', published->'laptopAccess'->>'exceptionsCheckedThrough')::date
      >= (now() AT TIME ZONE (published->>'timeZone'))::date
    AND EXISTS (SELECT FROM public.workspaces w WHERE w.id = workspace_id AND w.status = 'approved')
  );

CREATE FUNCTION lumen_private.valid_session_windows(windows jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE window_value jsonb; from_min numeric; to_min numeric; previous_end numeric := -1;
BEGIN
  IF jsonb_typeof(windows) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(windows) > 8 THEN RETURN false; END IF;
  FOR window_value IN SELECT value FROM jsonb_array_elements(windows) LOOP
    IF jsonb_typeof(window_value) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(window_value) <> 2 OR jsonb_typeof(window_value->0) <> 'number'
      OR jsonb_typeof(window_value->1) <> 'number' THEN RETURN false; END IF;
    from_min := (window_value->>0)::numeric;
    to_min := (window_value->>1)::numeric;
    IF trunc(from_min) <> from_min OR trunc(to_min) <> to_min OR from_min < 0 OR to_min > 1440
      OR from_min >= to_min OR from_min < previous_end THEN RETURN false; END IF;
    previous_end := to_min;
  END LOOP;
  RETURN true;
END;
$$;

CREATE FUNCTION lumen_private.valid_session_policy(policy jsonb, local_today date, laptop boolean, verified boolean)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE entry record; through_date date; source_key text; stay numeric;
BEGIN
  IF jsonb_typeof(policy) IS DISTINCT FROM 'object' OR
    policy - ARRAY['source','coverageSource','exceptionsCheckedThrough','weekly','exceptions','maxSessionMinutes'] <> '{}'::jsonb
    OR jsonb_typeof(policy->'weekly') IS DISTINCT FROM 'object'
    OR jsonb_typeof(policy->'exceptions') IS DISTINCT FROM 'object'
    OR jsonb_typeof(policy->'exceptionsCheckedThrough') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  FOREACH source_key IN ARRAY ARRAY['source','coverageSource'] LOOP
    IF jsonb_typeof(policy->source_key) IS DISTINCT FROM 'string'
      OR ((verified OR policy->>source_key <> '') AND (policy->>source_key) !~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$')
      OR length(policy->>source_key) > 500 THEN RETURN false; END IF;
  END LOOP;
  IF verified OR policy->>'exceptionsCheckedThrough' <> '' THEN
    IF policy->>'exceptionsCheckedThrough' !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' THEN RETURN false; END IF;
    through_date := (policy->>'exceptionsCheckedThrough')::date;
    IF verified AND (through_date < local_today OR through_date > local_today + 60) THEN RETURN false; END IF;
  END IF;
  IF (SELECT count(*) FROM jsonb_each(policy->'exceptions')) > 60
    OR (verified AND policy->'weekly' = '{}'::jsonb AND policy->'exceptions' = '{}'::jsonb) THEN RETURN false; END IF;
  FOR entry IN SELECT * FROM jsonb_each(policy->'weekly') LOOP
    IF entry.key NOT IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')
      OR NOT lumen_private.valid_session_windows(entry.value) THEN RETURN false; END IF;
  END LOOP;
  FOR entry IN SELECT * FROM jsonb_each(policy->'exceptions') LOOP
    IF entry.key !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      OR (verified AND entry.key::date > through_date) OR NOT lumen_private.valid_session_windows(entry.value) THEN RETURN false; END IF;
    PERFORM entry.key::date;
  END LOOP;
  IF policy ? 'maxSessionMinutes' THEN
    IF NOT laptop OR jsonb_typeof(policy->'maxSessionMinutes') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
    stay := (policy->>'maxSessionMinutes')::numeric;
    IF stay < 1 OR stay > 1440 OR trunc(stay) <> stay THEN RETURN false; END IF;
  END IF;
  RETURN true;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation THEN RETURN false;
END;
$$;

CREATE FUNCTION public.read_workspace_session_hours(workspace_uuid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_value public.workspace_session_hours;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Moderator access required.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO row_value FROM public.workspace_session_hours WHERE workspace_id = workspace_uuid;
  RETURN jsonb_build_object('draft', row_value.draft, 'published', row_value.published,
    'checked_at', row_value.checked_at, 'revision', row_value.revision);
END;
$$;

CREATE FUNCTION public.update_workspace_session_hours(
  workspace_uuid uuid, expected_revision integer, expected_place jsonb, action text, schedule jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target public.workspaces; current_row public.workspace_session_hours; local_today date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Moderator access required.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO target FROM public.workspaces WHERE id = workspace_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Place not found.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO current_row FROM public.workspace_session_hours WHERE workspace_id = workspace_uuid;
  IF current_row.revision IS DISTINCT FROM expected_revision THEN
    RAISE EXCEPTION 'The hours changed. Reload before saving.' USING ERRCODE = '40001';
  END IF;

  IF action = 'withdraw' THEN
    UPDATE public.workspace_session_hours SET published = NULL, checked_at = NULL, checked_by = NULL,
      revision = revision + 1 WHERE workspace_id = workspace_uuid;
  ELSIF action IN ('draft', 'verify') THEN
    IF expected_place IS DISTINCT FROM jsonb_build_object('name', target.name, 'address', target.address,
      'cityId', target.city_id, 'latitude', target.latitude, 'longitude', target.longitude) THEN
      RAISE EXCEPTION 'The saved location changed. Reload before saving hours.' USING ERRCODE = '40001';
    END IF;
    IF jsonb_typeof(schedule) IS DISTINCT FROM 'object' OR octet_length(schedule::text) > 30000 THEN
      RAISE EXCEPTION 'Invalid or oversized schedule.' USING ERRCODE = '22023';
    END IF;
    IF schedule - ARRAY['timeZone','opening','laptopAccess','note'] <> '{}'::jsonb
      OR jsonb_typeof(schedule->'note') IS DISTINCT FROM 'string' OR length(schedule->>'note') > 240
      OR jsonb_typeof(schedule->'timeZone') IS DISTINCT FROM 'string'
      OR ((action = 'verify' OR schedule->>'timeZone' <> '') AND
        NOT EXISTS (SELECT FROM pg_timezone_names WHERE name = schedule->>'timeZone' AND (name LIKE '%/%' OR name = 'UTC'))) THEN
      RAISE EXCEPTION 'Use a valid venue timezone and a short public note.' USING ERRCODE = '22023';
    END IF;
    IF action = 'verify' THEN
      IF target.status IS DISTINCT FROM 'approved' OR target.latitude IS NULL OR target.longitude IS NULL THEN
        RAISE EXCEPTION 'Publish the place with a verified location first.' USING ERRCODE = '22023';
      END IF;
      local_today := (now() AT TIME ZONE (schedule->>'timeZone'))::date;
    END IF;
    IF NOT lumen_private.valid_session_policy(schedule->'opening', local_today, false, action = 'verify')
      OR NOT lumen_private.valid_session_policy(schedule->'laptopAccess', local_today, true, action = 'verify') THEN
      RAISE EXCEPTION 'Check both schedules, their sources and their date coverage.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.workspace_session_hours (workspace_id, draft, published, checked_at, checked_by)
    VALUES (workspace_uuid, schedule, CASE WHEN action = 'verify' THEN schedule END,
      CASE WHEN action = 'verify' THEN now() END, CASE WHEN action = 'verify' THEN auth.uid() END)
    ON CONFLICT (workspace_id) DO UPDATE SET
      draft = EXCLUDED.draft,
      published = CASE WHEN action = 'verify' THEN EXCLUDED.published ELSE current_row.published END,
      checked_at = CASE WHEN action = 'verify' THEN EXCLUDED.checked_at ELSE current_row.checked_at END,
      checked_by = CASE WHEN action = 'verify' THEN EXCLUDED.checked_by ELSE current_row.checked_by END,
      revision = current_row.revision + 1;
  ELSE
    RAISE EXCEPTION 'Invalid schedule action.' USING ERRCODE = '22023';
  END IF;
  RETURN public.read_workspace_session_hours(workspace_uuid);
END;
$$;

CREATE FUNCTION lumen_private.invalidate_workspace_session_hours()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.workspace_session_hours SET published = NULL, checked_at = NULL, checked_by = NULL,
    revision = revision + 1 WHERE workspace_id = NEW.id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invalidate_workspace_session_hours
AFTER UPDATE ON public.workspaces FOR EACH ROW
WHEN (ROW(OLD.name, OLD.address, OLD.city_id, OLD.latitude, OLD.longitude, OLD.status, OLD.laptop_friendly, OLD.time_limit_hours)
  IS DISTINCT FROM ROW(NEW.name, NEW.address, NEW.city_id, NEW.latitude, NEW.longitude, NEW.status, NEW.laptop_friendly, NEW.time_limit_hours))
EXECUTE FUNCTION lumen_private.invalidate_workspace_session_hours();

REVOKE ALL ON FUNCTION lumen_private.valid_session_windows(jsonb), lumen_private.valid_session_policy(jsonb,date,boolean,boolean),
  lumen_private.invalidate_workspace_session_hours(),
  public.read_workspace_session_hours(uuid), public.update_workspace_session_hours(uuid,integer,jsonb,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_workspace_session_hours(uuid),
  public.update_workspace_session_hours(uuid,integer,jsonb,text,jsonb) TO authenticated;

-- Transfer the previously published pilot, without refreshing its evidence timestamp.
WITH policy AS (
  SELECT '{"source":"https://fictionbk.com/about","coverageSource":"https://fictionbk.com/events",
    "exceptionsCheckedThrough":"2026-11-22","weekly":{"Mon":[[0,120],[420,1440]],"Tue":[[0,120],[420,1440]],
    "Wed":[[0,120],[420,1440]],"Thu":[[0,120],[420,1440]],"Fri":[[0,120],[420,1440]],
    "Sat":[[0,120],[480,1440]],"Sun":[[0,120],[480,1440]]},"exceptions":{}}'::jsonb AS data
), evidence AS (
  SELECT jsonb_build_object('timeZone','America/New_York','opening',data,
    'laptopAccess',data || '{"maxSessionMinutes":120}'::jsonb,
    'note','Two-hour table limit and two-drink minimum.') AS data FROM policy
)
INSERT INTO public.workspace_session_hours (workspace_id, draft, published, checked_at)
SELECT w.id, evidence.data, evidence.data, '2026-11-16T21:00:00Z'
FROM public.workspaces w CROSS JOIN evidence
WHERE w.id = '54f3915e-e27b-4927-94c8-afeaaa023956' AND w.slug = 'fiction-bar-cafe-new-york'
  AND w.address = '308 Hooper Street, Brooklyn, New York, New York, 11211' AND w.status = 'approved';

-- Official partial evidence only. It must not be visible in the public finder.
WITH sources(id, slug, address, hours_source, weekdays, weekends, laptop_source) AS (
  VALUES
    ('75e7b8c7-b106-4bc7-879e-aa2ac8067c17'::uuid, 'passionfruit-coffee-new-york',
     '733 Madison Street, Brooklyn, New York, New York, 11221', 'https://www.passionfruitcoffee.com/contact',
     '[[480,1020]]'::jsonb, '[[480,1020]]'::jsonb, ''),
    ('f445f2fa-aeac-49df-989f-1bad7a0ba6eb'::uuid, 'city-league-coffee-roasters-new-york',
     '6808 4th Avenue, Brooklyn, New York, New York, 11220', 'https://cityleaguecoffee.com/contact/',
     '[[420,1020]]'::jsonb, '[[480,960]]'::jsonb, 'https://cityleaguecoffee.com/bay-ridge-coffee-shop/'),
    ('1a1e558e-c028-40d4-9241-818842f6a998'::uuid, 'new-york-public-library-stephen-a-schwarzman-building-new-york',
     '476 5th Avenue, Manhattan, New York, New York, 10018', '',
     NULL, NULL, 'https://libguides.nypl.org/dorot/planningavisit')
), policy AS (
  SELECT '{"coverageSource":"","exceptionsCheckedThrough":"","weekly":{},"exceptions":{}}'::jsonb AS blank
)
INSERT INTO public.workspace_session_hours (workspace_id, draft)
SELECT w.id, jsonb_build_object('timeZone','America/New_York','note','',
  'opening', blank || jsonb_build_object('source', hours_source) ||
    CASE WHEN weekdays IS NOT NULL THEN jsonb_build_object('weekly', jsonb_build_object(
      'Mon',weekdays,'Tue',weekdays,'Wed',weekdays,'Thu',weekdays,'Fri',weekdays,'Sat',weekends,'Sun',weekends))
    ELSE '{}'::jsonb END,
  'laptopAccess', blank || jsonb_build_object('source', laptop_source))
FROM sources JOIN public.workspaces w ON w.id = sources.id AND w.slug = sources.slug AND w.address = sources.address
CROSS JOIN policy WHERE w.status = 'approved';

COMMIT;
