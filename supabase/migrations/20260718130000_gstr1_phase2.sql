-- Phase 2: Workflow & Integrity

-- 1. Create tax_periods table for freezing returns
CREATE TABLE IF NOT EXISTS public.tax_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'locked',
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);
ALTER TABLE public.tax_periods ENABLE ROW LEVEL SECURITY;

-- 2. Add CN/DN fields to sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'invoice',
ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES public.sales(id) ON DELETE SET NULL;

-- 3. Create normalized invoice_items table for performance and complex querying
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT,
    quantity NUMERIC,
    price NUMERIC,
    discount NUMERIC,
    total NUMERIC,
    tax_rate NUMERIC,
    hsn_code TEXT
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 4. Trigger to auto-populate invoice_items from sales.items JSONB
CREATE OR REPLACE FUNCTION sync_invoice_items()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        DELETE FROM public.invoice_items WHERE invoice_id = NEW.id;
    END IF;
    
    IF NEW.items IS NOT NULL THEN
        INSERT INTO public.invoice_items (invoice_id, user_id, description, quantity, price, discount, total, tax_rate, hsn_code)
        SELECT 
            NEW.id,
            NEW.user_id,
            item->>'description',
            CAST(NULLIF(item->>'quantity', '') AS NUMERIC),
            CAST(NULLIF(item->>'price', '') AS NUMERIC),
            CAST(NULLIF(item->>'discount', '') AS NUMERIC),
            CAST(NULLIF(item->>'total', '') AS NUMERIC),
            CAST(NULLIF(item->>'tax_rate', '') AS NUMERIC),
            item->>'hsn_code'
        FROM jsonb_array_elements(NEW.items) AS item;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_invoice_items ON public.sales;
CREATE TRIGGER trg_sync_invoice_items
AFTER INSERT OR UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION sync_invoice_items();

-- 5. Trigger to block modifications on locked periods
CREATE OR REPLACE FUNCTION check_period_lock()
RETURNS TRIGGER AS $$
DECLARE
    is_locked BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.tax_periods
        WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
          AND month = EXTRACT(MONTH FROM COALESCE(NEW.date, OLD.date))
          AND year = EXTRACT(YEAR FROM COALESCE(NEW.date, OLD.date))
          AND status = 'locked'
    ) INTO is_locked;

    IF is_locked THEN
        RAISE EXCEPTION 'Cannot modify sales data. The tax period for this date is locked.';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_period_lock ON public.sales;
CREATE TRIGGER trg_check_period_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION check_period_lock();


-- 6. Update generate_gstr1_data RPC for Phase 2 (Table 9B and 8)
CREATE OR REPLACE FUNCTION generate_gstr1_data(p_user_id UUID, p_start_date DATE, p_end_date DATE, p_biz_state_code CHAR(2))
RETURNS JSON AS $$
DECLARE
    result JSON;
    b2b_records JSON;
    b2cl_records JSON;
    b2cs_records JSON;
    cdnr_records JSON;
    hsn_summary JSON;
    summary JSON;
BEGIN
    -- 1. B2B Records (Table 4) - only invoices
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
          AND customer_gstin IS NOT NULL 
          AND length(customer_gstin) = 15
    ) b2b;

    -- 2. B2C Large (Table 5)
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
          AND (customer_gstin IS NULL OR length(customer_gstin) < 15)
          AND total_amount > 250000
          AND COALESCE(place_of_supply, '') != p_biz_state_code
    ) b2cl;

    -- 3. B2C Small (Table 7)
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
          AND (
              (customer_gstin IS NULL OR length(customer_gstin) < 15)
              AND NOT (total_amount > 250000 AND COALESCE(place_of_supply, '') != p_biz_state_code)
          )
        GROUP BY COALESCE(place_of_supply, p_biz_state_code), tax_rate
    ) b2cs;

    -- 4. Credit/Debit Notes (Table 9B)
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
    ) cdnr;

    -- 5. HSN Summary (Table 12)
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

    -- 6. Summary (Table 3.1)
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
        'b2cl', b2cl_records,
        'b2cs', b2cs_records,
        'cdnr', cdnr_records,
        'hsn', hsn_summary,
        'summary', summary
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;