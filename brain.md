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
| **Business** | `sales` / `sale_items` | Invoices, sales transactions & GST | `id`, `store_id` |
| **Business** | `purchases` / `purchase_items` | Vendor bills & input tax credit (ITC) | `id`, `store_id` |
| **Business** | `parties` | Customer & Vendor ledger balances | `id`, `store_id`, `type` |
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
3. **Vite Proxy Health Check**:
   - Do **not** test backend reachability against `/api/v1/payments` (it has no GET handler and returns 404). Always check `/health`.
4. **Build Validation**:
   - To validate frontend changes without opening the browser:
     `npm run build` inside `frontend/`.
5. **No Blind Full-Repository Scans**:
   - Use the file paths documented in Section 2 above to directly edit the targeted module.
