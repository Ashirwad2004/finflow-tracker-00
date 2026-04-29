-- Create RPC function to fetch all users for the admin dashboard
-- Bypasses RLS (SECURITY DEFINER) and joins auth.users to get the email address

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
  signature_url TEXT
) AS $$
BEGIN
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
    p.signature_url
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC
  LIMIT 200;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
