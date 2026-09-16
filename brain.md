# FinFlow Tracker — Master System Brain & Architecture Map

> **HIGH PRIORITY FOR AI AGENTS**: Read this file first. It contains the complete architectural ground truth, database schema map, payment pipelines, and critical gotchas. Consulting this file eliminates the need to recursively explore the codebase, saving significant tokens.

---

## 1. System Topology & Tech Stack

```text
[ React 18 + Vite (Port 5173) ]  ──(Proxy /api)──>  [ FastAPI + Uvicorn (Port 8000) ]
              │                                                     │
              ▼                                                     ▼
    [ Supabase Client SDK ] ─────────────────────────> [ PostgreSQL Database + RLS ]
                                                       (Project: mimremmiwehqzrxthdgn)
```

- **Frontend**: Vite 5, React 18, TypeScript, TailwindCSS, shadcn/ui, Radix UI, TanStack Query v5, Lucide Icons.
- **Backend**: FastAPI, Python 3.11, Pydantic v2, Razorpay Python SDK, Supabase Python Client.
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) enabled on all public tables.
- **Supabase MCP Server**: Configured with `project_ref=mimremmiwehqzrxthdgn` (`docs,account,database,debugging,development,functions,branching`).
- **Agent Skills**: `supabase` and `supabase-postgres-best-practices` installed in `.agents/skills/`.
- **Payment Gateway**: Razorpay (Test keys configured in `.env`).
- **Dev Server Proxy**: `frontend/vite.config.ts` proxies `/api` to `http://localhost:8000`. Health check endpoint: `/health`.

---

## 2. Directory & Module Navigation

```text
/
├── brain.md                          <-- THIS FILE (Master Architecture & Token Saver)
├── .env / frontend/.env              <-- Env configs (Supabase URL/Anon Key, Razorpay Keys)
├── backend/                          <-- FastAPI Backend
│   ├── run.py / src/main.py          <-- FastAPI app root & router mount
│   └── src/api/v1/endpoints/
│       ├── payments.py               <-- Razorpay orders, subscription verification, webhooks
│       ├── ai.py                     <-- Gemini receipt OCR & assistant
│       └── reports.py                <-- GSTR-1, P&L, balance sheet exports
├── frontend/src/                     <-- React Application
│   ├── App.tsx                       <-- Route definitions & MerchantRoute paywall
│   ├── core/
│   │   ├── hooks/useSubscription.ts  <-- Central subscription & trial status hook
│   │   ├── contexts/BusinessContext.tsx <-- Personal vs Business Mode state
│   │   ├── integrations/supabase/    <-- Supabase client & generated DB types
│   │   └── lib/auth.tsx              <-- Supabase auth provider
│   ├── components/
│   │   ├── layout/AppSidebar.tsx     <-- Main navigation, trial countdown chip, upgrade CTA
│   │   ├── shared/calculator.tsx     <-- Statutory GST Studio & Business Calculator
│   │   └── ui/                       <-- Reusable shadcn/ui components
│   ├── features/                     <-- Modular domain features (sales, inventory, parties, etc.)
│   └── pages/
│       ├── Index.tsx                 <-- Landing / Personal Dashboard (gated)
│       └── Pricing.tsx               <-- Subscription plans & Razorpay checkout (₹299/mo)
└── supabase/
    └── migrations/                   <-- SQL migrations (single source of truth for DB)
```

---

## 3. Auth, Roles & Modes

1. **Authentication**: Supabase Auth (`auth.users`).
2. **User Profiles**: `public.profiles` keyed on `user_id` (PK, UUID). Stores `display_name`, `business_name`, `is_admin`, `currency`.
3. **Session Modes**:
   - **Personal Mode**: Track personal expenses, loans, group splits, and personal reports.
   - **Business Mode**: Invoices, sales, purchases, inventory, parties (debtors/creditors), GST reports.
   - **Salesman Session**: Restricted staff session with limited access (storefront orders, pos).

---

## 4. Subscription & 15-Day Free Trial Engine

### A. Statutory Rules
- Every newly verified user receives **strictly a 15-day free trial**.
- When the 15-day trial period expires, access to core features is locked; users are redirected to `/pricing` to pay **₹299/month**.
- **Anti-Abuse**: Recreating an account with the same email does **not** reset the trial.

### B. Database Implementation
- **`public.trial_claims`**: `(normalized_email UNIQUE, user_id, claimed_at, trial_days = 15)`.
- **`public.subscription_status`**: `(user_id PK, plan, status, current_period_start, current_period_end, cancel_at_period_end)`.
- **Trigger**: `claim_verified_email_trial()` on `auth.users` update (when `email_confirmed_at` is set).
  - First verification $\rightarrow$ inserts into `trial_claims` and sets `plan = 'trial', status = 'active', current_period_end = NOW() + INTERVAL '15 days'`.
  - Re-registered email $\rightarrow$ sets `plan = 'free', status = 'inactive'`.

