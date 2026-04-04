-- Update get_public_store to return business_name and business_logo
-- so the public storefront can display them instead of the generic display_name

CREATE OR REPLACE FUNCTION public.get_public_store(p_slug TEXT)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    store_slug TEXT,
    is_store_active BOOLEAN,
    business_name TEXT,
    business_logo TEXT
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
        pr.store_slug,
        pr.is_store_active,
        pr.business_name,
        pr.business_logo
    FROM public.profiles pr
    WHERE pr.store_slug = p_slug
      AND pr.is_store_active = true
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_store(TEXT) TO anon;
