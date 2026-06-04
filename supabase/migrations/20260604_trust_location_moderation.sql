-- Strengthen moderation, approved workspace counts, review uniqueness, and location metadata.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_source TEXT,
  ADD COLUMN IF NOT EXISTS location_provider TEXT,
  ADD COLUMN IF NOT EXISTS location_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS location_confidence NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS location_raw JSONB,
  ADD COLUMN IF NOT EXISTS reported_change_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE workspace_photos
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS workspace_edit_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('wrong_location', 'closed_place', 'incorrect_amenities', 'bad_photo', 'duplicate', 'other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workspace_edit_suggestions_workspace
  ON workspace_edit_suggestions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_edit_suggestions_status
  ON workspace_edit_suggestions(status);

ALTER TABLE workspace_edit_suggestions ENABLE ROW LEVEL SECURITY;

DELETE FROM reviews r
USING reviews newer
WHERE r.workspace_id = newer.workspace_id
  AND r.user_id = newer.user_id
  AND (
    r.created_at < newer.created_at
    OR (r.created_at = newer.created_at AND r.id < newer.id)
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_workspace_user_unique'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_workspace_user_unique UNIQUE (workspace_id, user_id);
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION update_city_workspace_count()
RETURNS TRIGGER AS $$
DECLARE
  old_is_approved BOOLEAN;
  new_is_approved BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' AND NEW.city_id IS NOT NULL THEN
      UPDATE cities
      SET workspace_count = workspace_count + 1
      WHERE id = NEW.city_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'approved' AND OLD.city_id IS NOT NULL THEN
      UPDATE cities
      SET workspace_count = GREATEST(workspace_count - 1, 0)
      WHERE id = OLD.city_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_is_approved := OLD.status = 'approved';
    new_is_approved := NEW.status = 'approved';

    IF old_is_approved AND (NOT new_is_approved OR OLD.city_id IS DISTINCT FROM NEW.city_id) AND OLD.city_id IS NOT NULL THEN
      UPDATE cities
      SET workspace_count = GREATEST(workspace_count - 1, 0)
      WHERE id = OLD.city_id;
    END IF;

    IF new_is_approved AND (NOT old_is_approved OR OLD.city_id IS DISTINCT FROM NEW.city_id) AND NEW.city_id IS NOT NULL THEN
      UPDATE cities
      SET workspace_count = workspace_count + 1
      WHERE id = NEW.city_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

UPDATE cities c
SET workspace_count = (
  SELECT COUNT(*)
  FROM workspaces w
  WHERE w.city_id = c.id
    AND w.status = 'approved'
);

DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON workspaces;
CREATE POLICY "Authenticated users can create pending workspaces"
  ON workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Admins can update workspaces" ON workspaces;
CREATE POLICY "Admins can update workspaces"
  ON workspaces
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all workspaces" ON workspaces;
CREATE POLICY "Admins can view all workspaces"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can create cities" ON cities;
CREATE POLICY "Admins can create cities"
  ON cities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update cities" ON cities;
CREATE POLICY "Admins can update cities"
  ON cities
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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
    AND featured = false;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_city(source_city_uuid UUID, target_city_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_city_uuid UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT id
  INTO target_city_uuid
  FROM cities
  WHERE slug = target_city_slug
  LIMIT 1;

  IF target_city_uuid IS NULL THEN
    RAISE EXCEPTION 'Target city not found';
  END IF;

  IF source_city_uuid = target_city_uuid THEN
    RETURN false;
  END IF;

  UPDATE workspaces
  SET city_id = target_city_uuid
  WHERE city_id = source_city_uuid;

  PERFORM public.delete_city_if_empty(source_city_uuid);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_workspace_edit_suggestion(
  workspace_uuid UUID,
  suggestion_kind TEXT,
  suggestion_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  suggestion_uuid UUID;
  next_report_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF suggestion_kind NOT IN ('wrong_location', 'closed_place', 'incorrect_amenities', 'bad_photo', 'duplicate', 'other') THEN
    RAISE EXCEPTION 'Invalid suggestion kind';
  END IF;

  INSERT INTO workspace_edit_suggestions (workspace_id, user_id, kind, message)
  VALUES (workspace_uuid, auth.uid(), suggestion_kind, suggestion_message)
  RETURNING id INTO suggestion_uuid;

  UPDATE workspaces
  SET reported_change_count = COALESCE(reported_change_count, 0) + 1
  WHERE id = workspace_uuid
  RETURNING reported_change_count INTO next_report_count;

  RETURN jsonb_build_object(
    'suggestion_id', suggestion_uuid,
    'reported_change_count', next_report_count
  );
END;
$$;

DROP POLICY IF EXISTS "Users can view own photos" ON workspace_photos;
CREATE POLICY "Users can view own photos"
  ON workspace_photos
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all photos" ON workspace_photos;
CREATE POLICY "Admins can view all photos"
  ON workspace_photos
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update photos" ON workspace_photos;
CREATE POLICY "Admins can update photos"
  ON workspace_photos
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can create edit suggestions" ON workspace_edit_suggestions;
CREATE POLICY "Users can create edit suggestions"
  ON workspace_edit_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can view own edit suggestions" ON workspace_edit_suggestions;
CREATE POLICY "Users can view own edit suggestions"
  ON workspace_edit_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all edit suggestions" ON workspace_edit_suggestions;
CREATE POLICY "Admins can view all edit suggestions"
  ON workspace_edit_suggestions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update edit suggestions" ON workspace_edit_suggestions;
CREATE POLICY "Admins can update edit suggestions"
  ON workspace_edit_suggestions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