### C. Frontend Paywall Hook
- **File**: `frontend/src/core/hooks/useSubscription.ts`
- **Exposes**:
  - `isTrialActive`: `boolean` (Trial plan with days remaining > 0)
  - `trialDaysLeft`: `number` (Remaining days in trial)
  - `isTrialExpired`: `boolean`
  - `isPaidSubscriber`: `boolean` (`plan IN ('pro', 'business', 'premium')` and active)
  - `canAccessApp`: `boolean` (`isPaidSubscriber || isTrialActive || isAdmin || isSalesman`)
- **Gating**: Used in `MerchantRoute` ([App.tsx](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/frontend/src/App.tsx)) and [Index.tsx](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/frontend/src/pages/Index.tsx).

---

## 5. Razorpay Payments Pipeline

1. **Order Creation**:
   - Client calls `POST /api/v1/payments/create-subscription-order` with `{ planId: "premium", billingCycle: "monthly" }`.
   - Backend creates Razorpay order for **₹299** (`29900` paise).
   - Inserts pending record into `public.payments` (`amount = 299, status = 'pending', notes = { planId, billingCycle }`).
2. **Client Checkout**:
   - Handled in [Pricing.tsx](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/frontend/src/pages/Pricing.tsx) via Razorpay Modal checkout.
3. **Cryptographic Verification**:
   - Client calls `POST /api/v1/payments/verify-payment` with `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
   - Backend verifies HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`.
   - Marks payment status `'success'` in `public.payments`.
   - Upserts `public.subscription_status` with `plan = 'premium', status = 'active', current_period_end = NOW() + 30 days`.

---

## 6. Advanced GST & CA Business Calculator

- **File**: `frontend/src/components/shared/calculator.tsx`
- **Access**: Sidebar button **GST & Calculator** (`AppSidebar.tsx`).
- **Core Modules**:
  1. **GST Studio**:
     - *Add GST (Exclusive)*: Base $\rightarrow$ Total.
     - *Remove GST (Inclusive)*: Gross MRP $\rightarrow$ Back-calculates Base Taxable Amount.
     - *Statutory Slabs*: 0% (Exempt), 5%, 12%, 18% (Standard default), 28%, Special: 0.25% (Diamonds), 3% (Jewellery), Custom %.
     - *Supply Splits*: Intra-State (CGST 50% + SGST 50%) vs Inter-State (IGST 100%).
     - *Statutory Clauses*: Compensation Cess %, Reverse Charge Mechanism (RCM - Sec 9(3)), GST TDS (2% - Sec 51).
     - *Number-to-Words*: Indian format (*"One Lakh Eighteen Thousand Rupees Only"*).
     - *Copy CA Breakdown*: Copies structured WhatsApp/Email-ready text.
  2. **Margin & MRP Planner**:
     - Cost Price + Margin % (or Markup %) + Output GST Slab $\rightarrow$ Selling Price & Consumer MRP.
  3. **Standard Calc**:
     - Arithmetic keypad + instant `+5%`, `+12%`, `+18%`, `+28%`, `-5%`, `-12%`, `-18%`, `-28%` GST hotkeys.

---

## 7. Database Tables Quick Reference

| Domain | Table Name | Key Purpose | Primary Identifiers |
|---|---|---|---|
| **Identity** | `profiles` | User profiles & business config | `user_id` (PK, UUID) |
| **Billing** | `subscription_status` | Plan tier (`trial`, `premium`, `free`) | `user_id` (PK, UUID) |
| **Billing** | `trial_claims` | Anti-abuse email tracker | `normalized_email` (UNIQUE) |
| **Billing** | `payments` | Gateway payments (subscriptions & store) | `id` (UUID), `order_id` (NULLABLE) |
| **Business** | `products` | Inventory catalog & stock levels | `id`, `store_id` (`user_id`) |
| **Business** | `sales` / `sale_items` | Invoices, sales transactions, partial payments, party_id & GST | `id`, `store_id`, `party_id`, `amount_paid`, `balance_due`, `status` |
| **Business** | `purchases` / `purchase_items` | Vendor bills, partial payments & input tax credit (ITC) | `id`, `store_id`, `amount_paid`, `balance_due`, `status` |
| **Business** | `parties` | Customer & Vendor ledger balances & statements | `id`, `store_id`, `name`, `type`, `opening_balance` |
| **Business** | `online_orders` | E-commerce storefront orders | `id`, `store_id` |
| **Personal** | `expenses` | Personal expense logs | `id`, `user_id` |
| **Personal** | `groups` / `group_members` | Expense sharing & split balances | `id`, `created_by` |
| **Personal** | `lent_money` / `borrowed_money` | Personal debt & loan tracking | `id`, `user_id` |

---

## 8. Critical Gotchas & Developer Rules (Save Tokens & Prevent Bugs)

1. **PL/pgSQL Variable Shadowing in Triggers**:
   - In Postgres trigger functions, **never** name a local variable identical to a table column name used in an `ON CONFLICT (col_name)` clause. It triggers `ERROR 42702: column reference is ambiguous`. Always prefix local variables with `v_` (e.g. `v_norm_email`).
