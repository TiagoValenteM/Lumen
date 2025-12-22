-- Update reviews.user_id to reference profiles(id) so we can join user info
-- Drop old FK to auth.users
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;

-- Add new FK to profiles(id)
ALTER TABLE reviews
  ADD CONSTRAINT reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Ensure profiles is readable for displaying reviewer info
-- (Assumes RLS enabled on profiles; add a permissive SELECT policy if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public read profiles'
  ) THEN
    CREATE POLICY "public read profiles"
      ON profiles
      FOR SELECT
      USING (true);
  END IF;
END$$;
