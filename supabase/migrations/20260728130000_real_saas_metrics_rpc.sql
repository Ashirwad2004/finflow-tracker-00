-- Migration: 20260728130000_real_saas_metrics_rpc.sql
-- Description: Completely dynamic PostgreSQL metrics procedure: dynamically discovers all public schema tables from pg_namespace/pg_class in O(1) time and returns exact DB engine execution duration.

CREATE OR REPLACE FUNCTION public.get_system_health_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_start_time timestamp := clock_timestamp();
    v_db_exec_ms numeric;
    v_table_counts jsonb;
BEGIN
    -- Dynamically discover and aggregate row statistics for all tables in the public schema (O(1) instant catalog lookup)
    SELECT jsonb_object_agg(c.relname, GREATEST(c.reltuples::bigint, 0))
    INTO v_table_counts
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT LIKE '_prisma_%';

    v_db_exec_ms := ROUND((EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::numeric, 2);

    RETURN jsonb_build_object(
        'status', 'ok',
        'db_execution_ms', v_db_exec_ms,
        'table_counts', COALESCE(v_table_counts, '{}'::jsonb),
        'server_timestamp', now()
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_system_health_metrics() TO anon, authenticated, service_role;
