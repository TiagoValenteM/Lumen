-- Add email and tag columns to profiles, with automatic tag generation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tag TEXT;

-- Function to auto-set tag from email prefix if tag not provided
CREATE OR REPLACE FUNCTION set_profile_tag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tag IS NULL OR length(trim(NEW.tag)) = 0 THEN
    IF NEW.email IS NOT NULL THEN
      NEW.tag := split_part(NEW.email, '@', 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set tag on insert/update
DROP TRIGGER IF EXISTS trigger_set_profile_tag ON profiles;
CREATE TRIGGER trigger_set_profile_tag
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_profile_tag();
