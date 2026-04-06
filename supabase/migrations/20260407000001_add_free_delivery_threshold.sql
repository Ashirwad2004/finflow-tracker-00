-- ================================================================
-- ADD FREE DELIVERY THRESHOLD
-- Extends profiles and get_public_store RPC
-- ================================================================

-- Step 1: Add free_delivery_min_amount to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS free_delivery_min_amount NUMERIC DEFAULT 0;

-- Step 2: Update get_public_store to return delivery config PLUS threshold
DROP FUNCTION IF EXISTS public.get_public_store(TEXT);
CREATE OR REPLACE FUNCTION public.get_public_store(p_slug TEXT)
RETURNS TABLE (
    user_id         UUID,
    display_name    TEXT,
    business_name   TEXT,
    business_logo   TEXT,
    store_slug      TEXT,
    is_store_active BOOLEAN,
    delivery_charge NUMERIC,
    free_delivery_min_amount NUMERIC
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
        pr.is_store_active,
        pr.delivery_charge,
        pr.free_delivery_min_amount
    FROM public.profiles pr
    WHERE pr.store_slug = p_slug
      AND pr.is_store_active = true
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_store(TEXT) TO anon;
