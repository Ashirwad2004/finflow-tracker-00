-- Migration: 20260718180000_rls_performance_optimization.sql
-- Description: Denormalizes store_id into child tables to eliminate nested EXISTS queries in RLS policies.

-- 1. Add store_id to online_order_items
ALTER TABLE public.online_order_items
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill store_id for online_order_items
UPDATE public.online_order_items oi
SET store_id = o.store_id
FROM public.online_orders o
WHERE oi.order_id = o.id AND oi.store_id IS NULL;

-- 2. Add store_id to order_returns
ALTER TABLE public.order_returns
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill store_id for order_returns
UPDATE public.order_returns r
SET store_id = o.store_id
FROM public.online_orders o
WHERE r.order_id = o.id AND r.store_id IS NULL;

-- 3. Create Indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_online_order_items_store_id ON public.online_order_items(store_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_store_id ON public.order_returns(store_id);

-- 4. Triggers to auto-populate store_id on insert
CREATE OR REPLACE FUNCTION set_store_id_from_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.store_id IS NULL THEN
        SELECT store_id INTO NEW.store_id
        FROM public.online_orders
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_store_id_online_order_items ON public.online_order_items;
CREATE TRIGGER trg_set_store_id_online_order_items
BEFORE INSERT ON public.online_order_items
FOR EACH ROW
EXECUTE FUNCTION set_store_id_from_order();

DROP TRIGGER IF EXISTS trg_set_store_id_order_returns ON public.order_returns;
CREATE TRIGGER trg_set_store_id_order_returns
BEFORE INSERT ON public.order_returns
FOR EACH ROW
EXECUTE FUNCTION set_store_id_from_order();

-- 5. Rewrite RLS Policies for Salesmen to remove EXISTS subqueries

-- online_order_items
DROP POLICY IF EXISTS "Salesmen can view order items of assigned store" ON public.online_order_items;
CREATE POLICY "Salesmen can view order items of assigned store"
    ON public.online_order_items FOR SELECT
    USING (
        store_id IN (
            SELECT store_id FROM public.store_salesmen
            WHERE LOWER(salesman_email) = LOWER(auth.jwt()->>'email')
            AND is_active = true
        )
    );

-- order_returns
DROP POLICY IF EXISTS "Salesmen can view returns of assigned store" ON public.order_returns;
CREATE POLICY "Salesmen can view returns of assigned store"
    ON public.order_returns FOR SELECT
    USING (
        store_id IN (
            SELECT store_id FROM public.store_salesmen
            WHERE LOWER(salesman_email) = LOWER(auth.jwt()->>'email')
            AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Salesmen can update returns of assigned store" ON public.order_returns;
CREATE POLICY "Salesmen can update returns of assigned store"
    ON public.order_returns FOR UPDATE
    USING (
        store_id IN (
            SELECT store_id FROM public.store_salesmen
            WHERE LOWER(salesman_email) = LOWER(auth.jwt()->>'email')
            AND is_active = true
            AND can_manage_returns = true
        )
    );
