-- Repair edit suggestions for databases that missed part of the moderation migration.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS reported_change_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS workspace_edit_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('wrong_location', 'closed_place', 'incorrect_amenities', 'bad_photo', 'duplicate', 'other')),
  field TEXT NOT NULL DEFAULT 'other',
  current_value TEXT NOT NULL DEFAULT '',
  proposed_value TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE workspace_edit_suggestions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind TEXT,
  ADD COLUMN IF NOT EXISTS field TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS current_value TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_value TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE workspace_edit_suggestions
SET kind = COALESCE(kind, 'other')
WHERE kind IS NULL;

UPDATE workspace_edit_suggestions
SET field = COALESCE(field, kind, 'other')
WHERE field IS NULL;

UPDATE workspace_edit_suggestions
SET current_value = COALESCE(current_value, '')
WHERE current_value IS NULL;

UPDATE workspace_edit_suggestions
SET proposed_value = COALESCE(proposed_value, message, admin_notes, '')
WHERE proposed_value IS NULL;

UPDATE workspace_edit_suggestions
SET message = COALESCE(message, admin_notes, 'Imported legacy edit suggestion.')
WHERE message IS NULL;

UPDATE workspace_edit_suggestions
SET status = COALESCE(status, 'open')
WHERE status IS NULL;

ALTER TABLE workspace_edit_suggestions
  ALTER COLUMN kind SET NOT NULL,
  ALTER COLUMN field SET DEFAULT 'other',
  ALTER COLUMN field SET NOT NULL,
  ALTER COLUMN current_value SET DEFAULT '',
  ALTER COLUMN current_value SET NOT NULL,
  ALTER COLUMN proposed_value SET DEFAULT '',
  ALTER COLUMN proposed_value SET NOT NULL,
  ALTER COLUMN message SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'open',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE workspace_edit_suggestions
  DROP CONSTRAINT IF EXISTS workspace_edit_suggestions_kind_check,
  DROP CONSTRAINT IF EXISTS workspace_edit_suggestions_status_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_edit_suggestions_kind_check'
  ) THEN
    ALTER TABLE workspace_edit_suggestions
      ADD CONSTRAINT workspace_edit_suggestions_kind_check
      CHECK (kind IN ('wrong_location', 'closed_place', 'incorrect_amenities', 'bad_photo', 'duplicate', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_edit_suggestions_status_check'
  ) THEN
    ALTER TABLE workspace_edit_suggestions
      ADD CONSTRAINT workspace_edit_suggestions_status_check
      CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_workspace_edit_suggestions_workspace
  ON workspace_edit_suggestions(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_edit_suggestions_status
  ON workspace_edit_suggestions(status);

ALTER TABLE workspace_edit_suggestions ENABLE ROW LEVEL SECURITY;

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
  next_report_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF suggestion_kind NOT IN ('wrong_location', 'closed_place', 'incorrect_amenities', 'bad_photo', 'duplicate', 'other') THEN
    RAISE EXCEPTION 'Invalid suggestion kind';
  END IF;

  INSERT INTO workspace_edit_suggestions (workspace_id, user_id, kind, field, current_value, proposed_value, message, status)
  VALUES (workspace_uuid, auth.uid(), suggestion_kind, suggestion_kind, '', suggestion_message, suggestion_message, 'open')
  RETURNING id INTO suggestion_uuid;

  UPDATE workspaces
  SET reported_change_count = COALESCE(reported_change_count, 0) + 1
  WHERE id = workspace_uuid
  RETURNING reported_change_count INTO next_report_count;

  RETURN jsonb_build_object(
    'suggestion_id', suggestion_uuid,
    'reported_change_count', COALESCE(next_report_count, 0)
  );
END;
$$;

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

NOTIFY pgrst, 'reload schema';
