ALTER TABLE workspace_ai_enrichments
  ADD COLUMN IF NOT EXISTS run_mode TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS field_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unknown_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS field_decisions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS run_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE workspace_ai_enrichments
  DROP CONSTRAINT IF EXISTS workspace_ai_enrichments_status_check;

ALTER TABLE workspace_ai_enrichments
  ADD CONSTRAINT workspace_ai_enrichments_status_check
  CHECK (
    status IN (
      'queued',
      'researching',
      'extracting',
      'ready_for_review',
      'pending',
      'completed',
      'failed',
      'dismissed',
      'applied'
    )
  );

ALTER TABLE workspace_ai_enrichments
  DROP CONSTRAINT IF EXISTS workspace_ai_enrichments_run_mode_check;

ALTER TABLE workspace_ai_enrichments
  ADD CONSTRAINT workspace_ai_enrichments_run_mode_check
  CHECK (run_mode IN ('full', 'no_web', 'text_only', 'details_only'));

UPDATE workspace_ai_enrichments
SET
  field_evidence = COALESCE(NULLIF(field_evidence, '{}'::jsonb), suggested_fields -> '_field_evidence', '{}'::jsonb),
  unknown_fields = COALESCE(NULLIF(unknown_fields, '[]'::jsonb), suggested_fields -> '_unknown_fields', '[]'::jsonb),
  run_mode = COALESCE(NULLIF(run_mode, ''), 'full'),
  field_decisions = COALESCE(field_decisions, '{}'::jsonb),
  run_metadata = COALESCE(run_metadata, '{}'::jsonb);

CREATE INDEX IF NOT EXISTS workspace_ai_enrichments_workspace_created_idx
  ON workspace_ai_enrichments (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS workspace_ai_enrichments_status_created_idx
  ON workspace_ai_enrichments (status, created_at DESC);
