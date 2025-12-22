-- RLS policies for profiles
-- Assumes RLS is enabled on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read profiles (for displaying reviewer info)
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

-- Allow authenticated users to insert/update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users manage own profile'
  ) THEN
    CREATE POLICY "users manage own profile"
      ON profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users update own profile'
  ) THEN
    CREATE POLICY "users update own profile"
      ON profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END$$;
