BEGIN;

ALTER TABLE public.workspaces
  ALTER COLUMN has_wifi DROP DEFAULT,
  ALTER COLUMN has_power_outlets DROP DEFAULT,
  ALTER COLUMN laptop_friendly DROP DEFAULT;

CREATE TABLE public.workspace_work_fact_checks (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.workspace_work_fact_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_work_fact_checks FROM PUBLIC, anon, authenticated;
GRANT SELECT (workspace_id, checked_at) ON public.workspace_work_fact_checks TO anon, authenticated;
CREATE POLICY "Published workspace checks are public" ON public.workspace_work_fact_checks
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.status = 'approved'
  ));

CREATE FUNCTION public.check_workspace_work_facts(workspace_uuid uuid, expected_snapshot jsonb)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  target public.workspaces;
  checked_time timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Moderator access required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target FROM public.workspaces WHERE id = workspace_uuid FOR UPDATE;
  IF NOT FOUND OR target.status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Publish the place before recording a work-fact check.' USING ERRCODE = '22023';
  END IF;
  IF target.has_wifi IS NULL AND target.has_power_outlets IS NULL
    AND target.laptop_friendly IS NULL AND target.time_limit_hours IS NULL THEN
    RAISE EXCEPTION 'Add at least one known work fact before recording a check.' USING ERRCODE = '22023';
  END IF;
  IF (expected_snapshot || jsonb_build_object(
    'latitude', round((expected_snapshot ->> 'latitude')::numeric, 8),
    'longitude', round((expected_snapshot ->> 'longitude')::numeric, 8)
  )) IS DISTINCT FROM jsonb_build_object(
    'has_wifi', target.has_wifi, 'has_power_outlets', target.has_power_outlets,
    'laptop_friendly', target.laptop_friendly, 'time_limit_hours', target.time_limit_hours,
    'name', target.name, 'address', target.address, 'latitude', target.latitude,
    'longitude', target.longitude, 'city_id', target.city_id
  ) THEN
    RAISE EXCEPTION 'Saved work facts changed. Reload before recording a check.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.workspace_work_fact_checks (workspace_id, checked_by)
  VALUES (workspace_uuid, auth.uid())
  ON CONFLICT (workspace_id) DO UPDATE SET checked_at = now(), checked_by = EXCLUDED.checked_by
  RETURNING checked_at INTO checked_time;
  RETURN checked_time;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.check_workspace_work_facts(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_workspace_work_facts(uuid, jsonb) TO authenticated;

CREATE FUNCTION lumen_private.invalidate_workspace_work_fact_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.workspace_work_fact_checks WHERE workspace_id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION lumen_private.invalidate_workspace_work_fact_check() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER invalidate_workspace_work_fact_check
AFTER UPDATE ON public.workspaces FOR EACH ROW
WHEN (
  ROW(OLD.name, OLD.city_id, OLD.address, OLD.latitude, OLD.longitude, OLD.status,
    OLD.has_wifi, OLD.has_power_outlets, OLD.laptop_friendly, OLD.time_limit_hours)
  IS DISTINCT FROM
  ROW(NEW.name, NEW.city_id, NEW.address, NEW.latitude, NEW.longitude, NEW.status,
    NEW.has_wifi, NEW.has_power_outlets, NEW.laptop_friendly, NEW.time_limit_hours)
)
EXECUTE FUNCTION lumen_private.invalidate_workspace_work_fact_check();

COMMIT;
