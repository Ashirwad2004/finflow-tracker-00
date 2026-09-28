-- Migration: 20260929000000_security_rpc_and_access_hardening.sql
-- Description: Enforce strict multi-tenant authorization in all SECURITY DEFINER RPC functions
--              (Invoices, Purchases, Inventory Adjustments, POS Shift Summary, POS Sales, POS Returns)
--              and revoke public/anon access.

-- =============================================================================
-- 1. Function: public.create_store_invoice (Hardened with Tenant Verification)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_store_invoice(
    p_store_id UUID,
    p_user_id UUID,
    p_party_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_customer_gstin TEXT,
    p_place_of_supply TEXT,
    p_date DATE,
    p_due_date DATE,
    p_items JSONB,
    p_overall_discount_percent NUMERIC,
    p_tax_rate NUMERIC,
    p_is_item_wise_tax BOOLEAN,
    p_round_off BOOLEAN,
    p_status TEXT,
    p_amount_paid NUMERIC,
    p_payment_method TEXT,
    p_notes TEXT,
    p_document_type TEXT,
    p_invoice_number_prefix TEXT,
    p_custom_invoice_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC;
    v_price NUMERIC;
    v_disc_pct NUMERIC;
    v_tax_pct NUMERIC;
    v_line_taxable NUMERIC;
    v_line_tax NUMERIC;
    v_line_total NUMERIC;
    v_subtotal NUMERIC := 0;
    v_overall_discount_amount NUMERIC := 0;
    v_taxable_subtotal NUMERIC := 0;
    v_total_tax NUMERIC := 0;
    v_raw_total NUMERIC := 0;
    v_grand_total NUMERIC := 0;
    v_amount_paid NUMERIC := 0;
    v_balance_due NUMERIC := 0;
    v_status TEXT := 'paid';
    v_invoice_number TEXT;
    v_sale_id UUID;
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_processed_items JSONB := '[]'::JSONB;
    v_discount_factor NUMERIC := 1;
    v_seq_num BIGINT;
    v_party_id UUID := p_party_id;
    v_customer_name TEXT;
BEGIN
    -- SECURITY CHECK: Enforce multi-tenant boundary
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Store ID is required for invoice creation';
    END IF;

    IF auth.role() != 'service_role' AND auth.uid() != p_store_id AND NOT EXISTS (
        SELECT 1 FROM public.store_salesmen sm
        WHERE sm.salesman_id = auth.uid() AND sm.store_id = p_store_id AND sm.is_active = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Caller is not authorized for store %', p_store_id;
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Invoice must contain at least one item.';
    END IF;

    v_customer_name := COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Cash Customer');

    -- Auto-resolve or create customer party
    IF v_party_id IS NULL AND v_customer_name != 'Cash Customer' THEN
        SELECT id INTO v_party_id 
        FROM public.parties 
        WHERE user_id = p_store_id AND LOWER(TRIM(name)) = LOWER(v_customer_name)
        LIMIT 1;

        IF v_party_id IS NULL THEN
            INSERT INTO public.parties (
                user_id, name, type, phone, email, gst_number, address, opening_balance, opening_balance_type
            ) VALUES (
                p_store_id, v_customer_name, 'customer',
                NULLIF(TRIM(p_customer_phone), ''),
                NULLIF(TRIM(p_customer_email), ''),
                NULLIF(TRIM(p_customer_gstin), ''),
                NULLIF(TRIM(p_place_of_supply), ''),
                0, 'to_receive'
            ) RETURNING id INTO v_party_id;
        END IF;
    END IF;

    -- Sequential invoice numbering
    IF p_custom_invoice_number IS NOT NULL AND TRIM(p_custom_invoice_number) != '' THEN
        v_invoice_number := TRIM(p_custom_invoice_number);
    ELSE
        SELECT COUNT(*) + 1 INTO v_seq_num 
        FROM public.sales 
        WHERE user_id = p_store_id AND document_type = COALESCE(p_document_type, 'invoice');
        
        v_invoice_number := COALESCE(p_invoice_number_prefix, 'INV-') || TO_CHAR(COALESCE(p_date, CURRENT_DATE), 'YYYYMMDD') || '-' || LPAD(v_seq_num::TEXT, 4, '0');
    END IF;

    v_overall_discount_amount := 0;
    v_discount_factor := 1 - (COALESCE(p_overall_discount_percent, 0) / 100.0);

    -- Process items, lock products FOR UPDATE, and calculate line totals
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.001);
        v_price := GREATEST(COALESCE((v_item->>'price')::NUMERIC, 0), 0);
        v_disc_pct := LEAST(GREATEST(COALESCE((v_item->>'discount')::NUMERIC, 0), 0), 100);

        IF COALESCE(p_is_item_wise_tax, false) THEN
            v_tax_pct := GREATEST(COALESCE((v_item->>'tax_rate')::NUMERIC, 0), 0);
        ELSE
            v_tax_pct := GREATEST(COALESCE(p_tax_rate, 0), 0);
        END IF;

        v_line_taxable := v_qty * v_price * (1 - (v_disc_pct / 100.0));
        v_line_tax := v_line_taxable * (v_tax_pct / 100.0);
        v_line_total := v_line_taxable + v_line_tax;

        v_subtotal := v_subtotal + (v_qty * v_price);
        v_total_tax := v_total_tax + v_line_tax;

        v_processed_items := v_processed_items || jsonb_build_array(jsonb_build_object(
            'product_id', v_item->>'product_id',
            'product_name', COALESCE(v_item->>'product_name', 'Item'),
            'quantity', v_qty,
            'unit_price', v_price,
            'discount', v_disc_pct,
            'tax_rate', v_tax_pct,
            'tax_amount', ROUND(v_line_tax, 2),
            'line_total', ROUND(v_line_total, 2)
        ));

        -- Deduct inventory with row lock if product_id is specified
        IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') != '' THEN
            BEGIN
                v_product_id := (v_item->>'product_id')::UUID;
                
                SELECT stock_quantity INTO v_current_stock
                FROM public.products
                WHERE id = v_product_id AND user_id = p_store_id
                FOR UPDATE;

                IF FOUND THEN
                    v_current_stock := COALESCE(v_current_stock, 0);
                    v_new_stock := v_current_stock - v_qty;

                    UPDATE public.products
                    SET stock_quantity = v_new_stock,
                        updated_at = now()
                    WHERE id = v_product_id;

                    INSERT INTO public.inventory_movements (
                        store_id, product_id, type, quantity,
                        previous_stock, resulting_stock,
                        reference_type, reference_id,
                        notes, created_by
                    ) VALUES (
                        p_store_id, v_product_id, 'sale', -v_qty,
                        v_current_stock, v_new_stock,
                        'invoice', NULL,
                        'Invoice: ' || v_invoice_number,
                        p_user_id
                    );
                END IF;
            EXCEPTION WHEN invalid_text_representation THEN
                -- non-UUID product
            END;
        END IF;
    END LOOP;

    IF COALESCE(p_overall_discount_percent, 0) > 0 THEN
        v_overall_discount_amount := ROUND((v_subtotal * (p_overall_discount_percent / 100.0)), 2);
    END IF;

    v_taxable_subtotal := v_subtotal - v_overall_discount_amount;
    v_raw_total := v_taxable_subtotal + v_total_tax;

    IF COALESCE(p_round_off, false) THEN
        v_grand_total := ROUND(v_raw_total);
    ELSE
        v_grand_total := ROUND(v_raw_total, 2);
    END IF;

    v_amount_paid := LEAST(GREATEST(COALESCE(p_amount_paid, 0), 0), v_grand_total);
    v_balance_due := GREATEST(v_grand_total - v_amount_paid, 0);

    IF v_balance_due = 0 THEN
        v_status := 'paid';
    ELSIF v_amount_paid > 0 THEN
        v_status := 'partial';
    ELSE
        v_status := COALESCE(p_status, 'unpaid');
    END IF;

    -- Authoritative sale record insertion
    INSERT INTO public.sales (
        user_id,
        party_id,
        invoice_number,
        customer_name,
        customer_phone,
        customer_email,
        customer_gstin,
        place_of_supply,
        date,
        due_date,
        items,
        subtotal,
        discount_percent,
        discount_amount,
        tax_amount,
        tax_rate,
        total_amount,
        amount_paid,
        balance_due,
        status,
        payment_method,
        notes,
        document_type
    ) VALUES (
        p_store_id,
        v_party_id,
        v_invoice_number,
        v_customer_name,
        NULLIF(TRIM(p_customer_phone), ''),
        NULLIF(TRIM(p_customer_email), ''),
        NULLIF(TRIM(p_customer_gstin), ''),
        NULLIF(TRIM(p_place_of_supply), ''),
        COALESCE(p_date, CURRENT_DATE),
        COALESCE(p_due_date, p_date, CURRENT_DATE),
        v_processed_items,
        ROUND(v_subtotal, 2),
        COALESCE(p_overall_discount_percent, 0),
        v_overall_discount_amount,
        ROUND(v_total_tax, 2),
        COALESCE(p_tax_rate, 0),
        v_grand_total,
        v_amount_paid,
        v_balance_due,
        v_status,
        COALESCE(p_payment_method, 'cash'),
        p_notes,
        COALESCE(p_document_type, 'invoice')
    ) RETURNING id INTO v_sale_id;

    -- Link movement records to sale_id
    UPDATE public.inventory_movements
    SET reference_id = v_sale_id
    WHERE store_id = p_store_id AND notes = ('Invoice: ' || v_invoice_number) AND reference_id IS NULL;

    -- Audit log
    INSERT INTO public.audit_logs (
        store_id, user_id, action, resource_type, resource_id, metadata
    ) VALUES (
        p_store_id, p_user_id, 'invoice_created', 'sales', v_sale_id,
        jsonb_build_object(
            'invoice_number', v_invoice_number,
            'total_amount', v_grand_total,
            'amount_paid', v_amount_paid,
            'status', v_status,
            'items_count', jsonb_array_length(v_processed_items)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', v_sale_id,
        'invoice_number', v_invoice_number,
        'party_id', v_party_id,
        'customer_name', v_customer_name,
        'subtotal', ROUND(v_subtotal, 2),
        'discount_amount', v_overall_discount_amount,
        'tax_amount', v_total_tax,
        'total_amount', v_grand_total,
        'amount_paid', v_amount_paid,
        'balance_due', v_balance_due,
        'status', v_status,
        'items', v_processed_items
    );
END;
$$;

-- =============================================================================
-- 2. Function: public.record_store_purchase (Hardened with Tenant Verification)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.record_store_purchase(
    p_store_id UUID,
    p_user_id UUID,
    p_party_id UUID,
    p_vendor_name TEXT,
    p_vendor_phone TEXT,
    p_vendor_email TEXT,
    p_vendor_gstin TEXT,
    p_place_of_supply TEXT,
    p_bill_number TEXT,
    p_date DATE,
    p_due_date DATE,
    p_items JSONB,
    p_discount_amount NUMERIC,
    p_tax_rate NUMERIC,
    p_status TEXT,
    p_amount_paid NUMERIC,
    p_notes TEXT,
    p_attachment_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC;
    v_rate NUMERIC;
    v_disc_pct NUMERIC;
    v_tax_pct NUMERIC;
    v_line_taxable NUMERIC;
    v_line_tax NUMERIC;
    v_line_total NUMERIC;
    v_subtotal NUMERIC := 0;
    v_total_tax NUMERIC := 0;
    v_grand_total NUMERIC := 0;
    v_amount_paid NUMERIC := 0;
    v_balance_due NUMERIC := 0;
    v_status TEXT := 'paid';
    v_purchase_id UUID;
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_processed_items JSONB := '[]'::JSONB;
    v_party_id UUID := p_party_id;
    v_vendor_name TEXT;
    v_item_desc TEXT;
BEGIN
    -- SECURITY CHECK: Enforce multi-tenant boundary
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Store ID is required for purchase entry';
    END IF;

    IF auth.role() != 'service_role' AND auth.uid() != p_store_id AND NOT EXISTS (
        SELECT 1 FROM public.store_salesmen sm
        WHERE sm.salesman_id = auth.uid() AND sm.store_id = p_store_id AND sm.is_active = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Caller is not authorized for store %', p_store_id;
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Purchase bill must contain at least one item.';
    END IF;

    v_vendor_name := COALESCE(NULLIF(TRIM(p_vendor_name), ''), 'Supplier');

    -- Auto-resolve or create vendor party
    IF v_party_id IS NULL AND v_vendor_name != 'Supplier' THEN
        SELECT id INTO v_party_id 
        FROM public.parties 
        WHERE user_id = p_store_id AND LOWER(TRIM(name)) = LOWER(v_vendor_name)
        LIMIT 1;

        IF v_party_id IS NULL THEN
            INSERT INTO public.parties (
                user_id, name, type, phone, email, gst_number, address, opening_balance, opening_balance_type
            ) VALUES (
                p_store_id, v_vendor_name, 'vendor',
                NULLIF(TRIM(p_vendor_phone), ''),
                NULLIF(TRIM(p_vendor_email), ''),
                NULLIF(TRIM(p_vendor_gstin), ''),
                NULLIF(TRIM(p_place_of_supply), ''),
                0, 'to_pay'
            ) RETURNING id INTO v_party_id;
        END IF;
    END IF;

    -- Process items, lock products FOR UPDATE, and increment stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.001);
        v_rate := GREATEST(COALESCE((v_item->>'rate')::NUMERIC, (v_item->>'purchase_price')::NUMERIC, 0), 0);
        v_disc_pct := LEAST(GREATEST(COALESCE((v_item->>'discount')::NUMERIC, 0), 0), 100);
        v_tax_pct := GREATEST(COALESCE((v_item->>'tax_rate')::NUMERIC, p_tax_rate, 0), 0);

        v_line_taxable := v_qty * v_rate * (1 - (v_disc_pct / 100.0));
        v_line_tax := v_line_taxable * (v_tax_pct / 100.0);
        v_line_total := v_line_taxable + v_line_tax;

        v_subtotal := v_subtotal + (v_qty * v_rate);
        v_total_tax := v_total_tax + v_line_tax;

        v_item_desc := COALESCE(v_item->>'description', v_item->>'item_name', v_item->>'product_name', 'Item');

        v_processed_items := v_processed_items || jsonb_build_array(jsonb_build_object(
            'product_id', v_item->>'product_id',
            'description', v_item_desc,
            'quantity', v_qty,
            'rate', v_rate,
            'discount', v_disc_pct,
            'tax_rate', v_tax_pct,
            'tax_amount', ROUND(v_line_tax, 2),
            'line_total', ROUND(v_line_total, 2)
        ));

        -- Increment stock with row lock if product_id is specified
        IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') != '' THEN
            BEGIN
                v_product_id := (v_item->>'product_id')::UUID;
                
                SELECT stock_quantity INTO v_current_stock
                FROM public.products
                WHERE id = v_product_id AND user_id = p_store_id
                FOR UPDATE;

                IF FOUND THEN
                    v_current_stock := COALESCE(v_current_stock, 0);
                    v_new_stock := v_current_stock + v_qty;

                    UPDATE public.products
                    SET stock_quantity = v_new_stock,
                        purchase_price = CASE WHEN v_rate > 0 THEN v_rate ELSE purchase_price END,
                        updated_at = now()
                    WHERE id = v_product_id;

                    INSERT INTO public.inventory_movements (
                        store_id, product_id, type, quantity,
                        previous_stock, resulting_stock,
                        reference_type, reference_id,
                        notes, created_by
                    ) VALUES (
                        p_store_id, v_product_id, 'purchase', v_qty,
                        v_current_stock, v_new_stock,
                        'purchase_bill', NULL,
                        'Purchase Bill: ' || COALESCE(p_bill_number, 'DIRECT'),
                        p_user_id
                    );
                END IF;
            EXCEPTION WHEN invalid_text_representation THEN
                -- non-UUID product
            END;
        END IF;
    END LOOP;

    v_grand_total := ROUND(GREATEST(v_subtotal - COALESCE(p_discount_amount, 0) + v_total_tax, 0), 2);
    v_amount_paid := LEAST(GREATEST(COALESCE(p_amount_paid, 0), 0), v_grand_total);
    v_balance_due := GREATEST(v_grand_total - v_amount_paid, 0);

    IF v_balance_due = 0 THEN
        v_status := 'paid';
    ELSIF v_amount_paid > 0 THEN
        v_status := 'partial';
    ELSE
        v_status := COALESCE(p_status, 'unpaid');
    END IF;

    -- Authoritative purchase insertion
    INSERT INTO public.purchases (
        user_id,
        party_id,
        bill_number,
        vendor_name,
        vendor_phone,
        vendor_email,
        vendor_gstin,
        place_of_supply,
        date,
        due_date,
        items,
        subtotal,
        discount_amount,
        tax_amount,
        tax_rate,
        total_amount,
        amount_paid,
        balance_due,
        status,
        notes,
        attachment_url
    ) VALUES (
        p_store_id,
        v_party_id,
        COALESCE(p_bill_number, 'BILL-' || TO_CHAR(now(), 'YYYYMMDD-HH24MI')),
        v_vendor_name,
        NULLIF(TRIM(p_vendor_phone), ''),
        NULLIF(TRIM(p_vendor_email), ''),
        NULLIF(TRIM(p_vendor_gstin), ''),
        NULLIF(TRIM(p_place_of_supply), ''),
        COALESCE(p_date, CURRENT_DATE),
        COALESCE(p_due_date, p_date, CURRENT_DATE),
        v_processed_items,
        ROUND(v_subtotal, 2),
        COALESCE(p_discount_amount, 0),
        ROUND(v_total_tax, 2),
        COALESCE(p_tax_rate, 0),
        v_grand_total,
        v_amount_paid,
        v_balance_due,
        v_status,
        p_notes,
        p_attachment_url
    ) RETURNING id INTO v_purchase_id;

    -- Link movement records to purchase_id
    UPDATE public.inventory_movements
    SET reference_id = v_purchase_id
    WHERE store_id = p_store_id 
      AND notes = ('Purchase Bill: ' || COALESCE(p_bill_number, 'DIRECT')) 
      AND reference_id IS NULL;

    -- Audit log
    INSERT INTO public.audit_logs (
        store_id, user_id, action, resource_type, resource_id, metadata
    ) VALUES (
        p_store_id, p_user_id, 'purchase_recorded', 'purchases', v_purchase_id,
        jsonb_build_object(
            'bill_number', p_bill_number,
            'vendor_name', v_vendor_name,
            'total_amount', v_grand_total,
            'status', v_status
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', v_purchase_id,
        'bill_number', COALESCE(p_bill_number, 'BILL-' || TO_CHAR(now(), 'YYYYMMDD-HH24MI')),
        'party_id', v_party_id,
        'vendor_name', v_vendor_name,
        'subtotal', ROUND(v_subtotal, 2),
        'tax_amount', v_total_tax,
        'total_amount', v_grand_total,
        'amount_paid', v_amount_paid,
        'balance_due', v_balance_due,
        'status', v_status,
        'items', v_processed_items
    );
END;
$$;

-- =============================================================================
-- 3. Function: public.adjust_store_inventory (Hardened with Tenant Verification)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.adjust_store_inventory(
    p_store_id UUID,
    p_user_id UUID,
    p_product_id UUID,
    p_adjustment_type TEXT,
    p_quantity NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_delta NUMERIC;
    v_prod_name TEXT;
BEGIN
    -- SECURITY CHECK: Enforce multi-tenant boundary
    IF p_store_id IS NULL OR p_product_id IS NULL THEN
        RAISE EXCEPTION 'Store ID and Product ID are required.';
    END IF;

    IF auth.role() != 'service_role' AND auth.uid() != p_store_id AND NOT EXISTS (
        SELECT 1 FROM public.store_salesmen sm
        WHERE sm.salesman_id = auth.uid() AND sm.store_id = p_store_id AND sm.is_active = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Caller is not authorized for store %', p_store_id;
    END IF;

    SELECT stock_quantity, name INTO v_current_stock, v_prod_name
    FROM public.products
    WHERE id = p_product_id AND user_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or unauthorized.';
    END IF;

    v_current_stock := COALESCE(v_current_stock, 0);

    IF p_adjustment_type = 'addition' THEN
        v_delta := p_quantity;
        v_new_stock := v_current_stock + p_quantity;
    ELSIF p_adjustment_type = 'deduction' OR p_adjustment_type = 'damage' THEN
        v_delta := -p_quantity;
        v_new_stock := v_current_stock - p_quantity;
    ELSIF p_adjustment_type = 'set_exact' THEN
        v_delta := p_quantity - v_current_stock;
        v_new_stock := p_quantity;
    ELSE
        RAISE EXCEPTION 'Invalid adjustment type: %', p_adjustment_type;
    END IF;

    UPDATE public.products
    SET stock_quantity = v_new_stock,
        updated_at = now()
    WHERE id = p_product_id;

    INSERT INTO public.inventory_movements (
        store_id, product_id, type, quantity,
        previous_stock, resulting_stock,
        reference_type, reference_id,
        notes, created_by
    ) VALUES (
        p_store_id, p_product_id, 
        CASE WHEN p_adjustment_type = 'damage' THEN 'damage' ELSE 'adjustment' END,
        v_delta,
        v_current_stock, v_new_stock,
        'manual_adjustment', NULL,
        COALESCE(p_notes, 'Manual stock adjustment'),
        p_user_id
    );

    INSERT INTO public.audit_logs (
        store_id, user_id, action, resource_type, resource_id, metadata
    ) VALUES (
        p_store_id, p_user_id, 'inventory_adjusted', 'products', p_product_id,
        jsonb_build_object(
            'product_name', v_prod_name,
            'previous_stock', v_current_stock,
            'new_stock', v_new_stock,
            'delta', v_delta,
            'type', p_adjustment_type
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'name', v_prod_name,
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock,
        'delta', v_delta
    );
END;
$$;

-- =============================================================================
-- 4. Function: public.pos_get_shift_summary (Hardened with Shift Ownership Check)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.pos_get_shift_summary(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shift RECORD;
    v_cash_sales NUMERIC := 0;
    v_cash_in NUMERIC := 0;
    v_cash_out NUMERIC := 0;
    v_cash_refunds NUMERIC := 0;
    v_computed_expected NUMERIC := 0;
    v_total_bills INTEGER := 0;
BEGIN
    SELECT * INTO v_shift FROM public.pos_shifts WHERE id = p_shift_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'POS Shift not found';
    END IF;

    -- SECURITY CHECK: Caller must be service_role, store owner, or cashier/salesman of that store
    IF auth.role() != 'service_role' AND auth.uid() != v_shift.store_id AND auth.uid() != v_shift.cashier_id AND NOT EXISTS (
        SELECT 1 FROM public.store_salesmen sm
        WHERE sm.salesman_id = auth.uid() AND sm.store_id = v_shift.store_id AND sm.is_active = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Caller is not authorized to view shift %', p_shift_id;
    END IF;

    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN s.payment_method = 'cash' THEN s.amount_paid
                ELSE 0
            END
        ), 0),
        COUNT(*)
    INTO v_cash_sales, v_total_bills
    FROM public.sales s
    WHERE s.pos_shift_id = p_shift_id
      AND s.document_type = 'invoice';

    SELECT 
        COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0)
    INTO v_cash_in, v_cash_out
    FROM public.pos_cash_movements
    WHERE shift_id = p_shift_id;

    SELECT COALESCE(SUM(total_refund_amount), 0)
    INTO v_cash_refunds
    FROM public.pos_returns
    WHERE shift_id = p_shift_id AND refund_method = 'cash';

    v_computed_expected := v_shift.opening_cash + v_cash_sales + v_cash_in - v_cash_refunds - v_cash_out;

    RETURN jsonb_build_object(
        'shift_id', p_shift_id,
        'opening_cash', v_shift.opening_cash,
        'expected_cash', v_computed_expected,
        'total_sales', v_cash_sales,
        'cash_sales', v_cash_sales,
        'sales_count', v_total_bills,
        'cash_in', v_cash_in,
        'cash_out', v_cash_out,
        'cash_refunds', v_cash_refunds
    );
END;
$$;

-- =============================================================================
-- 5. Function: public.pos_complete_sale (Hardened with Tenant Verification)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.pos_complete_sale(
    p_store_id UUID,
    p_cashier_id UUID,
    p_terminal_id UUID,
    p_shift_id UUID,
    p_idempotency_key TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_party_id UUID,
    p_items JSONB,
    p_discount_amount NUMERIC,
    p_payment_method TEXT,
    p_amount_paid NUMERIC,
    p_notes TEXT,
    p_offline_invoice_number TEXT,
    p_is_offline_sync BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_sale RECORD;
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC;
    v_price NUMERIC;
    v_disc NUMERIC;
    v_tax_rate NUMERIC;
    v_line_taxable NUMERIC;
    v_line_tax NUMERIC;
    v_line_total NUMERIC;
    v_subtotal NUMERIC := 0;
    v_tax_amount NUMERIC := 0;
    v_total_amount NUMERIC := 0;
    v_balance_due NUMERIC := 0;
    v_status TEXT := 'paid';
    v_invoice_number TEXT;
    v_sale_id UUID;
    v_db_stock INTEGER;
    v_db_product_name TEXT;
    v_party_id UUID := p_party_id;
    v_processed_items JSONB := '[]'::JSONB;
    v_seq_num INTEGER;
BEGIN
    -- SECURITY CHECK: Enforce multi-tenant boundary
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Store ID is required for POS sale';
    END IF;

    IF auth.role() != 'service_role' AND auth.uid() != p_store_id AND auth.uid() != p_cashier_id AND NOT EXISTS (
        SELECT 1 FROM public.store_salesmen sm
        WHERE sm.salesman_id = auth.uid() AND sm.store_id = p_store_id AND sm.is_active = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Caller is not authorized for store %', p_store_id;
    END IF;

    IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
        SELECT * INTO v_existing_sale 
        FROM public.sales 
        WHERE user_id = p_store_id AND idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'sale', row_to_json(v_existing_sale),
                'is_duplicate', true
            );
        END IF;
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cart cannot be empty.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.001);
        v_price := COALESCE((v_item->>'price')::NUMERIC, 0);
        v_disc := COALESCE((v_item->>'discount')::NUMERIC, 0);
        v_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 0);

        v_line_taxable := v_qty * v_price * (1 - (v_disc / 100));
        v_line_tax := (v_line_taxable * v_tax_rate) / 100;
        v_line_total := v_line_taxable + v_line_tax;

        v_subtotal := v_subtotal + (v_qty * v_price);
        v_tax_amount := v_tax_amount + v_line_tax;

        IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') != '' THEN
            BEGIN
                v_product_id := (v_item->>'product_id')::UUID;
                
                SELECT stock_quantity, name INTO v_db_stock, v_db_product_name
                FROM public.products
                WHERE id = v_product_id AND user_id = p_store_id
                FOR UPDATE;

                IF FOUND THEN
                    IF v_db_stock < v_qty THEN
                        INSERT INTO public.inventory_discrepancies (
                            store_id,
                            product_id,
                            expected_stock,
                            deducted_quantity,
                            resulting_stock,
                            source
                        ) VALUES (
                            p_store_id,
                            v_product_id,
                            v_db_stock,
                            v_qty,
                            v_db_stock - v_qty::INTEGER,
                            'pos_checkout'
                        );
                    END IF;

                    UPDATE public.products
                    SET stock_quantity = stock_quantity - v_qty::INTEGER,
                        updated_at = now()
                    WHERE id = v_product_id AND user_id = p_store_id;
                END IF;
            EXCEPTION WHEN invalid_text_representation THEN
                -- non-UUID product
            END;
        END IF;

        v_processed_items := v_processed_items || jsonb_build_array(jsonb_build_object(
            'product_id', v_item->>'product_id',
            'product_name', COALESCE(v_item->>'name', v_item->>'product_name', 'Item'),
            'quantity', v_qty,
            'unit_price', v_price,
            'discount', v_disc,
            'tax_rate', v_tax_rate,
            'tax_amount', v_line_tax,
            'line_total', v_line_total
        ));
    END LOOP;

    v_total_amount := ROUND((v_subtotal - COALESCE(p_discount_amount, 0) + v_tax_amount), 2);
    v_balance_due := GREATEST(0, v_total_amount - COALESCE(p_amount_paid, v_total_amount));
    
    IF v_balance_due > 0 THEN
        v_status := 'partial';
    ELSE
        v_status := 'paid';
    END IF;

    IF p_offline_invoice_number IS NOT NULL AND p_offline_invoice_number != '' THEN
        v_invoice_number := p_offline_invoice_number;
    ELSE
        SELECT COUNT(*) + 1 INTO v_seq_num FROM public.sales WHERE user_id = p_store_id;
        v_invoice_number := 'POS-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(v_seq_num::TEXT, 4, '0');
    END IF;

    INSERT INTO public.sales (
        user_id,
        party_id,
        invoice_number,
        customer_name,
        customer_phone,
        date,
        items,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        amount_paid,
        balance_due,
        status,
        payment_method,
        notes,
        document_type,
        idempotency_key,
        pos_shift_id,
        pos_terminal_id,
        cashier_id
    ) VALUES (
        p_store_id,
        v_party_id,
        v_invoice_number,
        COALESCE(p_customer_name, 'Walk-in Customer'),
        p_customer_phone,
        CURRENT_DATE,
        v_processed_items,
        v_subtotal,
        COALESCE(p_discount_amount, 0),
        v_tax_amount,
        v_total_amount,
        COALESCE(p_amount_paid, v_total_amount),
        v_balance_due,
        v_status,
        COALESCE(p_payment_method, 'cash'),
        p_notes,
        'invoice',
        p_idempotency_key,
        p_shift_id,
        p_terminal_id,
        p_cashier_id
    ) RETURNING id INTO v_sale_id;

    IF p_shift_id IS NOT NULL AND p_payment_method = 'cash' THEN
        UPDATE public.pos_shifts
        SET expected_cash = expected_cash + COALESCE(p_amount_paid, v_total_amount)
        WHERE id = p_shift_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'invoice_number', v_invoice_number,
        'total_amount', v_total_amount,
        'balance_due', v_balance_due,
        'is_duplicate', false
    );
END;
$$;

-- =============================================================================
-- 6. Function: public.pos_process_return (Hardened with Tenant Verification)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.pos_process_return(
    p_store_id UUID,
    p_cashier_id UUID,
    p_sale_id UUID,
    p_shift_id UUID,
    p_return_items JSONB,
    p_refund_method TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_orig_sale RECORD;
    v_item JSONB;
    v_return_id UUID;
    v_credit_note_id UUID;
    v_return_number TEXT;
    v_seq_num INTEGER;
    v_total_refund NUMERIC := 0;
    v_total_tax NUMERIC := 0;
    v_product_id UUID;
    v_qty NUMERIC;
    v_unit_price NUMERIC;
    v_tax_rate NUMERIC;
    v_line_tax NUMERIC;
    v_line_refund NUMERIC;
    v_credit_note_items JSONB := '[]'::JSONB;
BEGIN
    -- SECURITY CHECK: Enforce multi-tenant boundary
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Store ID is required for return processing';
    END IF;

    IF auth.role() != 'service_role' AND auth.uid() != p_store_id AND auth.uid() != p_cashier_id AND NOT EXISTS (
        SELECT 1 FROM public.store_salesmen sm
        WHERE sm.salesman_id = auth.uid() AND sm.store_id = p_store_id AND sm.is_active = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Caller is not authorized for store %', p_store_id;
    END IF;

    SELECT * INTO v_orig_sale 
    FROM public.sales 
    WHERE id = p_sale_id AND user_id = p_store_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Original sale not found.';
    END IF;

    IF p_return_items IS NULL OR jsonb_array_length(p_return_items) = 0 THEN
        RAISE EXCEPTION 'Return items cannot be empty.';
    END IF;

    SELECT COUNT(*) + 1 INTO v_seq_num FROM public.pos_returns WHERE store_id = p_store_id;
    v_return_number := 'RET-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(v_seq_num::TEXT, 4, '0');

    INSERT INTO public.pos_returns (
        store_id,
        sale_id,
        return_number,
        shift_id,
        cashier_id,
        total_refund_amount,
        refund_method,
        reason
    ) VALUES (
        p_store_id,
        p_sale_id,
        v_return_number,
        p_shift_id,
        p_cashier_id,
        0,
        p_refund_method,
        p_reason
    ) RETURNING id INTO v_return_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items)
    LOOP
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.001);
        v_unit_price := COALESCE((v_item->>'unit_price')::NUMERIC, 0);
        v_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 0);
        v_line_tax := ROUND((v_qty * v_unit_price * (v_tax_rate / 100)), 2);
        v_line_refund := ROUND((v_qty * v_unit_price) + v_line_tax, 2);

        v_total_refund := v_total_refund + v_line_refund;
        v_total_tax := v_total_tax + v_line_tax;

        INSERT INTO public.pos_return_items (
            return_id,
            original_sale_item_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            tax_rate,
            tax_amount,
            refund_amount,
            restock_inventory
        ) VALUES (
            v_return_id,
            v_item->>'original_sale_item_id',
            CASE WHEN (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') != '' THEN (v_item->>'product_id')::UUID ELSE NULL END,
            COALESCE(v_item->>'product_name', 'Returned Item'),
            v_qty,
            v_unit_price,
            v_tax_rate,
            v_line_tax,
            v_line_refund,
            COALESCE((v_item->>'restock_inventory')::BOOLEAN, true)
        );

        IF COALESCE((v_item->>'restock_inventory')::BOOLEAN, true) AND (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') != '' THEN
            BEGIN
                v_product_id := (v_item->>'product_id')::UUID;
                UPDATE public.products
                SET stock_quantity = stock_quantity + v_qty::INTEGER,
                    updated_at = now()
                WHERE id = v_product_id AND user_id = p_store_id;
            EXCEPTION WHEN invalid_text_representation THEN
                -- non-UUID product
            END;
        END IF;

        v_credit_note_items := v_credit_note_items || jsonb_build_array(jsonb_build_object(
            'product_id', v_item->>'product_id',
            'name', COALESCE(v_item->>'product_name', 'Returned Item'),
            'description', 'Return: ' || COALESCE(v_item->>'product_name', 'Item'),
            'quantity', v_qty,
            'price', v_unit_price,
            'tax_rate', v_tax_rate,
            'tax_amount', v_line_tax,
            'total', v_line_refund
        ));
    END LOOP;

    UPDATE public.pos_returns
    SET total_refund_amount = v_total_refund
    WHERE id = v_return_id;

    INSERT INTO public.sales (
        user_id,
        party_id,
        invoice_number,
        customer_name,
        customer_phone,
        date,
        items,
        subtotal,
        tax_amount,
        total_amount,
        amount_paid,
        balance_due,
        status,
        payment_method,
        notes,
        document_type,
        parent_sale_id,
        pos_return_id,
        pos_shift_id
    ) VALUES (
        p_store_id,
        v_orig_sale.party_id,
        'CN-' || v_return_number,
        v_orig_sale.customer_name,
        v_orig_sale.customer_phone,
        CURRENT_DATE,
        v_credit_note_items,
        ROUND(v_total_refund - v_total_tax, 2),
        ROUND(v_total_tax, 2),
        v_total_refund,
        v_total_refund,
        0,
        'paid',
        p_refund_method,
        'Credit Note for Return ' || v_return_number || ' against Invoice ' || v_orig_sale.invoice_number,
        'credit_note',
        p_sale_id,
        v_return_id,
        p_shift_id
    ) RETURNING id INTO v_credit_note_id;

    UPDATE public.pos_returns
    SET credit_note_sale_id = v_credit_note_id
    WHERE id = v_return_id;

    IF v_orig_sale.balance_due > 0 THEN
        UPDATE public.sales
        SET balance_due = GREATEST(0, balance_due - v_total_refund),
            status = CASE WHEN (balance_due - v_total_refund) <= 0 THEN 'paid' ELSE status END
        WHERE id = p_sale_id;
    END IF;

    IF p_shift_id IS NOT NULL AND p_refund_method = 'cash' THEN
        UPDATE public.pos_shifts
        SET expected_cash = expected_cash - v_total_refund
        WHERE id = p_shift_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'return_id', v_return_id,
        'return_number', v_return_number,
        'credit_note_id', v_credit_note_id,
        'total_refund_amount', v_total_refund
    );
END;
$$;

-- =============================================================================
-- 7. Revoke execution from public/anon and grant strictly to authenticated and service_role
-- =============================================================================
REVOKE ALL ON FUNCTION public.create_store_invoice(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, JSONB, NUMERIC, NUMERIC, BOOLEAN, BOOLEAN, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_store_invoice(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, JSONB, NUMERIC, NUMERIC, BOOLEAN, BOOLEAN, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_store_purchase(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, JSONB, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_store_purchase(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, JSONB, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.adjust_store_inventory(UUID, UUID, UUID, TEXT, NUMERIC, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.adjust_store_inventory(UUID, UUID, UUID, TEXT, NUMERIC, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.pos_get_shift_summary(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pos_get_shift_summary(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.pos_complete_sale(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID, JSONB, NUMERIC, TEXT, NUMERIC, TEXT, TEXT, BOOLEAN) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pos_complete_sale(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID, JSONB, NUMERIC, TEXT, NUMERIC, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.pos_process_return(UUID, UUID, UUID, UUID, JSONB, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pos_process_return(UUID, UUID, UUID, UUID, JSONB, TEXT, TEXT) TO authenticated, service_role;
