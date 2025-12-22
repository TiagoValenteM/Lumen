-- Function to update city workspace count
CREATE OR REPLACE FUNCTION update_city_workspace_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment count when workspace is added
    UPDATE cities 
    SET workspace_count = workspace_count + 1
    WHERE id = NEW.city_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count when workspace is deleted
    UPDATE cities 
    SET workspace_count = GREATEST(workspace_count - 1, 0)
    WHERE id = OLD.city_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle city change
    IF OLD.city_id != NEW.city_id THEN
      -- Decrement old city
      UPDATE cities 
      SET workspace_count = GREATEST(workspace_count - 1, 0)
      WHERE id = OLD.city_id;
      -- Increment new city
      UPDATE cities 
      SET workspace_count = workspace_count + 1
      WHERE id = NEW.city_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on workspaces table
DROP TRIGGER IF EXISTS trigger_update_city_workspace_count ON workspaces;
CREATE TRIGGER trigger_update_city_workspace_count
AFTER INSERT OR UPDATE OR DELETE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION update_city_workspace_count();

-- Initialize workspace counts for existing cities
UPDATE cities c
SET workspace_count = (
  SELECT COUNT(*)
  FROM workspaces w
  WHERE w.city_id = c.id
  AND w.status = 'approved'
);
