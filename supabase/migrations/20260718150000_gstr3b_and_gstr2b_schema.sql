-- Migration: Add GSTR-3B & GSTR-2B specific fields to purchases table

ALTER TABLE IF EXISTS public.purchases 
ADD COLUMN IF NOT EXISTS vendor_gstin varchar(15),
ADD COLUMN IF NOT EXISTS place_of_supply char(2);

-- RPC for GSTR-2B Data (Input Tax Credit Details from registered vendors)
CREATE OR REPLACE FUNCTION generate_gstr2b_data(p_user_id UUID, p_start_date DATE, p_end_date DATE, p_biz_state_code CHAR(2))
RETURNS JSON AS $$
DECLARE
    result JSON;
    b2b_purchases JSON;
    summary JSON;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for GSTR-3B Data (Summary of Outward and Inward Supplies)
CREATE OR REPLACE FUNCTION generate_gstr3b_data(p_user_id UUID, p_start_date DATE, p_end_date DATE, p_biz_state_code CHAR(2))
RETURNS JSON AS $$
DECLARE
    result JSON;
    outward_summary JSON;
    inward_itc_summary JSON;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
