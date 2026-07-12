-- CREATE store_salesmen table
CREATE TABLE IF NOT EXISTS public.store_salesmen (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    salesman_email TEXT NOT NULL,
    salesman_name TEXT NOT NULL,
    salesman_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (store_id, salesman_email)
);

-- Enable Row Level Security
ALTER TABLE public.store_salesmen ENABLE ROW LEVEL SECURITY;

-- 1. Store Owners can select, insert, update, and delete their salesmen
CREATE POLICY "Store owners can view their salesmen"
    ON public.store_salesmen FOR SELECT
    USING (auth.uid() = store_id);

CREATE POLICY "Store owners can insert their salesmen"
    ON public.store_salesmen FOR INSERT
    WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Store owners can update their salesmen"
    ON public.store_salesmen FOR UPDATE
    USING (auth.uid() = store_id)
    WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Store owners can delete their salesmen"
    ON public.store_salesmen FOR DELETE
    USING (auth.uid() = store_id);

-- 2. Salesmen can view their own assignment
CREATE POLICY "Salesmen can view their own assignment"
    ON public.store_salesmen FOR SELECT
    USING (LOWER(salesman_email) = LOWER(auth.jwt()->>'email'));

-- 3. Extend SELECT and UPDATE on online_orders for assigned salesmen
CREATE POLICY "Salesmen can view orders of assigned store"
    ON public.online_orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_salesmen
            WHERE store_salesmen.store_id = online_orders.store_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
        )
    );

CREATE POLICY "Salesmen can update orders of assigned store"
    ON public.online_orders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_salesmen
            WHERE store_salesmen.store_id = online_orders.store_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- 4. Extend SELECT on online_order_items for assigned salesmen
CREATE POLICY "Salesmen can view order items of assigned store"
    ON public.online_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.online_orders
            JOIN public.store_salesmen ON store_salesmen.store_id = online_orders.store_id
            WHERE online_orders.id = online_order_items.order_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- 5. Extend SELECT and UPDATE on order_returns for assigned salesmen
CREATE POLICY "Salesmen can view returns of assigned store"
    ON public.order_returns FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.online_orders
            JOIN public.store_salesmen ON store_salesmen.store_id = online_orders.store_id
            WHERE online_orders.id = order_returns.order_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
        )
    );

CREATE POLICY "Salesmen can update returns of assigned store"
    ON public.order_returns FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.online_orders
            JOIN public.store_salesmen ON store_salesmen.store_id = online_orders.store_id
            WHERE online_orders.id = order_returns.order_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- 6. Extend SELECT on products for assigned salesmen (to view product details on order items)
CREATE POLICY "Salesmen can view products of assigned store"
    ON public.products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_salesmen
            WHERE store_salesmen.store_id = products.user_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
        )
    );
