-- Migration: 20260718170000_enterprise_scalability.sql
-- Description: Adds advanced composite indexes and query optimizations for scaling to 1M+ users.

-- Enable pg_stat_statements if not already enabled to help track slow queries at scale.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 1. Optimize Expenses Analytics Queries
-- Most dashboards filter expenses by user and sort by date descending.
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_desc ON public.expenses(user_id, date DESC);

-- 2. Optimize Sales Analytics Queries
-- Core business dashboard relies on filtering sales by user and aggregating over time.
CREATE INDEX IF NOT EXISTS idx_sales_user_date_desc ON public.sales(user_id, date DESC);

-- 3. Optimize Purchases Analytics Queries
CREATE INDEX IF NOT EXISTS idx_purchases_user_date_desc ON public.purchases(user_id, date DESC);

-- 4. Audit & Metadata Optimization
-- If JSONB metadata exists on expenses (e.g. for parsed AI receipts), we index it to speed up JSON lookups.
-- Note: Assuming metadata doesn't exist on all tables, so we check first. 
-- CREATE INDEX IF NOT EXISTS idx_expenses_metadata_gin ON public.expenses USING GIN (metadata);

-- 5. Foreign Key Join Optimizations
-- Essential for `JOIN` operations between parties, groups, and transactions.
CREATE INDEX IF NOT EXISTS idx_sales_party_id ON public.sales(party_id);
CREATE INDEX IF NOT EXISTS idx_purchases_party_id ON public.purchases(party_id);

-- Note: In a true 1M user environment, we would also implement RANGE PARTITIONING on `transactions` and `audit_logs` 
-- by DATE (e.g., partitioned monthly). For the scope of this migration, we ensure B-Tree indexes are optimized.