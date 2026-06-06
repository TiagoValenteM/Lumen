-- Admin-only deletion helpers for workspace moderation.

CREATE OR REPLACE FUNCTION public.delete_workspace_photo(photo_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  DELETE FROM workspace_photos
  WHERE id = photo_uuid;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_workspace(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_city_uuid UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT city_id
  INTO deleted_city_uuid
  FROM workspaces
  WHERE id = workspace_uuid;

  DELETE FROM workspaces
  WHERE id = workspace_uuid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF deleted_city_uuid IS NOT NULL THEN
    PERFORM public.delete_city_if_empty(deleted_city_uuid);
  END IF;

  RETURN true;
END;
$$;
