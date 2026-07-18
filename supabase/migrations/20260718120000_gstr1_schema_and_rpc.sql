-- Migration: Add GSTR-1 Specific Fields to sales table

ALTER TABLE IF EXISTS public.sales 
ADD COLUMN IF NOT EXISTS place_of_supply char(2),
ADD COLUMN IF NOT EXISTS is_reverse_charge boolean DEFAULT false;

-- Create an RPC to aggregate GSTR-1 data directly on the backend
-- This avoids heavy client-side processing of 100k+ invoices
CREATE OR REPLACE FUNCTION generate_gstr1_data(p_user_id UUID, p_start_date DATE, p_end_date DATE, p_biz_state_code CHAR(2))
RETURNS JSON AS $$
DECLARE
    result JSON;
    b2b_records JSON;
    b2cl_records JSON;
    b2cs_records JSON;
    hsn_summary JSON;
    summary JSON;
BEGIN
    -- 1. B2B Records (Table 4)
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
          AND (
              (customer_gstin IS NULL OR length(customer_gstin) < 15)
              AND NOT (total_amount > 250000 AND COALESCE(place_of_supply, '') != p_biz_state_code)
          )
        GROUP BY COALESCE(place_of_supply, p_biz_state_code), tax_rate
    ) b2cs;

    -- 4. HSN Summary (Table 12)
    SELECT COALESCE(json_agg(row_to_json(hsn)), '[]') INTO hsn_summary
    FROM (
        SELECT 
            COALESCE(item->>'hsn_code', '0000') as hsn_code,
            MAX(item->>'description') as description,
            'NOS' as uqc,
            SUM(CAST(item->>'quantity' AS numeric)) as quantity,
            SUM(CAST(item->>'total' AS numeric)) as taxable_value,
            CAST(item->>'tax_rate' AS numeric) as tax_rate,
            SUM(CASE WHEN COALESCE(s.place_of_supply, p_biz_state_code) != p_biz_state_code THEN CAST(item->>'total' AS numeric) * CAST(item->>'tax_rate' AS numeric) / 100 ELSE 0 END) as igst,
            SUM(CASE WHEN COALESCE(s.place_of_supply, p_biz_state_code) = p_biz_state_code THEN CAST(item->>'total' AS numeric) * CAST(item->>'tax_rate' AS numeric) / 200 ELSE 0 END) as cgst,
            SUM(CASE WHEN COALESCE(s.place_of_supply, p_biz_state_code) = p_biz_state_code THEN CAST(item->>'total' AS numeric) * CAST(item->>'tax_rate' AS numeric) / 200 ELSE 0 END) as sgst
        FROM sales s, jsonb_array_elements(s.items) as item
        WHERE s.user_id = p_user_id 
          AND s.date >= p_start_date AND s.date <= p_end_date
          AND s.status != 'draft'
        GROUP BY COALESCE(item->>'hsn_code', '0000'), CAST(item->>'tax_rate' AS numeric)
    ) hsn;

    -- 5. Summary (Table 3.1)
    SELECT row_to_json(s) INTO summary
    FROM (
        SELECT 
            COUNT(id) as total_invoices,
            SUM(COALESCE(subtotal, total_amount - tax_amount)) as total_taxable,
            SUM(tax_amount) as total_tax,
            SUM(total_amount) as total_value
        FROM sales
        WHERE user_id = p_user_id 
          AND date >= p_start_date AND date <= p_end_date
          AND status != 'draft'
    ) s;

    result := json_build_object(
        'b2b', b2b_records,
        'b2cl', b2cl_records,
        'b2cs', b2cs_records,
        'hsn', hsn_summary,
        'summary', summary
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;