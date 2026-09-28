-- Migration: 20260928000000_saas_authoritative_backend_separation.sql
-- Description: Complete Frontend/Backend Separation Schema, Inventory Movements,
--              Audit Logging, and Authoritative Invoicing / Purchases / Payments RPCs

-- =============================================================================
-- 1. Table: public.inventory_movements
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'adjustment', 'return', 'damage', 'audit')),
    quantity NUMERIC NOT NULL,
    previous_stock NUMERIC NOT NULL DEFAULT 0,
    resulting_stock NUMERIC NOT NULL DEFAULT 0,
    reference_type TEXT CHECK (reference_type IN ('invoice', 'purchase_bill', 'pos_sale', 'manual_adjustment', 'sales_return', 'online_order')),
    reference_id UUID,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_product 
    ON public.inventory_movements(store_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref 
    ON public.inventory_movements(reference_type, reference_id);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own store inventory movements" ON public.inventory_movements;
CREATE POLICY "Users can view own store inventory movements" ON public.inventory_movements
    FOR SELECT USING (
        store_id = (SELECT auth.uid()) OR 
        created_by = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.store_salesmen sm
            WHERE sm.salesman_id = (SELECT auth.uid()) AND sm.store_id = inventory_movements.store_id
        )
    );

DROP POLICY IF EXISTS "Users can insert own store inventory movements" ON public.inventory_movements;
CREATE POLICY "Users can insert own store inventory movements" ON public.inventory_movements
    FOR INSERT WITH CHECK (
        store_id = (SELECT auth.uid()) OR 
        created_by = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.store_salesmen sm
            WHERE sm.salesman_id = (SELECT auth.uid()) AND sm.store_id = inventory_movements.store_id
        )
    );

