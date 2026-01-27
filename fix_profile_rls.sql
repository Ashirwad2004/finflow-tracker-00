-- Enable RLS (just in case)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Allow Users to INSERT their own profile
-- This is needed for 'upsert' to work if the profile row doesn't exist yet.
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Allow Users to UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

-- 3. Allow Users to SELECT their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

-- Success Message
SELECT 'Fixed RLS policies! You can now save business details.' as message;
