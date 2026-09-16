-- ============================================================================
-- FINFLOW PRODUCTION SECURITY HARDENING MIGRATION
-- Date: 2026-09-16
-- Scope: RLS Hardening, Privilege Escalation Protection, RPC Access Controls,
--        Webhook Idempotency, Financial Constraints, and Storage Isolation
-- ============================================================================

-- 1. Webhook Idempotency Table (Persistent DB-backed idempotency)
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'razorpay',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
-- No public/anon policies needed; accessed solely by backend service role or SECURITY DEFINER RPC.

-- 2. Privilege Escalation Protection on profiles table
CREATE OR REPLACE FUNCTION public.protect_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Only existing verified admins can change is_admin or is_ca flags
    IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin) OR (NEW.is_ca IS DISTINCT FROM OLD.is_ca) THEN
        IF NOT is_admin_user(auth.uid()) THEN
            RAISE EXCEPTION 'Privilege escalation blocked: only administrators can change role flags.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privilege_escalation();

CREATE OR REPLACE FUNCTION public.protect_profile_insert_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Prevent non-admins from inserting profiles with is_admin = true or is_ca = true
    IF COALESCE(NEW.is_admin, false) = true OR COALESCE(NEW.is_ca, false) = true THEN
        IF NOT is_admin_user(auth.uid()) THEN
            NEW.is_admin := false;
            NEW.is_ca := false;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_insert ON public.profiles;
CREATE TRIGGER trg_protect_profile_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_insert_privileges();

-- 3. Profiles Data Leak Fix: Drop wide-open public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- 4. Cross-Tenant RPC Authorization Hardening
-- GSTR-1
CREATE OR REPLACE FUNCTION public.generate_gstr1_data(p_user_id uuid, p_start_date date, p_end_date date, p_biz_state_code character)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
    b2b_records JSON;
    b2ba_records JSON;
    b2cl_records JSON;
    b2cs_records JSON;
    cdnr_records JSON;
    cdnra_records JSON;
    hsn_summary JSON;
    summary JSON;
