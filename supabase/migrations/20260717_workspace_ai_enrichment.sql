CREATE TABLE IF NOT EXISTS workspace_ai_enrichments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'dismissed', 'applied')),
  provider TEXT NOT NULL DEFAULT 'openrouter',
  model TEXT NOT NULL,

  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggested_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_sources JSONB NOT NULL DEFAULT '{}'::jsonb,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_response JSONB,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_workspace_ai_enrichments_workspace
  ON workspace_ai_enrichments(workspace_id, created_at DESC);

DROP TRIGGER IF EXISTS update_workspace_ai_enrichments_updated_at ON workspace_ai_enrichments;
CREATE TRIGGER update_workspace_ai_enrichments_updated_at
  BEFORE UPDATE ON workspace_ai_enrichments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE workspace_ai_enrichments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Submitters can view enrichment for their workspaces" ON workspace_ai_enrichments;
CREATE POLICY "Submitters can view enrichment for their workspaces"
  ON workspace_ai_enrichments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspaces
      WHERE workspaces.id = workspace_ai_enrichments.workspace_id
        AND workspaces.submitted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Submitters can create enrichment for their pending workspaces" ON workspace_ai_enrichments;
CREATE POLICY "Submitters can create enrichment for their pending workspaces"
  ON workspace_ai_enrichments
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM workspaces
      WHERE workspaces.id = workspace_ai_enrichments.workspace_id
        AND workspaces.submitted_by = auth.uid()
        AND workspaces.status IN ('pending', 'under_review')
    )
  );

DROP POLICY IF EXISTS "Submitters can update enrichment for their pending workspaces" ON workspace_ai_enrichments;
CREATE POLICY "Submitters can update enrichment for their pending workspaces"
  ON workspace_ai_enrichments
  FOR UPDATE
  USING (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM workspaces
      WHERE workspaces.id = workspace_ai_enrichments.workspace_id
        AND workspaces.submitted_by = auth.uid()
        AND workspaces.status IN ('pending', 'under_review')
    )
  )
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM workspaces
      WHERE workspaces.id = workspace_ai_enrichments.workspace_id
        AND workspaces.submitted_by = auth.uid()
        AND workspaces.status IN ('pending', 'under_review')
    )
  );

DROP POLICY IF EXISTS "Admins can manage all workspace enrichment" ON workspace_ai_enrichments;
CREATE POLICY "Admins can manage all workspace enrichment"
  ON workspace_ai_enrichments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );
