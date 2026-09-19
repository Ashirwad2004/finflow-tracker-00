-- ==============================================================================
-- FINFLOW PRODUCTION POS & BARCODE MANAGEMENT SYSTEM MIGRATION
-- ==============================================================================

-- 1. Extend products table
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS barcode TEXT,
    ADD COLUMN IF NOT EXISTS barcode_type TEXT DEFAULT 'code128',
    ADD COLUMN IF NOT EXISTS barcode_source TEXT DEFAULT 'internal',
    ADD COLUMN IF NOT EXISTS sku TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS mrp NUMERIC,
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0;

-- Scoped unique index on products (user_id, barcode)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_barcode 
ON public.products(user_id, barcode) 
WHERE barcode IS NOT NULL AND barcode != '';

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(user_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(user_id, category) WHERE category IS NOT NULL;

-- 2. Extend sales table
ALTER TABLE public.sales
    ADD COLUMN IF NOT EXISTS pos_terminal_id UUID,
    ADD COLUMN IF NOT EXISTS pos_shift_id UUID,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS offline_invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS return_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_idempotency 
ON public.sales(user_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_pos_shift ON public.sales(pos_shift_id) WHERE pos_shift_id IS NOT NULL;

-- 3. Create pos_terminals table
CREATE TABLE IF NOT EXISTS public.pos_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_pos_terminals_store_code UNIQUE (store_id, code)
);

ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own pos_terminals" ON public.pos_terminals;
CREATE POLICY "Users can manage own pos_terminals" ON public.pos_terminals
    TO authenticated
    USING ((SELECT auth.uid()) = store_id)
    WITH CHECK ((SELECT auth.uid()) = store_id);

GRANT ALL ON public.pos_terminals TO authenticated;

-- 4. Create pos_shifts table
CREATE TABLE IF NOT EXISTS public.pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    terminal_id UUID REFERENCES public.pos_terminals(id) ON DELETE SET NULL,
    cashier_id UUID NOT NULL,
    cashier_snapshot_name TEXT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    opening_cash NUMERIC NOT NULL DEFAULT 0,
    expected_cash NUMERIC NOT NULL DEFAULT 0,
    actual_cash NUMERIC,
    difference NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own pos_shifts" ON public.pos_shifts;
CREATE POLICY "Users can manage own pos_shifts" ON public.pos_shifts
    TO authenticated
    USING ((SELECT auth.uid()) = store_id)
    WITH CHECK ((SELECT auth.uid()) = store_id);

GRANT ALL ON public.pos_shifts TO authenticated;

-- 5. Create pos_cash_movements table
CREATE TABLE IF NOT EXISTS public.pos_cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    shift_id UUID NOT NULL REFERENCES public.pos_shifts(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_cash_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own pos_cash_movements" ON public.pos_cash_movements;
CREATE POLICY "Users can manage own pos_cash_movements" ON public.pos_cash_movements
    TO authenticated
    USING ((SELECT auth.uid()) = store_id)
    WITH CHECK ((SELECT auth.uid()) = store_id);

GRANT ALL ON public.pos_cash_movements TO authenticated;

-- 6. Create pos_held_bills table
CREATE TABLE IF NOT EXISTS public.pos_held_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    terminal_id UUID REFERENCES public.pos_terminals(id) ON DELETE SET NULL,
    cashier_id UUID NOT NULL,
    customer_name TEXT DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_held_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own pos_held_bills" ON public.pos_held_bills;
CREATE POLICY "Users can manage own pos_held_bills" ON public.pos_held_bills
    TO authenticated
    USING ((SELECT auth.uid()) = store_id)
    WITH CHECK ((SELECT auth.uid()) = store_id);

GRANT ALL ON public.pos_held_bills TO authenticated;

-- 7. Create pos_returns (header) and pos_return_items (lines)
CREATE TABLE IF NOT EXISTS public.pos_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    credit_note_sale_id UUID REFERENCES public.sales(id),
    return_number TEXT NOT NULL UNIQUE,
    shift_id UUID REFERENCES public.pos_shifts(id) ON DELETE SET NULL,
    cashier_id UUID NOT NULL,
    total_refund_amount NUMERIC NOT NULL CHECK (total_refund_amount >= 0),
    refund_method TEXT NOT NULL DEFAULT 'cash',
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own pos_returns" ON public.pos_returns;
CREATE POLICY "Users can manage own pos_returns" ON public.pos_returns
    TO authenticated
    USING ((SELECT auth.uid()) = store_id)
    WITH CHECK ((SELECT auth.uid()) = store_id);

GRANT ALL ON public.pos_returns TO authenticated;

CREATE TABLE IF NOT EXISTS public.pos_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.pos_returns(id) ON DELETE CASCADE,
    original_sale_item_id TEXT,
    product_id UUID REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL,
    tax_rate NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    refund_amount NUMERIC NOT NULL,
    restock_inventory BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_return_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own pos_return_items" ON public.pos_return_items;
CREATE POLICY "Users can manage own pos_return_items" ON public.pos_return_items
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.pos_returns r
        WHERE r.id = pos_return_items.return_id AND r.store_id = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.pos_returns r
        WHERE r.id = pos_return_items.return_id AND r.store_id = (SELECT auth.uid())
    ));

GRANT ALL ON public.pos_return_items TO authenticated;