BEGIN
    -- Authorization check: caller must be the user or an admin
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT is_admin_user(auth.uid())) THEN
        RAISE EXCEPTION 'Access Denied: Unauthorized to access tax records for user %', p_user_id;
    END IF;

    -- 1. B2B Records (Table 4) - only regular invoices
    SELECT COALESCE(json_agg(row_to_json(b2b)), '[]') INTO b2b_records
    FROM (
        SELECT 
            customer_gstin as gstin,
            customer_name,
            invoice_number,
            date as invoice_date,
            total_amount as invoice_value,
            COALESCE(subtotal, total_amount - tax_amount) as taxable_value,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) != p_biz_state_code THEN tax_amount ELSE 0 END as igst,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as cgst,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as sgst,
            COALESCE(place_of_supply, LEFT(customer_gstin, 2)) as place_of_supply,
            is_reverse_charge as reverse_charge
        FROM sales
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND status != 'draft'
          AND document_type = 'invoice'
          AND is_amendment = false
          AND customer_gstin IS NOT NULL 
          AND length(customer_gstin) = 15
    ) b2b;

    -- 2. Amended B2B Records (Table 9A)
    SELECT COALESCE(json_agg(row_to_json(b2ba)), '[]') INTO b2ba_records
    FROM (
        SELECT 
            customer_gstin as gstin,
            customer_name,
            invoice_number as revised_invoice_number,
            date as revised_invoice_date,
            (SELECT invoice_number FROM sales s2 WHERE s2.id = sales.amended_invoice_id) as original_invoice_number,
            (SELECT date FROM sales s2 WHERE s2.id = sales.amended_invoice_id) as original_invoice_date,
            total_amount as invoice_value,
            COALESCE(subtotal, total_amount - tax_amount) as taxable_value,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) != p_biz_state_code THEN tax_amount ELSE 0 END as igst,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as cgst,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as sgst,
            COALESCE(place_of_supply, LEFT(customer_gstin, 2)) as place_of_supply,
            is_reverse_charge as reverse_charge
        FROM sales
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND status != 'draft'
          AND document_type = 'invoice'
          AND is_amendment = true
          AND customer_gstin IS NOT NULL 
          AND length(customer_gstin) = 15
    ) b2ba;

    -- 3. B2C Large (Table 5)
    SELECT COALESCE(json_agg(row_to_json(b2cl)), '[]') INTO b2cl_records
    FROM (
        SELECT 
            invoice_number,
            date as invoice_date,
            total_amount as invoice_value,
            COALESCE(place_of_supply, 'Other') as place_of_supply,
            COALESCE(subtotal, total_amount - tax_amount) as taxable_value,
            tax_amount as igst
        FROM sales
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND status != 'draft'
          AND document_type = 'invoice'
          AND is_amendment = false
          AND (customer_gstin IS NULL OR length(customer_gstin) < 15)
          AND total_amount > 250000
          AND COALESCE(place_of_supply, '') != p_biz_state_code
    ) b2cl;

    -- 4. B2C Small (Table 7)
    SELECT COALESCE(json_agg(row_to_json(b2cs)), '[]') INTO b2cs_records
    FROM (
        SELECT 
            COALESCE(place_of_supply, p_biz_state_code) as place_of_supply,
            ROUND(CAST(COALESCE(tax_amount / NULLIF(COALESCE(subtotal, total_amount - tax_amount), 0), 0) * 100 AS numeric), 2) as tax_rate,
            SUM(COALESCE(subtotal, total_amount - tax_amount)) as taxable_value,
            SUM(CASE WHEN COALESCE(place_of_supply, p_biz_state_code) != p_biz_state_code THEN tax_amount ELSE 0 END) as igst,
            SUM(CASE WHEN COALESCE(place_of_supply, p_biz_state_code) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END) as cgst,
            SUM(CASE WHEN COALESCE(place_of_supply, p_biz_state_code) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END) as sgst
        FROM sales
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND status != 'draft'
          AND document_type = 'invoice'
          AND is_amendment = false
          AND (
              (customer_gstin IS NULL OR length(customer_gstin) < 15)
              AND NOT (total_amount > 250000 AND COALESCE(place_of_supply, '') != p_biz_state_code)
          )
        GROUP BY COALESCE(place_of_supply, p_biz_state_code), tax_rate
    ) b2cs;

    -- 5. Credit/Debit Notes (Table 9B)
    SELECT COALESCE(json_agg(row_to_json(cdnr)), '[]') INTO cdnr_records
    FROM (
        SELECT 
            customer_gstin as gstin,
            customer_name,
            invoice_number as note_number,
            date as note_date,
            document_type,
            (SELECT invoice_number FROM sales s2 WHERE s2.id = sales.original_invoice_id) as original_invoice_number,
            (SELECT date FROM sales s2 WHERE s2.id = sales.original_invoice_id) as original_invoice_date,
            total_amount as note_value,
            COALESCE(subtotal, total_amount - tax_amount) as taxable_value,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) != p_biz_state_code THEN tax_amount ELSE 0 END as igst,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as cgst,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as sgst,
            COALESCE(place_of_supply, LEFT(customer_gstin, 2)) as place_of_supply
        FROM sales
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND status != 'draft'
          AND document_type IN ('credit_note', 'debit_note')
          AND is_amendment = false
    ) cdnr;

    -- 6. Amended Credit/Debit Notes (Table 9C)
    SELECT COALESCE(json_agg(row_to_json(cdnra)), '[]') INTO cdnra_records
    FROM (
        SELECT 
            customer_gstin as gstin,
            customer_name,
            invoice_number as revised_note_number,
            date as revised_note_date,
            (SELECT invoice_number FROM sales s2 WHERE s2.id = sales.amended_invoice_id) as original_note_number,
            (SELECT date FROM sales s2 WHERE s2.id = sales.amended_invoice_id) as original_note_date,
            document_type,
            total_amount as note_value,
            COALESCE(subtotal, total_amount - tax_amount) as taxable_value,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) != p_biz_state_code THEN tax_amount ELSE 0 END as igst,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as cgst,
            CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as sgst,
            COALESCE(place_of_supply, LEFT(customer_gstin, 2)) as place_of_supply
        FROM sales
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND status != 'draft'
          AND document_type IN ('credit_note', 'debit_note')
          AND is_amendment = true
    ) cdnra;

    -- 7. HSN Summary (Table 12)
    SELECT COALESCE(json_agg(row_to_json(hsn)), '[]') INTO hsn_summary
    FROM (
        SELECT 
            COALESCE(item->>'hsn_code', '0000') as hsn_code,
            MAX(item->>'description') as description,
            'NOS' as uqc,
            SUM(CAST(item->>'quantity' AS numeric)) as quantity,
            SUM(CAST(item->>'total' AS numeric) * CASE WHEN s.document_type = 'credit_note' THEN -1 ELSE 1 END) as taxable_value,
            CAST(item->>'tax_rate' AS numeric) as tax_rate,
            SUM(CASE WHEN COALESCE(s.place_of_supply, p_biz_state_code) != p_biz_state_code THEN (CAST(item->>'total' AS numeric) * CAST(item->>'tax_rate' AS numeric) / 100) * CASE WHEN s.document_type = 'credit_note' THEN -1 ELSE 1 END ELSE 0 END) as igst,
            SUM(CASE WHEN COALESCE(s.place_of_supply, p_biz_state_code) = p_biz_state_code THEN (CAST(item->>'total' AS numeric) * CAST(item->>'tax_rate' AS numeric) / 200) * CASE WHEN s.document_type = 'credit_note' THEN -1 ELSE 1 END ELSE 0 END) as cgst,
            SUM(CASE WHEN COALESCE(s.place_of_supply, p_biz_state_code) = p_biz_state_code THEN (CAST(item->>'total' AS numeric) * CAST(item->>'tax_rate' AS numeric) / 200) * CASE WHEN s.document_type = 'credit_note' THEN -1 ELSE 1 END ELSE 0 END) as sgst
        FROM sales s, jsonb_array_elements(s.items) as item
        WHERE s.user_id = p_user_id 
          AND s.date >= p_start_date AND s.date <= p_end_date
          AND s.status != 'draft'
        GROUP BY COALESCE(item->>'hsn_code', '0000'), CAST(item->>'tax_rate' AS numeric)
    ) hsn;

    -- 8. Summary (Table 3.1)
    SELECT row_to_json(s) INTO summary
    FROM (
        SELECT 
            COUNT(id) as total_invoices,
            SUM(COALESCE(subtotal, total_amount - tax_amount) * CASE WHEN document_type = 'credit_note' THEN -1 ELSE 1 END) as total_taxable,
            SUM(tax_amount * CASE WHEN document_type = 'credit_note' THEN -1 ELSE 1 END) as total_tax,
            SUM(total_amount * CASE WHEN document_type = 'credit_note' THEN -1 ELSE 1 END) as total_value
        FROM sales
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND status != 'draft'
    ) s;

    result := json_build_object(
        'b2b', b2b_records,
        'b2ba', b2ba_records,
        'b2cl', b2cl_records,
        'b2cs', b2cs_records,
        'cdnr', cdnr_records,
        'cdnra', cdnra_records,
        'hsn', hsn_summary,
        'summary', summary
    );

    RETURN result;
