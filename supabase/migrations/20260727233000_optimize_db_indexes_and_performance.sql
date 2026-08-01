-- Migration: 20260727233000_optimize_db_indexes_and_performance.sql
-- Description: Creates essential indexes on foreign keys, filtering columns, and composite sorting fields to eliminate full table scans and reduce DB query latency.

-- 1. Products Table (High-frequency list, search, and inventory queries)
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id_created_at ON public.products(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_id_stock ON public.products(user_id, stock_quantity);

-- 2. Online Orders Table (Storefront order tracking & status filtering)
CREATE INDEX IF NOT EXISTS idx_online_orders_store_id ON public.online_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_store_status ON public.online_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_online_orders_store_created_at ON public.online_orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_orders_customer_phone ON public.online_orders(customer_phone);

-- 3. Online Order Items Table
CREATE INDEX IF NOT EXISTS idx_online_order_items_order_id ON public.online_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_online_order_items_product_id ON public.online_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_online_order_items_store_id ON public.online_order_items(store_id);

-- 4. Parties Directory (CRM / Supplier & Customer lookup)
CREATE INDEX IF NOT EXISTS idx_parties_user_id ON public.parties(user_id);
CREATE INDEX IF NOT EXISTS idx_parties_user_id_name ON public.parties(user_id, name);

-- 5. Invoices & Billing Table
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_issue_date ON public.invoices(user_id, issue_date DESC);

-- 6. Invoice Line Items Table
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON public.invoice_items(product_id);

-- 7. Payment Transactions Table
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON public.payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 8. Order Returns Table
CREATE INDEX IF NOT EXISTS idx_order_returns_order_id ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_store_id ON public.order_returns(store_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON public.order_returns(status);

-- 9. Store Salesmen Table
CREATE INDEX IF NOT EXISTS idx_store_salesmen_store_id ON public.store_salesmen(store_id);
CREATE INDEX IF NOT EXISTS idx_store_salesmen_email ON public.store_salesmen(salesman_email);
CREATE INDEX IF NOT EXISTS idx_store_salesmen_active ON public.store_salesmen(store_id, is_active);

-- 10. Feature Requests Table
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON public.feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_submitted_at ON public.feature_requests(submitted_at DESC);

-- 11. Notification Log Table
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON public.notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON public.notification_log(user_id, created_at DESC);
