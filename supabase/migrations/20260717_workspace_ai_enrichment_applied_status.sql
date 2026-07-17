ALTER TABLE workspace_ai_enrichments
  DROP CONSTRAINT IF EXISTS workspace_ai_enrichments_status_check;

ALTER TABLE workspace_ai_enrichments
  ADD CONSTRAINT workspace_ai_enrichments_status_check
  CHECK (status IN ('pending', 'completed', 'failed', 'dismissed', 'applied'));