END;
$$;

-- GSTR-2B
CREATE OR REPLACE FUNCTION public.generate_gstr2b_data(p_user_id uuid, p_start_date date, p_end_date date, p_biz_state_code character)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
    b2b_purchases JSON;
    summary JSON;
BEGIN
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT is_admin_user(auth.uid())) THEN
        RAISE EXCEPTION 'Access Denied: Unauthorized to access tax records for user %', p_user_id;
    END IF;

    -- ITC eligible purchases (from registered vendors)
    SELECT COALESCE(json_agg(row_to_json(b2b)), '[]') INTO b2b_purchases
    FROM (
        SELECT 
            vendor_gstin as gstin,
            vendor_name,
            bill_number as invoice_number,
            date as invoice_date,
            total_amount as invoice_value,
            COALESCE(subtotal, total_amount - tax_amount) as taxable_value,
            CASE WHEN COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) != p_biz_state_code THEN tax_amount ELSE 0 END as igst,
            CASE WHEN COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as cgst,
            CASE WHEN COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END as sgst,
            COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) as place_of_supply
        FROM purchases
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND vendor_gstin IS NOT NULL 
          AND length(vendor_gstin) = 15
    ) b2b;

    SELECT row_to_json(s) INTO summary
    FROM (
        SELECT 
            COUNT(id) as total_invoices,
            SUM(COALESCE(subtotal, total_amount - tax_amount)) as total_taxable,
            SUM(CASE WHEN COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) != p_biz_state_code THEN tax_amount ELSE 0 END) as total_igst,
            SUM(CASE WHEN COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END) as total_cgst,
            SUM(CASE WHEN COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END) as total_sgst
        FROM purchases
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND vendor_gstin IS NOT NULL 
          AND length(vendor_gstin) = 15
    ) s;

    result := json_build_object(
        'b2b', b2b_purchases,
        'summary', summary
    );

    RETURN result;
END;
$$;

-- GSTR-3B
CREATE OR REPLACE FUNCTION public.generate_gstr3b_data(p_user_id uuid, p_start_date date, p_end_date date, p_biz_state_code character)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
    outward_summary JSON;
    inward_itc_summary JSON;