-- =============================================================================
-- 2. Table: public.audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    user_id UUID,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_store_created 
    ON public.audit_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
    ON public.audit_logs(resource_type, resource_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (
        store_id = (SELECT auth.uid()) OR 
        user_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        store_id = (SELECT auth.uid()) OR 
        user_id = (SELECT auth.uid())
    );

-- =============================================================================
-- 3. Atomic Function: create_store_invoice
-- Authoritatively calculates invoice line totals, taxes, discounts, grand totals,
-- locks product rows FOR UPDATE, deducts stock, creates movement records,
-- and generates sequential invoice number.
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
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Store ID is required for invoice creation';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Invoice must contain at least one item.';
    END IF;

    v_customer_name := COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Cash Customer');

    -- Auto-resolve party if party_id is missing but customer name is provided
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
                NULLIF(UPPER(TRIM(p_customer_gstin)), ''),
                NULLIF(TRIM(p_place_of_supply), ''),
                0, 'to_receive'
            ) RETURNING id INTO v_party_id;
        END IF;
    END IF;

    -- Pass 1: Compute subtotal
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.001);
        v_price := GREATEST(COALESCE((v_item->>'price')::NUMERIC, 0), 0);
        v_disc_pct := LEAST(GREATEST(COALESCE((v_item->>'discount')::NUMERIC, 0), 0), 100);
        v_line_taxable := v_qty * v_price * (1.0 - (v_disc_pct / 100.0));
        v_subtotal := v_subtotal + v_line_taxable;
    END LOOP;

    -- Apply overall discount
    v_overall_discount_amount := ROUND((v_subtotal * LEAST(GREATEST(COALESCE(p_overall_discount_percent, 0), 0), 100)) / 100.0, 2);
    v_taxable_subtotal := GREATEST(0, v_subtotal - v_overall_discount_amount);
    
    IF v_subtotal > 0 THEN
        v_discount_factor := v_taxable_subtotal / v_subtotal;
    ELSE
        v_discount_factor := 1;
    END IF;

    -- Pass 2: Authoritative item taxes and stock deduction
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.001);
        v_price := GREATEST(COALESCE((v_item->>'price')::NUMERIC, 0), 0);
        v_disc_pct := LEAST(GREATEST(COALESCE((v_item->>'discount')::NUMERIC, 0), 0), 100);
        
        IF p_is_item_wise_tax THEN
            v_tax_pct := GREATEST(COALESCE((v_item->>'tax_rate')::NUMERIC, p_tax_rate, 0), 0);
        ELSE
            v_tax_pct := GREATEST(COALESCE(p_tax_rate, 0), 0);
        END IF;

        v_line_taxable := (v_qty * v_price * (1.0 - (v_disc_pct / 100.0))) * v_discount_factor;
        v_line_tax := ROUND((v_line_taxable * v_tax_pct) / 100.0, 2);
        v_line_total := ROUND(v_line_taxable + v_line_tax, 2);
        v_total_tax := v_total_tax + v_line_tax;

        -- Stock deduction with row-level lock
        IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') != '' THEN
            BEGIN
                v_product_id := (v_item->>'product_id')::UUID;
                SELECT stock_quantity INTO v_current_stock
                FROM public.products
                WHERE id = v_product_id AND user_id = p_store_id
                FOR UPDATE;

                IF FOUND THEN
                    v_new_stock := COALESCE(v_current_stock, 0) - v_qty;
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
                        COALESCE(v_current_stock, 0), v_new_stock,
                        'invoice', NULL,
                        'Invoice line deduction: ' || COALESCE(v_item->>'description', v_item->>'name', 'Item'),
                        p_user_id
                    );
                END IF;
            EXCEPTION WHEN invalid_text_representation THEN
                v_product_id := NULL;
            END;
        END IF;

        v_processed_items := v_processed_items || jsonb_build_array(jsonb_build_object(
            'id', COALESCE(v_item->>'id', gen_random_uuid()::TEXT),
            'product_id', v_item->>'product_id',
            'name', COALESCE(v_item->>'name', v_item->>'description', 'Item'),
            'description', COALESCE(v_item->>'description', v_item->>'name', 'Item'),
            'quantity', v_qty,
            'price', v_price,
            'discount', v_disc_pct,
            'tax_rate', v_tax_pct,
            'tax_amount', v_line_tax,
            'total', v_line_total,
            'unit', COALESCE(v_item->>'unit', 'pc'),
            'hsn_code', COALESCE(v_item->>'hsn_code', '')
        ));
    END LOOP;

    v_raw_total := v_taxable_subtotal + v_total_tax;
    IF p_round_off THEN
        v_grand_total := ROUND(v_raw_total);
    ELSE
        v_grand_total := ROUND(v_raw_total, 2);
    END IF;

    -- Authoritative Payment and Balance Calculation
    IF p_status = 'paid' THEN
        v_amount_paid := v_grand_total;
        v_balance_due := 0;
        v_status := 'paid';
    ELSIF p_status = 'partial' THEN
        v_amount_paid := LEAST(GREATEST(COALESCE(p_amount_paid, 0), 0), v_grand_total);
        v_balance_due := ROUND(v_grand_total - v_amount_paid, 2);
        IF v_balance_due <= 0 AND v_grand_total > 0 THEN
            v_status := 'paid';
        ELSIF v_amount_paid <= 0 THEN
            v_status := 'pending';
            v_balance_due := v_grand_total;
        ELSE
            v_status := 'partial';
        END IF;
    ELSE
        v_amount_paid := 0;
        v_balance_due := v_grand_total;
        v_status := 'pending';
    END IF;

    -- Sequential Unique Invoice Numbering
    IF p_custom_invoice_number IS NOT NULL AND TRIM(p_custom_invoice_number) != '' THEN
        v_invoice_number := TRIM(p_custom_invoice_number);
    ELSE
        SELECT COUNT(*) + 1 INTO v_seq_num
        FROM public.sales
        WHERE user_id = p_store_id;

        v_invoice_number := COALESCE(p_invoice_number_prefix, 'INV-') || LPAD(v_seq_num::TEXT, 4, '0');
        
        -- Collision guarantee
        WHILE EXISTS (SELECT 1 FROM public.sales WHERE user_id = p_store_id AND invoice_number = v_invoice_number) LOOP
            v_seq_num := v_seq_num + 1;
            v_invoice_number := COALESCE(p_invoice_number_prefix, 'INV-') || LPAD(v_seq_num::TEXT, 4, '0');
        END LOOP;
    END IF;

    -- Insert authoritative sale
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
        discount_amount,
        tax_rate,
        tax_amount,
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
        NULLIF(UPPER(TRIM(p_customer_gstin)), ''),
        NULLIF(TRIM(p_place_of_supply), ''),
        COALESCE(p_date, CURRENT_DATE),
        p_due_date,
        v_processed_items,
        ROUND(v_subtotal, 2),
        v_overall_discount_amount,
        COALESCE(p_tax_rate, 0),
        v_total_tax,
        v_grand_total,
        v_amount_paid,
        v_balance_due,
        v_status,
        p_payment_method,
        p_notes,
        COALESCE(p_document_type, 'invoice')
    ) RETURNING id INTO v_sale_id;

    -- Update inventory movements reference_id to created sale
    UPDATE public.inventory_movements
    SET reference_id = v_sale_id
    WHERE store_id = p_store_id AND reference_id IS NULL AND reference_type = 'invoice'
      AND created_at >= (now() - INTERVAL '5 seconds');

    -- Audit Log
    INSERT INTO public.audit_logs (
        store_id, user_id, action, resource_type, resource_id, metadata
    ) VALUES (
        p_store_id, p_user_id, 'invoice_created', 'sales', v_sale_id,
        jsonb_build_object(
            'invoice_number', v_invoice_number,
            'total_amount', v_grand_total,
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
-- 4. Atomic Function: record_store_purchase
-- Authoritatively records a supplier purchase, computes line totals and tax,
-- increments inventory stock with row lock FOR UPDATE, and logs movement.
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
    v_item_discounts NUMERIC := 0;
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
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Store ID is required for purchase entry';
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
                NULLIF(UPPER(TRIM(p_vendor_gstin)), ''),
                NULLIF(TRIM(p_place_of_supply), ''),
                0, 'to_pay'
            ) RETURNING id INTO v_party_id;
        END IF;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.001);
        v_rate := GREATEST(COALESCE((v_item->>'price')::NUMERIC, 0), 0);
        v_disc_pct := LEAST(GREATEST(COALESCE((v_item->>'discount')::NUMERIC, 0), 0), 100);
        v_tax_pct := GREATEST(COALESCE((v_item->>'tax_rate')::NUMERIC, p_tax_rate, 0), 0);

        v_line_taxable := v_qty * v_rate * (1.0 - (v_disc_pct / 100.0));
        v_line_tax := ROUND((v_line_taxable * v_tax_pct) / 100.0, 2);
        v_line_total := ROUND(v_line_taxable + v_line_tax, 2);

        v_subtotal := v_subtotal + (v_qty * v_rate);
        v_item_discounts := v_item_discounts + ((v_qty * v_rate * v_disc_pct) / 100.0);
        v_total_tax := v_total_tax + v_line_tax;

        v_item_desc := TRIM(COALESCE(v_item->>'description', v_item->>'name', 'Item'));

        -- Look up or update product stock with row lock
        v_product_id := NULL;
        IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') != '' THEN
            BEGIN
                v_product_id := (v_item->>'product_id')::UUID;
            EXCEPTION WHEN invalid_text_representation THEN
                v_product_id := NULL;
            END;
        END IF;

        IF v_product_id IS NULL AND v_item_desc != '' THEN
            SELECT id INTO v_product_id
            FROM public.products
            WHERE user_id = p_store_id AND LOWER(TRIM(name)) = LOWER(v_item_desc)
            LIMIT 1;
        END IF;

        IF v_product_id IS NOT NULL THEN
            SELECT stock_quantity INTO v_current_stock
            FROM public.products
            WHERE id = v_product_id AND user_id = p_store_id
            FOR UPDATE;

            IF FOUND THEN
                v_new_stock := COALESCE(v_current_stock, 0) + v_qty;
                UPDATE public.products
                SET stock_quantity = v_new_stock,
                    cost_price = v_rate,
                    updated_at = now()
                WHERE id = v_product_id;

                INSERT INTO public.inventory_movements (
                    store_id, product_id, type, quantity,
                    previous_stock, resulting_stock,
                    reference_type, reference_id,
                    notes, created_by
                ) VALUES (
                    p_store_id, v_product_id, 'purchase', v_qty,
                    COALESCE(v_current_stock, 0), v_new_stock,
                    'purchase_bill', NULL,
                    'Purchase restock: ' || v_item_desc,
                    p_user_id
                );
            END IF;
        ELSE
            -- Auto-register new product into catalog
            INSERT INTO public.products (
                user_id, name, price, cost_price, stock_quantity, unit
            ) VALUES (
                p_store_id, v_item_desc, v_rate, v_rate, v_qty, COALESCE(v_item->>'unit', 'pc')
            ) RETURNING id INTO v_product_id;

            INSERT INTO public.inventory_movements (
                store_id, product_id, type, quantity,
                previous_stock, resulting_stock,
                reference_type, reference_id,
                notes, created_by
            ) VALUES (
                p_store_id, v_product_id, 'purchase', v_qty,
                0, v_qty,
                'purchase_bill', NULL,
                'Initial purchase creation: ' || v_item_desc,
                p_user_id
            );
        END IF;

        v_processed_items := v_processed_items || jsonb_build_array(jsonb_build_object(
            'id', COALESCE(v_item->>'id', gen_random_uuid()::TEXT),
            'product_id', v_product_id,
            'name', v_item_desc,
            'description', v_item_desc,
            'quantity', v_qty,
            'price', v_rate,
            'discount', v_disc_pct,
            'tax_rate', v_tax_pct,
            'tax_amount', v_line_tax,
            'total', v_line_total,
            'unit', COALESCE(v_item->>'unit', 'pc')
        ));
    END LOOP;

    v_grand_total := ROUND(GREATEST(0, v_subtotal - v_item_discounts - COALESCE(p_discount_amount, 0) + v_total_tax), 2);

    IF p_status = 'paid' THEN
        v_amount_paid := v_grand_total;
        v_balance_due := 0;
        v_status := 'paid';
    ELSIF p_status = 'partial' THEN
        v_amount_paid := LEAST(GREATEST(COALESCE(p_amount_paid, 0), 0), v_grand_total);
        v_balance_due := ROUND(v_grand_total - v_amount_paid, 2);
        IF v_balance_due <= 0 AND v_grand_total > 0 THEN
            v_status := 'paid';
        ELSIF v_amount_paid <= 0 THEN
            v_status := 'pending';
            v_balance_due := v_grand_total;
        ELSE
            v_status := 'partial';
        END IF;
    ELSE
        v_amount_paid := 0;
        v_balance_due := v_grand_total;
        v_status := 'pending';
    END IF;

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
        tax_rate,
        tax_amount,
        total_amount,
        amount_paid,
        balance_due,
        status,
        notes,
        attachment_url
    ) VALUES (
        p_store_id,
        v_party_id,
        COALESCE(NULLIF(TRIM(p_bill_number), ''), 'BILL-' || TO_CHAR(now(), 'YYYYMMDD-HH24MISS')),
        v_vendor_name,
        NULLIF(TRIM(p_vendor_phone), ''),
        NULLIF(TRIM(p_vendor_email), ''),
        NULLIF(UPPER(TRIM(p_vendor_gstin)), ''),
        NULLIF(TRIM(p_place_of_supply), ''),
        COALESCE(p_date, CURRENT_DATE),
        p_due_date,
        v_processed_items,
        ROUND(v_subtotal, 2),
        ROUND(v_item_discounts + COALESCE(p_discount_amount, 0), 2),
        COALESCE(p_tax_rate, 0),
        v_total_tax,
        v_grand_total,
        v_amount_paid,
        v_balance_due,
        v_status,
        p_notes,
        p_attachment_url
    ) RETURNING id INTO v_purchase_id;

    -- Update inventory movements reference_id
    UPDATE public.inventory_movements
    SET reference_id = v_purchase_id
    WHERE store_id = p_store_id AND reference_id IS NULL AND reference_type = 'purchase_bill'
      AND created_at >= (now() - INTERVAL '5 seconds');

    -- Audit Log
    INSERT INTO public.audit_logs (
        store_id, user_id, action, resource_type, resource_id, metadata
    ) VALUES (
        p_store_id, p_user_id, 'purchase_created', 'purchases', v_purchase_id,
        jsonb_build_object(
            'bill_number', p_bill_number,
            'total_amount', v_grand_total,
            'status', v_status
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', v_purchase_id,
        'party_id', v_party_id,
        'vendor_name', v_vendor_name,
        'total_amount', v_grand_total,
        'amount_paid', v_amount_paid,
        'balance_due', v_balance_due,
        'status', v_status,
        'items', v_processed_items
    );
END;
$$;

-- =============================================================================
-- 5. Atomic Function: adjust_store_inventory
-- Server-authoritative inventory stock adjustments with movement ledger & audit.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.adjust_store_inventory(
    p_store_id UUID,
    p_user_id UUID,
    p_product_id UUID,
    p_adjustment_type TEXT,
    p_quantity NUMERIC,
    p_notes TEXT
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
    IF p_store_id IS NULL OR p_product_id IS NULL THEN
        RAISE EXCEPTION 'Store ID and Product ID are required.';
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

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_store_invoice(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, JSONB, NUMERIC, NUMERIC, BOOLEAN, BOOLEAN, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_store_purchase(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, JSONB, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_store_inventory(UUID, UUID, UUID, TEXT, NUMERIC, TEXT) TO authenticated;
