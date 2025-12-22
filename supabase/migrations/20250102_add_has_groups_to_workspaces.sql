-- Add has_groups flag for group-friendly spaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS good_for_groups BOOLEAN NOT NULL DEFAULT false;

-- Optional backfill: mark group-friendly where meetings are marked good
UPDATE workspaces
SET good_for_groups = true
WHERE good_for_meetings = true;