BEGIN
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT is_admin_user(auth.uid())) THEN
        RAISE EXCEPTION 'Access Denied: Unauthorized to access tax records for user %', p_user_id;
    END IF;

    -- 3.1 Outward Supplies
    SELECT row_to_json(outward) INTO outward_summary
    FROM (
        SELECT 
            SUM(COALESCE(subtotal, total_amount - tax_amount)) as total_taxable_value,
            SUM(CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2), p_biz_state_code) != p_biz_state_code THEN tax_amount ELSE 0 END) as total_igst,
            SUM(CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2), p_biz_state_code) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END) as total_cgst,
            SUM(CASE WHEN COALESCE(place_of_supply, LEFT(customer_gstin, 2), p_biz_state_code) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END) as total_sgst
        FROM sales
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND status != 'draft'
    ) outward;

    -- 4. Eligible ITC (from registered purchases)
    SELECT row_to_json(inward) INTO inward_itc_summary
    FROM (
        SELECT 
            SUM(COALESCE(subtotal, total_amount - tax_amount)) as total_taxable_value,
            SUM(CASE WHEN COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) != p_biz_state_code THEN tax_amount ELSE 0 END) as total_igst,
            SUM(CASE WHEN COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END) as total_cgst,
            SUM(CASE WHEN COALESCE(place_of_supply, LEFT(vendor_gstin, 2)) = p_biz_state_code THEN tax_amount / 2 ELSE 0 END) as total_sgst
        FROM purchases
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND vendor_gstin IS NOT NULL 
          AND length(vendor_gstin) = 15
    ) inward;

    result := json_build_object(
        'outward', COALESCE(outward_summary, '{}'::json),
        'inward', COALESCE(inward_itc_summary, '{}'::json)
    );

    RETURN result;
END;
$$;

-- Revoke dangerous execute privileges from anon / public on sensitive tax RPCs
REVOKE EXECUTE ON FUNCTION public.generate_gstr1_data(uuid, date, date, character) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_gstr1_data(uuid, date, date, character) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_gstr2b_data(uuid, date, date, character) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_gstr2b_data(uuid, date, date, character) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_gstr3b_data(uuid, date, date, character) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_gstr3b_data(uuid, date, date, character) TO authenticated;

-- 5. Order Management and Stock Manipulation Functions
-- Restrict restore_online_order_stock so it cannot be directly invoked by external callers
REVOKE EXECUTE ON FUNCTION public.restore_online_order_stock(uuid) FROM anon, authenticated, public;

-- delivery_complete_order authorization
CREATE OR REPLACE FUNCTION public.delivery_complete_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.online_orders o
        WHERE o.id = p_order_id
          AND (
              o.store_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM public.store_salesmen s
                  WHERE s.store_id = o.store_id
                    AND lower(s.salesman_email) = lower((auth.jwt() ->> 'email'::text))
                    AND s.is_active = true
                    AND s.can_manage_orders = true
              )
          )
    ) THEN
        RAISE EXCEPTION 'Access Denied: You cannot complete orders for this store.';
    END IF;

    UPDATE public.online_orders
    SET status = 'completed'
    WHERE id = p_order_id AND status != 'completed';
END;
$$;

-- cancel_online_order authorization
CREATE OR REPLACE FUNCTION public.cancel_online_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.online_orders o
        WHERE o.id = p_order_id
          AND (
              o.store_id = auth.uid()
              OR o.customer_phone = (auth.jwt() ->> 'phone'::text)
          )
    ) THEN
        RAISE EXCEPTION 'Access Denied: Unauthorized to cancel order.';
    END IF;

    UPDATE public.online_orders
    SET status = 'rejected'
    WHERE id = p_order_id
      AND status = 'pending_payment';
END;
$$;

-- get_system_health_metrics: Admin only
CREATE OR REPLACE FUNCTION public.get_system_health_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_start_time timestamp := clock_timestamp();
    v_db_exec_ms numeric;
    v_table_counts jsonb;
BEGIN
    IF NOT is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied: System metrics are restricted to administrators.';
    END IF;

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

-- 6. Close Direct Order Table Injection (force usage of place_online_order RPC)
DROP POLICY IF EXISTS "Anon INSERT orders" ON public.online_orders;
DROP POLICY IF EXISTS "Anon INSERT order items" ON public.online_order_items;

