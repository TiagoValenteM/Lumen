CREATE OR REPLACE FUNCTION public.delete_city_if_empty(city_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_workspaces BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM workspaces
    WHERE city_id = city_uuid
  )
  INTO has_workspaces;

  IF has_workspaces THEN
    RETURN false;
  END IF;

  DELETE FROM cities
  WHERE id = city_uuid
    AND COALESCE(featured, false) = false;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_city_if_empty(UUID) TO authenticated;

DROP POLICY IF EXISTS "Admins can delete empty cities" ON cities;
CREATE POLICY "Admins can delete empty cities"
  ON cities
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    AND COALESCE(featured, false) = false
    AND NOT EXISTS (
      SELECT 1
      FROM workspaces
      WHERE workspaces.city_id = cities.id
    )
  );
