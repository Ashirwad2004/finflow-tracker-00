# PROJECT AUDIT REPORT — FINFLOW TRACKER

**Audit Date:** September 7, 2026  
**Auditor:** Senior Full-Stack, Database, Security & QA Engineering Team  
**Repository:** `finflow-tracker-00-1`  
**Stack:** React + TypeScript (Vite) | Python FastAPI (Uvicorn) | Supabase (PostgreSQL) | Razorpay

---

## 1. ARCHITECTURE OVERVIEW

```text
Frontend (React 18 + TypeScript + Vite + Tailwind + ShadCN)
   ↓ [apiClient with in-memory JWT + 401 subscriber queue / Supabase JS SDK]
Proxy & Dev Server (Express server.js / Vite dev proxy)
   ↓ [/api/v1/...]
Backend API (FastAPI + Pydantic + Uvicorn + SlowAPI)
   ↓ [supabase-py with Service Role Key / Direct SQL migrations]
Database (Supabase PostgreSQL with RLS + RPC Functions)
   ↓
External Gateways (Razorpay / Stripe / Google Gemini AI)
```

---

## 2. AUDIT FINDINGS SUMMARY

| Severity | Count | Primary Areas |
|---|---|---|
| **CRITICAL** | 5 | Razorpay Webhook Parser, Webhook Subscription Activation, Webhook Idempotency, Webhook Exception Masking, Backend Supabase Client Null Dereference |
| **HIGH** | 5 | Subscription Price Inconsistency, Secret Key in Frontend `.env`, Unwired Payment Hook, AI JWT Secret Outage, Bogus Financial Formula |
| **MEDIUM** | 5 | TypeScript `types.ts` Missing Tables (250+ `as any`), Swallowed HTTPExceptions, `datetime.utcnow()` Deprecation, Missing Backend `.env.example` keys, Missing Frontend `.env.example` |
| **LOW** | 3 | Outdated CanIUse Browserslist, MockGateway test isolation, Starlette TestClient warning |

---

## 3. DETAILED ISSUE LOG

### CRITICAL ISSUES

#### [ISSUE-01] Razorpay Webhook Payload Entity Extraction Failure
- **Severity:** CRITICAL
- **Location:** `backend/src/api/v1/endpoints/payments.py:485-492` & `backend/src/services/payments/drivers.py:273`
- **Root Cause:** In Razorpay webhooks, the webhook body has `{"event": "payment.captured", "payload": {"payment": {"entity": {"id": "pay_xxx", "order_id": "order_xxx", ...}}}}`. However, `payments.py` attempts `data.get("order_id")` directly on the payload dictionary, which yields `None`.
- **Impact:** Razorpay webhooks fail to find any matching payment record in Supabase (`gateway_order_id = None`), causing asynchronous payments to fail silently without marking payments as successful.
- **Recommended Fix:** In `drivers.py` / `payments.py`, correctly extract the entity based on event type: `entity = data.get("payment", {}).get("entity", {})` for payment events, and `data.get("refund", {}).get("entity", {})` for refund events.
- **Status:** Identified

#### [ISSUE-02] Webhook Does Not Fulfill Subscriptions
- **Severity:** CRITICAL
- **Location:** `backend/src/api/v1/endpoints/payments.py:487-522`
- **Root Cause:** When `payment.captured` is processed via webhook, `payments.py` updates the `payments` table and `online_orders` table, but omits updating `subscription_status`.
- **Impact:** If a subscriber pays via UPI collect, QR code, or closes their browser before the client-side `verify-payment` call completes, their subscription remains inactive despite money being deducted.
- **Recommended Fix:** Add `subscription_status` upsert logic inside the webhook's `payment.captured` branch matching `verify-payment`.
- **Status:** Identified

#### [ISSUE-03] Missing Webhook Idempotency Guard
- **Severity:** CRITICAL
- **Location:** `backend/src/api/v1/endpoints/payments.py:21, 473`
- **Root Cause:** `PROCESSED_WEBHOOK_EVENTS: set[str] = set()` was declared at module level, but is never checked or written to inside the `webhook` handler.
- **Impact:** Razorpay retries webhook deliveries if a response is slightly delayed, leading to duplicate invoices, duplicate audit logs, and potential race conditions.
- **Recommended Fix:** Extract `event_id = webhook_event.get("eventId")`. If present in `PROCESSED_WEBHOOK_EVENTS`, return immediate 200 `{"received": True, "duplicate": True}`. Upon successful processing, add `event_id` to `PROCESSED_WEBHOOK_EVENTS`.
- **Status:** Identified

