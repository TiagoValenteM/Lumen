BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE primary_city uuid; old_city uuid;
BEGIN
  SELECT id INTO primary_city FROM public.cities WHERE slug = 'lisbon' AND lower(btrim(country)) = 'portugal' FOR UPDATE;
  SELECT id INTO old_city FROM public.cities WHERE slug = 'lisboa-portugal' AND lower(btrim(country)) = 'portugal' FOR UPDATE;
  IF old_city IS NOT NULL AND primary_city IS NULL THEN
    UPDATE public.cities SET name = 'Lisboa', slug = 'lisbon', country_code = 'PT' WHERE id = old_city;
  ELSIF primary_city IS NOT NULL THEN
    IF old_city IS NOT NULL THEN
      -- A translation of the same city does not invalidate place-level evidence.
      CREATE TEMP TABLE lisbon_hours_before_merge ON COMMIT DROP AS
        SELECT h.* FROM public.workspace_session_hours h JOIN public.workspaces w ON w.id = h.workspace_id WHERE w.city_id = old_city;
      CREATE TEMP TABLE lisbon_facts_before_merge ON COMMIT DROP AS
        SELECT f.* FROM public.workspace_work_fact_checks f JOIN public.workspaces w ON w.id = f.workspace_id WHERE w.city_id = old_city;
      UPDATE public.workspaces SET city_id = primary_city WHERE city_id = old_city;
      UPDATE public.profiles SET city_id = primary_city WHERE city_id = old_city;
      UPDATE public.workspace_session_hours h SET published = saved.published, checked_at = saved.checked_at, checked_by = saved.checked_by
        FROM lisbon_hours_before_merge saved WHERE h.workspace_id = saved.workspace_id;
      INSERT INTO public.workspace_work_fact_checks (workspace_id, checked_at, checked_by)
        SELECT workspace_id, checked_at, checked_by FROM lisbon_facts_before_merge;
      IF EXISTS (SELECT FROM public.workspaces WHERE city_id = old_city)
        OR EXISTS (SELECT FROM public.profiles WHERE city_id = old_city) THEN
        RAISE EXCEPTION 'Refusing to remove a city that is still referenced.';
      END IF;
      UPDATE public.cities c SET featured = coalesce(c.featured,false) OR coalesce(legacy.featured,false),
        description = coalesce(c.description,legacy.description), image_url = coalesce(c.image_url,legacy.image_url),
        timezone = coalesce(c.timezone,legacy.timezone)
        FROM public.cities legacy WHERE c.id = primary_city AND legacy.id = old_city;
      DELETE FROM public.cities WHERE id = old_city;
    END IF;
    UPDATE public.cities SET name = 'Lisboa', country_code = 'PT',
      workspace_count = (SELECT count(*) FROM public.workspaces WHERE city_id = primary_city AND status = 'approved')
      WHERE id = primary_city;
  END IF;
END $$;

-- Enforce the canonical spelling and slug even for older clients.
CREATE FUNCTION lumen_private.normalize_lisbon_city()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF lower(btrim(NEW.country)) = 'portugal' AND lower(btrim(NEW.name)) IN ('lisboa','lisbon') THEN
    NEW.name := 'Lisboa';
    NEW.country := 'Portugal';
    NEW.country_code := 'PT';
    NEW.slug := 'lisbon';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER normalize_lisbon_city BEFORE INSERT OR UPDATE OF name,country,slug ON public.cities
  FOR EACH ROW EXECUTE FUNCTION lumen_private.normalize_lisbon_city();

CREATE FUNCTION lumen_private.resolve_lisbon_proposal()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF lower(btrim(NEW.proposed_city_country)) = 'portugal'
     AND lower(btrim(NEW.proposed_city_name)) IN ('lisboa','lisbon') THEN
    NEW.proposed_city_name := 'Lisboa';
    NEW.proposed_city_country := 'Portugal';
    IF NEW.status <> 'approved' AND NEW.city_id IS NULL THEN
      SELECT id INTO NEW.city_id FROM public.cities WHERE slug = 'lisbon' AND name = 'Lisboa' AND country = 'Portugal';
      IF NEW.city_id IS NOT NULL THEN
        NEW.proposed_city_name := NULL;
        NEW.proposed_city_country := NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER canonical_lisbon_proposal BEFORE INSERT OR UPDATE OF status,city_id,proposed_city_name,proposed_city_country ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION lumen_private.resolve_lisbon_proposal();
REVOKE EXECUTE ON FUNCTION lumen_private.normalize_lisbon_city(), lumen_private.resolve_lisbon_proposal() FROM PUBLIC, anon, authenticated;

UPDATE public.workspaces SET proposed_city_name = 'Lisboa'
WHERE lower(btrim(proposed_city_country)) = 'portugal' AND lower(btrim(proposed_city_name)) IN ('lisboa','lisbon');
COMMIT;
