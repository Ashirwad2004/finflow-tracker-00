-- Migration: optimize_indexes
-- Description: Adds essential indexes to frequently queried columns across tables for better performance.

-- 1. Profiles Table
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 2. Expenses Table (Heavy read/write/filter)
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);

-- 3. Budgets Table
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON public.budgets(month);

-- 4. Lent Money Table
CREATE INDEX IF NOT EXISTS idx_lent_money_user_id ON public.lent_money(user_id);
CREATE INDEX IF NOT EXISTS idx_lent_money_status ON public.lent_money(status);

-- 5. Borrowed Money Table
CREATE INDEX IF NOT EXISTS idx_borrowed_money_user_id ON public.borrowed_money(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowed_money_status ON public.borrowed_money(status);


-- 7. Groups Table
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- 8. Group Members Table
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- 9. Group Expenses Table
CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id ON public.group_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_paid_by ON public.group_expenses(paid_by);

-- 10. Business Sales & Purchases (if used heavily)
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(date DESC);
