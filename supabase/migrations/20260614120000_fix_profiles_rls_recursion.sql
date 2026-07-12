-- 1. Create a security definer function to check admin status
-- This function runs with the privileges of the creator (bypassing RLS on profiles)
-- preventing infinite recursion.
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE user_id = _user_id), false);
$$;

-- 2. Drop the recursive policy on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 3. Re-create the SELECT policy using the helper function
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        public.is_admin_user(auth.uid())
    );

-- 4. Update the demo_requests policies to use the helper function as well
DROP POLICY IF EXISTS "auth_select_demo" ON public.demo_requests;
CREATE POLICY "auth_select_demo"
  ON public.demo_requests FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS "auth_update_demo" ON public.demo_requests;
CREATE POLICY "auth_update_demo"
  ON public.demo_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_user(auth.uid())
  );
