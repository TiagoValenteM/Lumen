-- Revert reviews.user_id FK to auth.users to avoid missing profiles rows
-- Drop FK to profiles (if present)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;

-- Add FK to auth.users
ALTER TABLE reviews
  ADD CONSTRAINT reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Optional: keep a permissive read policy on profiles for avatar/name lookups
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'public read profiles'
    ) THEN
      CREATE POLICY "public read profiles"
        ON profiles
        FOR SELECT
        USING (true);
    END IF;
  END IF;
END$$;