2. **`payments` Table `order_id`**:
   - `order_id` references `online_orders(id)` and **must remain nullable**. SaaS subscription payments do not have a storefront `order_id`. Always pass subscription metadata in the `notes` JSONB column.
3. **Party Auto-Creation & Dynamic Ledger**:
   - When creating or editing sales in `CreateInvoiceDialog.tsx`, always check if the party exists by name (`name.toLowerCase()`).
   - If the party does **not** exist, automatically generate a UUID, create the party record in `parties` (with type `'customer'`, contact info, `opening_balance: 0`), and link `saleData.party_id = newPartyId`.
   - If the party **does** exist, link `saleData.party_id = existingParty.id` and enrich missing phone/email/GSTIN details. If previously only a vendor, promote type to `'both'`.
   - Dynamic Balance Formula:
     - Customer Receivable = $\sum \text{balance\_due on sales} + (\text{opening\_balance if not vendor})$.
     - Vendor Payable = $\sum \text{balance\_due on purchases} + (\text{opening\_balance if vendor})$.
   - Never gate party auto-creation behind arbitrary localStorage flags; it must always be seamless.
4. **Partial Payment Tracking & Status Resolution**:
   - Both `sales` and `purchases` tables store `amount_paid` (NUMERIC) and `balance_due` (NUMERIC).
   - Valid status values: `'paid'`, `'pending'`, `'partial'`, `'cancelled'`, `'overdue'`.
   - **Auto-resolution rules**:
     - `amount_paid >= total_amount`: status becomes `'paid'`, `balance_due = 0`.
     - `0 < amount_paid < total_amount`: status becomes `'partial'`, `balance_due = total_amount - amount_paid`.
     - `amount_paid <= 0`: status becomes `'pending'`, `balance_due = total_amount`.
   - **Offline Sync Payload Whitelist**: `frontend/src/core/offline/syncService.ts` contains a sanitizer for `sales` and `purchases`. Never omit `party_id`, `amount_paid`, `balance_due`, `due_date`, `notes`, `payment_method`, `tax_rate`, or `discount_amount` from the sync whitelist, or offline records will be stripped during online sync.
   - **Financial Metrics**: In `Sales.tsx`, revenue metrics must include `amount_paid` from partial invoices (`s.status === 'paid' ? s.total_amount : s.amount_paid || 0`), rather than filtering exclusively on `status === 'paid'`.
5. **Vite Proxy Health Check**:
   - Do **not** test backend reachability against `/api/v1/payments` (it has no GET handler and returns 404). Always check `/health`.
6. **Build Validation**:
   - To validate frontend changes without opening the browser:
     `npm run build` inside `frontend/`.
7. **Products Tenant Isolation in Inventory**:
   - Always query `public.products` with `.eq("user_id", userId)`! Never use `.select("*")` without a `user_id` constraint.
   - On the database level, `public.products` RLS restricts SELECT to `auth.uid() = user_id` for authenticated merchants. Public storefront catalog queries must use `get_public_store_products(p_store_id)` (or `anon` role) so merchants never receive items from other stores in their own inventory.
8. **Party Ledger Date Resilience**:
   - In `DetailedPartyReport.tsx`, `exportDetailedPartyPDF.ts`, and `exportDetailedPartyCSV.ts`, always fetch both `date` and `created_at` with fallback (`date: record.date || record.created_at`).
   - Always parse dates using `parseSafeDate()` (supporting ISO, `YYYY-MM-DD`, `DD-MM-YYYY`, and `DD/MM/YYYY`) and format using `format(parsedDate, "dd MMM yyyy")` to prevent blank dates, `-` placeholders, or `RangeError: Invalid time value` crashes during PDF generation.
9. **Invoice & Bill Partial Payment Breakdown**:
   - All invoice generators (`generateInvoicePDF.ts`, `ThermalReceipt.tsx`, `PrintStudio.tsx`, and `core/utils/invoiceGenerator.ts`) must support and display partial payment status.
   - Totals block must clearly show:
     - **Total Amount / Grand Total**
     - **Amount Paid** (customer paid amount)
     - **Balance Due / Pending Amount** (highlighted in red if pending > 0, emerald if fully paid)
   - When triggering PDF preview/download from `Sales.tsx`, `Purchases.tsx`, `Parties.tsx`, and `PrintStudio.tsx`, always pass `amount_paid`, `balance_due`, `status`, `due_date`, and safe `date` fallback.
10. **Notes Column on Sales and Purchases Tables**:
    - Both `public.sales` and `public.purchases` contain a `notes TEXT` column used for invoice terms, payment receipts, and payment history audit notes.
    - When recording payments in `Parties.tsx` or `Sales.tsx`, payments append history into `notes`.
    - Migration `20260916000005_add_notes_to_sales_and_purchases.sql` ensures `notes TEXT` exists on both tables and PostgREST schema cache is reloaded.
11. **No Blind Full-Repository Scans**:
    - Use the file paths documented in Section 2 above to directly edit the targeted module.