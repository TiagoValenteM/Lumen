-- Helper view for workspace cards (includes primary photo)
CREATE OR REPLACE VIEW workspace_cards AS
SELECT 
    w.*,
    c.name as city_name,
    c.country as city_country,
    c.slug as city_slug,
    (
        SELECT json_build_object(
            'id', wp.id,
            'url', wp.url,
            'caption', wp.caption
        )
        FROM workspace_photos wp
        WHERE wp.workspace_id = w.id 
        AND wp.is_primary = true 
        AND wp.is_approved = true
        LIMIT 1
    ) as primary_photo,
    (
        SELECT COUNT(*)
        FROM workspace_photos wp
        WHERE wp.workspace_id = w.id 
        AND wp.is_approved = true
    ) as photo_count
FROM workspaces w
LEFT JOIN cities c ON w.city_id = c.id
WHERE w.status = 'approved';

-- Function to get or create primary photo URL
CREATE OR REPLACE FUNCTION get_workspace_primary_photo(workspace_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    photo_url TEXT;
BEGIN
    SELECT url INTO photo_url
    FROM workspace_photos
    WHERE workspace_id = workspace_uuid
    AND is_primary = true
    AND is_approved = true
    LIMIT 1;
    
    -- If no primary photo, get any approved photo
    IF photo_url IS NULL THEN
        SELECT url INTO photo_url
        FROM workspace_photos
        WHERE workspace_id = workspace_uuid
        AND is_approved = true
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    RETURN photo_url;
END;
$$ LANGUAGE plpgsql;

-- Function to set primary photo (unsets others)
CREATE OR REPLACE FUNCTION set_primary_photo(photo_uuid UUID)
RETURNS VOID AS $$
DECLARE
    workspace_uuid UUID;
BEGIN
    -- Get the workspace_id for this photo
    SELECT workspace_id INTO workspace_uuid
    FROM workspace_photos
    WHERE id = photo_uuid;
    
    -- Unset all other primary photos for this workspace
    UPDATE workspace_photos
    SET is_primary = false
    WHERE workspace_id = workspace_uuid
    AND id != photo_uuid;
    
    -- Set this photo as primary
    UPDATE workspace_photos
    SET is_primary = true
    WHERE id = photo_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-approve first photo as primary
CREATE OR REPLACE FUNCTION auto_set_first_photo_primary()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is the first photo for the workspace, make it primary
    IF NOT EXISTS (
        SELECT 1 FROM workspace_photos 
        WHERE workspace_id = NEW.workspace_id 
        AND id != NEW.id
    ) THEN
        NEW.is_primary := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_first_photo_primary
    BEFORE INSERT ON workspace_photos
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_first_photo_primary();

-- Grant access to the view
GRANT SELECT ON workspace_cards TO authenticated, anon;