#### [ISSUE-04] Webhook Exception Masking
- **Severity:** CRITICAL
- **Location:** `backend/src/api/v1/endpoints/payments.py:569-572`
- **Root Cause:** `except Exception as exc:` catches all exceptions, including `HTTPException(400, "Invalid signature")`, and unconditionally logs "Webhook processing error" and re-raises `detail="Invalid webhook request"`.
- **Impact:** Obscures cryptographic signature verification failures and invalid JSON payloads.
- **Recommended Fix:** Catch `HTTPException` explicitly and re-raise without overwriting status codes or detail messages.
- **Status:** Identified

#### [ISSUE-05] Backend Supabase Client Null Dereference
- **Severity:** CRITICAL
- **Location:** `backend/src/core/supabase.py:4-8`, `backend/src/api/deps.py:23, 53`, `backend/src/api/v1/endpoints/backup.py:35`
- **Root Cause:** `supabase_client` is `None` if `VITE_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is unset or invalid. Endpoints call `supabase_client.table(...)` directly without validation.
- **Impact:** Throws an unhandled `AttributeError: 'NoneType' object has no attribute 'table'` resulting in 500 errors with no diagnostic message.
- **Recommended Fix:** Create a helper `get_supabase_client()` that raises `HTTPException(503, "Database service client is not configured")` with structured logging.
- **Status:** Identified

---

### HIGH ISSUES

#### [ISSUE-06] Subscription Pricing Inconsistency Between Frontend and Backend
- **Severity:** HIGH
- **Location:** `frontend/src/features/landing/components/RealSubscriptionCheckout.tsx:156-163` & `frontend/src/pages/Pricing.tsx:381` vs `backend/src/api/v1/endpoints/payments.py:265`
- **Root Cause:** Backend locks subscription price to a canonical flat ₹299 (all-inclusive, 0 GST). Frontend `RealSubscriptionCheckout.tsx` calculates annual price as `299 * 12 = 3588` plus 18% GST (total ₹4,234), and monthly as ₹299 + ₹54 GST (total ₹353). `Pricing.tsx` hardcodes `planId: "premium"`.
- **Impact:** Severe price discrepancy between displayed price and charged price, violating user trust and requirement to lock price at flat ₹299.
- **Recommended Fix:** Align frontend pricing display to flat ₹299 all-inclusive across all plans and cycles as requested, and make `Pricing.tsx` dynamic.
- **Status:** Identified

#### [ISSUE-07] Secret Key Exposure in `frontend/.env`
- **Severity:** HIGH
- **Location:** `frontend/.env:6`
- **Root Cause:** `RAZORPAY_KEY_SECRET=2zHjH0NqkZhHiVZQfBGvW5Bc` is present in the frontend directory `.env`.
- **Impact:** Security hazard: secret keys in frontend could easily be bundled or exposed.
- **Recommended Fix:** Remove `RAZORPAY_KEY_SECRET` from `frontend/.env` and verify that only `VITE_RAZORPAY_KEY_ID` is present on the client.
- **Status:** Identified

#### [ISSUE-08] Ad-Hoc Inline Payment Logic in Checkout Pages
- **Severity:** HIGH
- **Location:** `frontend/src/features/landing/components/RealSubscriptionCheckout.tsx:298-380` & `frontend/src/pages/Pricing.tsx:378-470`
- **Root Cause:** Both checkout components contain duplicate, raw `axios.post` calls and manual `loadRazorpayScript()` invocations instead of using `useRazorpayPayment` hook and `apiClient`.
- **Impact:** Inconsistent error handling, bypass of the centralized 401 token refresh queue, code duplication.
- **Recommended Fix:** Wire `useRazorpayPayment` hook into `RealSubscriptionCheckout.tsx` and `Pricing.tsx`.
- **Status:** Identified

#### [ISSUE-09] AI Endpoint Auth Rejection When `SUPABASE_JWT_SECRET` is Unset
- **Severity:** HIGH
- **Location:** `backend/src/api/deps.py:82-86`
- **Root Cause:** `require_ai_user` strictly expects `settings.SUPABASE_JWT_SECRET` to decode HS256 JWT tokens. Many Supabase projects use RS256/ECC or do not expose the raw HMAC secret.
- **Impact:** AI endpoints (`/api/v1/ai/...`) return 503 "AI authentication is not configured on the server" even when users have a valid Supabase JWT.
- **Recommended Fix:** Authenticate AI users using `supabase_client.auth.get_user(token)` (matching `get_current_user`), falling back to JWT decode only if configured.
- **Status:** Identified

#### [ISSUE-10] Bogus Operating Cash Flow Calculation in Financial Reports
- **Severity:** HIGH
- **Location:** `backend/src/services/reports.py:227`
- **Root Cause:** `operating_cash_flow = total_sales - total_purchases - total_expenses + (total_lent * 0.1)`. Adding `(total_lent * 0.1)` is an arbitrary, invalid financial formula.
- **Impact:** Miscalculates operating cash flow for merchants in generated financial summaries.
- **Recommended Fix:** Remove `+ (total_lent * 0.1)` and compute canonical operating cash flow: `total_sales - total_purchases - total_expenses`.
- **Status:** Identified

---

### MEDIUM ISSUES

#### [ISSUE-11] TypeScript Type Degradation (250+ `as any` Casts)
- **Severity:** MEDIUM
- **Location:** `frontend/src/core/integrations/supabase/types.ts` and throughout `src/features/`
- **Root Cause:** `Database` type in `types.ts` is outdated and missing tables: `sales`, `purchases`, `parties`, `products`, `profiles`, `payments`, `invoices`, `subscription_status`, `online_orders`, `feature_requests`, `expenses`, etc. Developers used `(supabase as any)` everywhere to bypass TypeScript errors.
- **Impact:** Disables TypeScript type safety, increases risk of runtime regressions and casing bugs.
- **Recommended Fix:** Update `types.ts` to include definitions for all core application tables and relationships.
- **Status:** Identified

#### [ISSUE-12] Swallowed HTTPExceptions in `feature_requests.py`
- **Severity:** MEDIUM
- **Location:** `backend/src/api/v1/endpoints/feature_requests.py:39, 58, 92`
- **Root Cause:** Unspecific `except Exception as exc:` catches custom `HTTPException(404)` or `400` and converts them to 500 internal server errors.
- **Impact:** Clients receive 500 instead of proper 404 or 400 status codes.
- **Recommended Fix:** Add `except HTTPException: raise` before `except Exception:`.
- **Status:** Identified

#### [ISSUE-13] Python 3.12+ `datetime.utcnow()` Deprecations
- **Severity:** MEDIUM
- **Location:** `backend/src/api/v1/endpoints/payments.py`, `backup.py`, `reports.py`
- **Root Cause:** `datetime.utcnow()` is deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`.
- **Impact:** Emits runtime deprecation warnings in logs.
- **Recommended Fix:** Replace with `datetime.now(timezone.utc)` consistently.
- **Status:** Identified

