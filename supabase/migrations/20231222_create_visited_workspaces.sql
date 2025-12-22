-- Create visited_workspaces table for users to mark workspaces they've been to
CREATE TABLE IF NOT EXISTS visited_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure a user can only mark a workspace as visited once
  UNIQUE(user_id, workspace_id)
);

-- Create index for faster lookups
CREATE INDEX idx_visited_workspaces_user_id ON visited_workspaces(user_id);
CREATE INDEX idx_visited_workspaces_workspace_id ON visited_workspaces(workspace_id);

-- Enable RLS
ALTER TABLE visited_workspaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own visited workspaces" ON visited_workspaces;
DROP POLICY IF EXISTS "Users can mark workspaces as visited" ON visited_workspaces;
DROP POLICY IF EXISTS "Users can unmark their own visited workspaces" ON visited_workspaces;

-- RLS Policies
-- Users can view their own visited workspaces
CREATE POLICY "Users can view their own visited workspaces"
  ON visited_workspaces
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark workspaces as visited
CREATE POLICY "Users can mark workspaces as visited"
  ON visited_workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unmark their own visited workspaces
CREATE POLICY "Users can unmark their own visited workspaces"
  ON visited_workspaces
  FOR DELETE
  USING (auth.uid() = user_id);
