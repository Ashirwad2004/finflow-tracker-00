-- ================================================================
-- DEFINITIVE BRANDING FIX FOR STOREFRONT
-- Combines column check + updated RPC + anon SELECT grant
-- Run this entire script in Supabase SQL Editor
-- ================================================================

-- Step 1: Ensure business branding columns exist on profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS business_name TEXT,
    ADD COLUMN IF NOT EXISTS business_logo TEXT,
    ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Step 2: Drop and recreate get_public_store with branding fields
DROP FUNCTION IF EXISTS public.get_public_store(TEXT);

CREATE OR REPLACE FUNCTION public.get_public_store(p_slug TEXT)
RETURNS TABLE (
    user_id         UUID,
    display_name    TEXT,
    business_name   TEXT,
    business_logo   TEXT,
    store_slug      TEXT,
    is_store_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.user_id,
        pr.display_name,
        pr.business_name,
        pr.business_logo,
        pr.store_slug,
        pr.is_store_active
    FROM public.profiles pr
    WHERE pr.store_slug = p_slug
      AND pr.is_store_active = true
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_store(TEXT) TO anon;

-- Step 3: Also grant anon SELECT on profiles so the fallback direct query works
-- (anon can only see rows where is_store_active = true, controlled by the existing policy)
GRANT SELECT ON public.profiles TO anon;

-- Step 4: Ensure the "Public can view active stores" policy exists for anon reads
DROP POLICY IF EXISTS "Public can view active stores" ON public.profiles;
CREATE POLICY "Public can view active stores"
ON public.profiles FOR SELECT
USING (is_store_active = true);

-- Verify your data (run these separately):
-- SELECT user_id, business_name, business_logo, store_slug FROM public.profiles WHERE store_slug IS NOT NULL;