-- 7. Secure delivery_tracking & order_returns RLS
DROP POLICY IF EXISTS "Public can update delivery tracking" ON public.delivery_tracking;
DROP POLICY IF EXISTS "Public can view delivery tracking" ON public.delivery_tracking;

CREATE POLICY "Store staff can manage delivery tracking" ON public.delivery_tracking
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.online_orders o
        WHERE o.id = delivery_tracking.order_id
          AND (
              o.store_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM public.store_salesmen s
                  WHERE s.store_id = o.store_id
                    AND lower(s.salesman_email) = lower((auth.jwt() ->> 'email'::text))
                    AND s.is_active = true
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.online_orders o
        WHERE o.id = delivery_tracking.order_id
          AND (
              o.store_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM public.store_salesmen s
                  WHERE s.store_id = o.store_id
                    AND lower(s.salesman_email) = lower((auth.jwt() ->> 'email'::text))
                    AND s.is_active = true
              )
          )
    )
);

CREATE POLICY "Customers can view tracking for their order" ON public.delivery_tracking
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.online_orders o
        WHERE o.id = delivery_tracking.order_id
    )
);

DROP POLICY IF EXISTS "Public can view returns" ON public.order_returns;

-- 8. Add Missing Policies on Tables with RLS Enabled
-- invoice_items
DROP POLICY IF EXISTS "Users can view own invoice items" ON public.invoice_items;
CREATE POLICY "Users can view own invoice items" ON public.invoice_items
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own invoice items" ON public.invoice_items
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- tax_periods
DROP POLICY IF EXISTS "Users can view own tax periods" ON public.tax_periods;
CREATE POLICY "Users can view own tax periods" ON public.tax_periods
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own tax periods" ON public.tax_periods
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- audit_logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- trial_claims
DROP POLICY IF EXISTS "Users can view own trial claims" ON public.trial_claims;
CREATE POLICY "Users can view own trial claims" ON public.trial_claims
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

-- 9. Close Global Group Enumeration Vulnerability
DROP POLICY IF EXISTS "Anyone can view group by invite code" ON public.groups;

-- 10. Financial Integrity Constraints (Numeric Bounds)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_positive') THEN
        ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_total_amount_positive') THEN
        ALTER TABLE public.sales ADD CONSTRAINT sales_total_amount_positive CHECK (total_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_total_amount_positive') THEN
        ALTER TABLE public.purchases ADD CONSTRAINT purchases_total_amount_positive CHECK (total_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_positive') THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'online_orders_total_amount_positive') THEN
        ALTER TABLE public.online_orders ADD CONSTRAINT online_orders_total_amount_positive CHECK (total_amount >= 0);
    END IF;
END $$;

-- 11. Storage Hardening
-- Ensure bills private bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'bills',
    'bills',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Configure business_assets limits
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
WHERE id = 'business_assets';

-- Storage RLS policies for business_assets (scoped to user folder)
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;

CREATE POLICY "Authenticated users can upload own business assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'business_assets'
    AND (
        (storage.foldername(name))[1] = (auth.uid())::text
        OR name LIKE ('%' || (auth.uid())::text || '%')
    )
);

CREATE POLICY "Authenticated users can update own business assets" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'business_assets'
    AND (
        (storage.foldername(name))[1] = (auth.uid())::text
        OR name LIKE ('%' || (auth.uid())::text || '%')
    )
)
WITH CHECK (
    bucket_id = 'business_assets'
    AND (
        (storage.foldername(name))[1] = (auth.uid())::text
        OR name LIKE ('%' || (auth.uid())::text || '%')
    )
);

CREATE POLICY "Authenticated users can delete own business assets" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'business_assets'
    AND (
        (storage.foldername(name))[1] = (auth.uid())::text
        OR name LIKE ('%' || (auth.uid())::text || '%')
    )
);

-- Storage RLS policies for bills
DROP POLICY IF EXISTS "Users can upload own bills" ON storage.objects;
CREATE POLICY "Users can upload own bills" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'bills'
    AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update own bills" ON storage.objects;
CREATE POLICY "Users can update own bills" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'bills'
    AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
    bucket_id = 'bills'
    AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete own bills" ON storage.objects;
CREATE POLICY "Users can delete own bills" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'bills'
    AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 12. Fix Search Path on all remaining security definer functions
ALTER FUNCTION public.create_expense_transaction_v2(jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_purchase_transaction(text, text, date, numeric, text, jsonb, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_admin_users() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_user_admin_status(uuid, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_group_member(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_invoice_items() SET search_path = public, pg_temp;
