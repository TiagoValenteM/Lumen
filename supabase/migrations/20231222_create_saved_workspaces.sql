-- Create saved_workspaces table for users to save/bookmark workspaces
CREATE TABLE IF NOT EXISTS saved_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure a user can only save a workspace once
  UNIQUE(user_id, workspace_id)
);

-- Create index for faster lookups
CREATE INDEX idx_saved_workspaces_user_id ON saved_workspaces(user_id);
CREATE INDEX idx_saved_workspaces_workspace_id ON saved_workspaces(workspace_id);

-- Enable RLS
ALTER TABLE saved_workspaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own saved workspaces" ON saved_workspaces;
DROP POLICY IF EXISTS "Users can save workspaces" ON saved_workspaces;
DROP POLICY IF EXISTS "Users can unsave their own workspaces" ON saved_workspaces;

-- RLS Policies
-- Users can view their own saved workspaces
CREATE POLICY "Users can view their own saved workspaces"
  ON saved_workspaces
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save workspaces
CREATE POLICY "Users can save workspaces"
  ON saved_workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave their own workspaces
CREATE POLICY "Users can unsave their own workspaces"
  ON saved_workspaces
  FOR DELETE
  USING (auth.uid() = user_id);