#### [ISSUE-14] Incomplete `backend/.env.example`
- **Severity:** MEDIUM
- **Location:** `backend/.env.example`
- **Root Cause:** Missing `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `PAYMENT_GATEWAY_PROVIDER`.
- **Impact:** New developers or production deployments cannot accurately configure payment secrets.
- **Recommended Fix:** Add complete template keys with comments.
- **Status:** Identified

#### [ISSUE-15] Missing `frontend/.env.example`
- **Severity:** MEDIUM
- **Location:** `frontend/.env.example`
- **Root Cause:** File is missing from the repository.
- **Impact:** Deployment confusion regarding required frontend environment variables.
- **Recommended Fix:** Create `frontend/.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_RAZORPAY_KEY_ID`.
- **Status:** Identified

---

### LOW ISSUES

#### [ISSUE-16] Browserslist Database Outdated
- **Severity:** LOW
- **Location:** `frontend/`
- **Root Cause:** `caniuse-lite` data is 15 months old.
- **Impact:** Minor build-time warning: `Browserslist: browsers data (caniuse-lite) is 15 months old`.
- **Recommended Fix:** Run `npx update-browserslist-db@latest` or configure quiet mode.
- **Status:** Identified

#### [ISSUE-17] Starlette TestClient Deprecation Warning
- **Severity:** LOW
- **Location:** `backend/tests/`
- **Root Cause:** Starlette emits deprecation warning about httpx integration.
- **Impact:** Cosmetic warning during `pytest`.
- **Recommended Fix:** Update test client initialization or filter expected warning.
- **Status:** Identified

#### [ISSUE-18] MockGateway Accessible in Production Backend
- **Severity:** LOW
- **Location:** `backend/src/services/payments/drivers.py:8-58`
- **Root Cause:** `MockGateway` driver is available regardless of `ENVIRONMENT` setting.
- **Impact:** Potential misuse in production if configured.
- **Recommended Fix:** Guard mock gateway behind `ENVIRONMENT == "development"` or `ENVIRONMENT == "test"`.
- **Status:** Identified
