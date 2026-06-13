-- 1. Add is_admin column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create policy to allow admin users to view any profile
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        (SELECT COALESCE(is_admin, false) FROM public.profiles WHERE user_id = auth.uid()) = true
    );

-- 3. Secure get_admin_users RPC function to check admin privileges
DROP FUNCTION IF EXISTS public.get_admin_users();
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  avatar_url TEXT,
  full_name TEXT,
  business_name TEXT,
  gst_number TEXT,
  business_phone TEXT,
  business_address TEXT,
  is_business_mode BOOLEAN,
  business_logo TEXT,
  signature_url TEXT,
  is_admin BOOLEAN
) AS $$
BEGIN
  -- Security check: only users with is_admin = true can run this RPC
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can query users.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id AS id,
    u.id AS user_id,
    u.email::VARCHAR,
    u.created_at AS created_at,
    COALESCE(p.updated_at, u.updated_at) AS updated_at,
    NULL::TEXT AS avatar_url,
    COALESCE(p.display_name, u.raw_user_meta_data->>'display_name') AS full_name,
    p.business_name,
    p.gst_number,
    p.business_phone,
    p.business_address,
    COALESCE(p.is_business_mode, false) AS is_business_mode,
    p.business_logo,
    p.signature_url,
    COALESCE(p.is_admin, false) AS is_admin
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC
  LIMIT 200;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Secure public.demo_requests policies so only admins can view or edit them
DROP POLICY IF EXISTS "auth_select_demo" ON public.demo_requests;
CREATE POLICY "auth_select_demo"
  ON public.demo_requests FOR SELECT
  TO authenticated
  USING (
    (SELECT COALESCE(is_admin, false) FROM public.profiles WHERE user_id = auth.uid()) = true
  );

DROP POLICY IF EXISTS "auth_update_demo" ON public.demo_requests;
CREATE POLICY "auth_update_demo"
  ON public.demo_requests FOR UPDATE
  TO authenticated
  USING (
    (SELECT COALESCE(is_admin, false) FROM public.profiles WHERE user_id = auth.uid()) = true
  );

-- 5. Seed default administrators based on email conventions
UPDATE public.profiles
SET is_admin = true
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%admin@%' 
     OR email LIKE '%ashirwad%'
);

-- 6. RPC function to allow existing admins to toggle admin status of other users
CREATE OR REPLACE FUNCTION public.set_user_admin_status(target_user_id UUID, make_admin BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
  -- Security Check: Verify if caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify roles.';
  END IF;

  UPDATE public.profiles
  SET is_admin = make_admin
  WHERE user_id = target_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