-- 8. Create inventory_discrepancies table for offline oversell tracking
CREATE TABLE IF NOT EXISTS public.inventory_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    expected_stock INTEGER NOT NULL,
    deducted_quantity NUMERIC NOT NULL,
    resulting_stock INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'offline_pos_sync',
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_discrepancies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own inventory_discrepancies" ON public.inventory_discrepancies;
CREATE POLICY "Users can view own inventory_discrepancies" ON public.inventory_discrepancies
    TO authenticated
    USING ((SELECT auth.uid()) = store_id)
    WITH CHECK ((SELECT auth.uid()) = store_id);

GRANT ALL ON public.inventory_discrepancies TO authenticated;

-- 9. Function: pos_get_shift_summary
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
        'shift_id', v_shift.id,
        'store_id', v_shift.store_id,
        'cashier_id', v_shift.cashier_id,
        'cashier_snapshot_name', v_shift.cashier_snapshot_name,
        'status', v_shift.status,
        'opened_at', v_shift.opened_at,
        'closed_at', v_shift.closed_at,
        'opening_cash', v_shift.opening_cash,
        'cash_sales', v_cash_sales,
        'cash_in', v_cash_in,
        'cash_out', v_cash_out,
        'cash_refunds', v_cash_refunds,
        'expected_cash', v_computed_expected,
        'actual_cash', v_shift.actual_cash,
        'difference', COALESCE(v_shift.actual_cash - v_computed_expected, 0),
        'total_bills', v_total_bills,
        'notes', v_shift.notes
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pos_get_shift_summary(UUID) TO authenticated;

-- 10. Function: pos_complete_sale
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
                            COALESCE(v_db_stock, 0),
                            v_qty,
                            COALESCE(v_db_stock, 0) - v_qty::INTEGER,
                            CASE WHEN p_is_offline_sync THEN 'offline_pos_sync' ELSE 'pos_oversell' END
                        );
                    END IF;

                    UPDATE public.products
                    SET stock_quantity = COALESCE(stock_quantity, 0) - v_qty::INTEGER,
                        updated_at = now()
                    WHERE id = v_product_id;
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
            'discount', v_disc,
            'tax_rate', v_tax_rate,
            'tax_amount', ROUND(v_line_tax, 2),
            'total', ROUND(v_line_total, 2),
            'unit', COALESCE(v_item->>'unit', 'pc'),
            'hsn_code', COALESCE(v_item->>'hsn_code', '')
        ));
    END LOOP;

    v_total_amount := ROUND(v_subtotal - COALESCE(p_discount_amount, 0) + v_tax_amount, 2);
    IF v_total_amount < 0 THEN v_total_amount := 0; END IF;

    IF COALESCE(p_amount_paid, 0) >= v_total_amount THEN
        v_status := 'paid';
        v_balance_due := 0;
    ELSIF COALESCE(p_amount_paid, 0) > 0 THEN
        v_status := 'partial';
        v_balance_due := ROUND(v_total_amount - p_amount_paid, 2);
    ELSE
        v_status := 'pending';
        v_balance_due := v_total_amount;
    END IF;

    SELECT COUNT(*) + 1 INTO v_seq_num FROM public.sales WHERE user_id = p_store_id;
    v_invoice_number := 'POS-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(v_seq_num::TEXT, 4, '0');

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
        pos_terminal_id,
        pos_shift_id,
        idempotency_key,
        offline_invoice_number,
        document_type
    ) VALUES (
        p_store_id,
        v_party_id,
        v_invoice_number,
        COALESCE(p_customer_name, 'Walk-in Customer'),
        p_customer_phone,
        CURRENT_DATE,
        v_processed_items,
        ROUND(v_subtotal, 2),
        ROUND(COALESCE(p_discount_amount, 0), 2),
        ROUND(v_tax_amount, 2),
        v_total_amount,
        COALESCE(p_amount_paid, 0),
        v_balance_due,
        v_status,
        p_payment_method,
        p_notes,
        p_terminal_id,
        p_shift_id,
        p_idempotency_key,
        p_offline_invoice_number,
        'invoice'
    ) RETURNING id INTO v_sale_id;

    IF p_shift_id IS NOT NULL AND p_payment_method = 'cash' AND COALESCE(p_amount_paid, 0) > 0 THEN
        UPDATE public.pos_shifts
        SET expected_cash = expected_cash + p_amount_paid
        WHERE id = p_shift_id;
    END IF;

    SELECT * INTO v_existing_sale FROM public.sales WHERE id = v_sale_id;
    RETURN jsonb_build_object(
        'success', true,
        'sale', row_to_json(v_existing_sale),
        'is_duplicate', false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pos_complete_sale(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID, JSONB, NUMERIC, TEXT, NUMERIC, TEXT, TEXT, BOOLEAN) TO authenticated;

-- 11. Function: pos_process_return
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
        reason,
        status
    ) VALUES (
        p_store_id,
        p_sale_id,
        v_return_number,
        p_shift_id,
        p_cashier_id,
        0,
        COALESCE(p_refund_method, 'cash'),
        COALESCE(p_reason, 'Customer Return'),
        'completed'
    ) RETURNING id INTO v_return_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items)
    LOOP
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.001);
        v_unit_price := COALESCE((v_item->>'unit_price')::NUMERIC, 0);
        v_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 0);

        v_line_tax := ROUND((v_qty * v_unit_price * v_tax_rate) / 100, 2);
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
        original_invoice_id,
        return_id,
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

GRANT EXECUTE ON FUNCTION public.pos_process_return(UUID, UUID, UUID, UUID, JSONB, TEXT, TEXT) TO authenticated;
