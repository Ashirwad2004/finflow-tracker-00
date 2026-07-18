-- Phase 3: Advanced Automation & Validation (Indexes, Maker/Checker, Amendments)

-- 1. Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON public.sales (user_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_document_type ON public.sales (document_type);
CREATE INDEX IF NOT EXISTS idx_sales_customer_gstin ON public.sales (customer_gstin);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);

-- 2. Add Maker / Checker Roles to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_ca BOOLEAN DEFAULT false;

-- 3. Add Amendment Support to Sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS is_amendment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS amended_invoice_id UUID REFERENCES public.sales(id) ON DELETE SET NULL;

-- 4. Update the Trigger to also block pending_review periods
CREATE OR REPLACE FUNCTION check_period_lock()
RETURNS TRIGGER AS $$
DECLARE
    current_status TEXT;
BEGIN
    SELECT status INTO current_status
    FROM public.tax_periods
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND month = EXTRACT(MONTH FROM COALESCE(NEW.date, OLD.date))
      AND year = EXTRACT(YEAR FROM COALESCE(NEW.date, OLD.date));

    IF current_status IN ('locked', 'pending_review') THEN
        RAISE EXCEPTION 'Cannot modify sales data. The tax period for this date is currently %.', current_status;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Update generate_gstr1_data RPC to support Table 9A and 9C
CREATE OR REPLACE FUNCTION generate_gstr1_data(p_user_id UUID, p_start_date DATE, p_end_date DATE, p_biz_state_code CHAR(2))
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
