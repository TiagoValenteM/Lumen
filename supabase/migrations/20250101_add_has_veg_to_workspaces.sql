-- Add has_veg flag for vegetarian/vegan options
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS has_veg BOOLEAN NOT NULL DEFAULT false;

-- Optional backfill: mark veg where food is already true
UPDATE workspaces
SET has_veg = true
WHERE has_food = true;
