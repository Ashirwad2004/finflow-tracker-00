-- Remove the obsolete overloaded storefront order RPC.
-- The frontend calls the canonical seven-parameter function below.

DO $$
DECLARE
  function_identity TEXT;
BEGIN
  FOR function_identity IN
    SELECT p.oid::regprocedure::TEXT
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'place_online_order'
      AND pg_get_function_identity_arguments(p.oid) ILIKE '%, p_status text'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', function_identity);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.place_online_order(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.place_online_order(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  JSONB
) TO anon, authenticated;
