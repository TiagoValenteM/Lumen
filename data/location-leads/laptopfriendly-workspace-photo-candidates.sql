-- Lumen photo candidate inserts for imported LaptopFriendly leads.
-- Run after laptopfriendly-workspace-import.sql and laptopfriendly-workspace-location-fix.sql.
-- Photos are inserted as pending, not approved.
BEGIN;

INSERT INTO workspace_photos (workspace_id, url, caption, is_primary, is_approved)
SELECT id,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/New_York_Public_Library_-_Main_Branch_%2851553970198%29.jpg/1280px-New_York_Public_Library_-_Main_Branch_%2851553970198%29.jpg',
  'Photo from Wikimedia Commons. Verify license and attribution before approving.',
  NOT EXISTS (SELECT 1 FROM workspace_photos existing WHERE existing.workspace_id = workspaces.id AND existing.is_primary = true),
  false
FROM workspaces
WHERE slug = 'new-york-public-library-stephen-a-schwarzman-building-new-york'
  AND NOT EXISTS (
    SELECT 1
    FROM workspace_photos existing
    WHERE existing.workspace_id = workspaces.id
      AND existing.url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/New_York_Public_Library_-_Main_Branch_%2851553970198%29.jpg/1280px-New_York_Public_Library_-_Main_Branch_%2851553970198%29.jpg'
  );

COMMIT;
