# FinFlow Tracker — System Reference

> **AI AGENT CONTEXT**: Architectural rules, schemas, and critical gotchas. Consult directly instead of scanning codebase to save tokens.

---

## 1. Stack & Architecture

- **Frontend**: Vite 5, React 18, TS, TailwindCSS, shadcn/ui, TanStack Query v5. Proxy: `/api` -> `http://localhost:8000`.
- **Backend**: FastAPI, Python 3.11, Pydantic v2, Razorpay SDK. Health check: `GET /health`.
- **Database**: Supabase PostgreSQL (`project_ref=mimremmiwehqzrxthdgn`) with RLS on all public tables.

---

## 2. Key Modules & Paths

| Path | Purpose |
|---|---|
| `frontend/src/App.tsx` | Route definitions & `MerchantRoute` paywall |
| `frontend/src/core/hooks/useSubscription.ts` | Central subscription & trial hook (`canAccessApp`) |
| `frontend/src/core/contexts/BusinessContext.tsx` | Personal vs Business mode toggle |
| `frontend/src/core/offline/syncService.ts` | Offline sync & payload field whitelist |
| `frontend/src/components/layout/AppSidebar.tsx` | Main navigation & trial countdown chip |
| `frontend/src/components/shared/calculator.tsx` | Statutory GST Studio & CA calculator |
| `frontend/src/features/business/` | Sales, Purchases, Inventory, Parties, Invoicing |
| `backend/src/api/v1/endpoints/payments.py` | Razorpay orders, HMAC-SHA256 verification |
| `supabase/migrations/` | Database schema migrations (single source of truth) |

---

## 3. Subscription & Free Trial Rules

- **Trial**: 15-day free trial activated on email verification (`trial_claims` anti-abuse by `normalized_email`).
- **Paid Plan**: ₹299/month (`plan = 'premium'`). Gated via `MerchantRoute`.
- **Access Rule**: `canAccessApp = isPaidSubscriber || isTrialActive || isAdmin || isSalesman`.
- **Razorpay Flow**: `POST /api/v1/payments/create-subscription-order` (29900 paise) -> checkout modal -> `POST /api/v1/payments/verify-payment` (HMAC verify) -> upserts `subscription_status` for 30 days.

---

## 4. Core Database Schema

| Table | Key Columns & Notes |
|---|---|
| `profiles` | `user_id` (PK, UUID), `business_name`, `is_admin`, `currency` |
| `subscription_status` | `user_id` (PK), `plan` (`trial`\|`premium`\|`free`), `status`, `current_period_end` |
| `trial_claims` | `normalized_email` (UNIQUE), `user_id`, `claimed_at`, `trial_days` (15) |
| `payments` | `id`, `order_id` (NULLABLE for sub payments; store plan in `notes` JSONB), `amount`, `status` |
| `products` | `id`, `user_id` (tenant isolation; query with `.eq("user_id", uid)`) |
| `sales` | `id`, `store_id`, `party_id`, `total_amount`, `amount_paid`, `balance_due`, `status`, `notes`, `date` |
| `purchases` | `id`, `store_id`, `party_id`, `total_amount`, `amount_paid`, `balance_due`, `status`, `notes`, `date` |
| `parties` | `id`, `store_id`, `name`, `type` (`customer`\|`vendor`\|`both`), `opening_balance` |

---

## 5. Critical Invariants & Developer Rules

1. **Trigger Variable Naming**: In PL/pgSQL triggers, prefix local variables with `v_` (e.g. `v_norm_email`) to avoid `ERROR 42702: column reference is ambiguous` in `ON CONFLICT` clauses.
2. **Nullable `payments.order_id`**: Subscriptions have no storefront order; `order_id` must remain nullable. Pass subscription info in `notes`.
3. **Party Auto-Linking & Balance**:
   - In `CreateInvoiceDialog.tsx`, auto-link or auto-create parties by case-insensitive name (`opening_balance: 0`). Promote vendor to `'both'` if making a sale.
   - **Customer Receivable**: $\sum \text{balance\_due (sales)} + (\text{opening\_balance if not vendor})$.
   - **Vendor Payable**: $\sum \text{balance\_due (purchases)} + (\text{opening\_balance if vendor})$.
4. **Partial Payment Status & Formulas**:
   - Statuses: `'paid'`, `'partial'`, `'pending'`, `'cancelled'`, `'overdue'`.
   - `amount_paid >= total_amount`: status `'paid'`, `balance_due = 0`.
   - `0 < amount_paid < total_amount`: status `'partial'`, `balance_due = total_amount - amount_paid`.
   - `amount_paid <= 0`: status `'pending'`, `balance_due = total_amount`.
   - Revenue calculations must include `amount_paid` from partial invoices (`status === 'paid' ? total_amount : amount_paid || 0`).
5. **Offline Sync Whitelist**: `syncService.ts` sanitizers must include `party_id`, `amount_paid`, `balance_due`, `due_date`, `notes`, `payment_method`, `tax_rate`, `discount_amount` or offline edits will be stripped.
6. **Tenant Isolation**: Always query `public.products` with `.eq("user_id", userId)`. Storefront public catalog queries use `get_public_store_products(p_store_id)`.
7. **Date Resilience**: Always fallback `record.date || record.created_at` and parse with `parseSafeDate()` before calling `format()` to prevent `RangeError` crashes in exports and PDF generators.
8. **Invoice & Receipt Breakdown**: All generators (`generateInvoicePDF`, `ThermalReceipt`, `PrintStudio`, `invoiceGenerator`) must show Total, Amount Paid, and Balance Due (highlighted red if pending > 0).
9. **Notes Column**: `public.sales` and `public.purchases` both have `notes TEXT` column used for invoice terms and payment audit entries.
10. **Backend Health Check**: Test backend connectivity using `/health`, not `/api/v1/payments`.
11. **Real Bank Details & Invoice Print Setting**: Never print hardcoded dummy bank accounts (e.g. fake SBI). Bank details must be resolved from real accounts (`rupeebill_bank_accounts` or `profile`) and respect `rupeebill_print_bank_details` setting. If disabled or none exist, cleanly omit the bank block.