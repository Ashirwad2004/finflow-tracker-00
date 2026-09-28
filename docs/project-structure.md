# FinFlow Tracker — Full-Stack Project File Structure

## 1. Monorepo Overview

This repository is organized as a unified full-stack monorepo featuring a **React 18 + Vite** frontend, a **Python FastAPI** backend, and a **Supabase PostgreSQL** database with offline SQLite resilience.

```text
finflow-tracker-00-1/
├── package.json              # Monorepo root orchestration (workspaces: ["frontend"])
├── tsconfig.json             # Root TypeScript config linking to frontend tsconfigs
├── run-backend.py            # Cross-platform runner for the FastAPI backend
├── vercel.json               # Root Vercel deployment routing (frontend/dist + server.js)
├── docker-compose.yml        # Container orchestration (Frontend + Backend + OpenWA)
├── brain.md                  # System reference, schema invariants & core developer rules
├── AI/RULES.md               # AI coding instructions and guidelines
├── docs/                     # Architectural guides, schemas, and specifications
│   ├── database-schema.md
│   ├── developer-setup.md
│   ├── features-guide.md
│   ├── product-overview.md
│   ├── project-structure.md  # This structure guide
│   └── whatsapp-integration.md
├── supabase/                 # Supabase configuration, migrations, and Edge Functions
│   ├── config.toml
│   ├── functions/            # Deno-based Edge Functions (backup, scan-bill, AI proxy)
│   └── migrations/           # Versioned SQL migrations (single source of truth)
├── backend/                  # FastAPI Python backend
└── frontend/                 # React 18 + TypeScript + Vite frontend
```

---

## 2. Backend File Structure (`backend/`)

The backend follows a layered clean architecture: **Endpoints → Services → Repositories → Supabase DB**.

```text
backend/
├── pyproject.toml            # Pytest and tool configurations
├── requirements.txt          # Python dependencies (FastAPI, Pydantic v2, Uvicorn, etc.)
├── pyrightconfig.json        # Python typechecking configuration
├── Dockerfile                # Backend container definition
├── src/
│   ├── main.py               # FastAPI application entry point, CORS, middlewares
│   ├── api/
│   │   ├── deps.py           # Dependency injection (Auth, Supabase client, Rate limiting)
│   │   └── v1/
│   │       ├── router.py     # Aggregated v1 API router
│   │       └── endpoints/    # Route controllers
│   │           ├── ai.py              # Gemini AI query & insights
│   │           ├── audit.py           # Audit logging endpoints
│   │           ├── backup.py          # Data backup operations
│   │           ├── feature_requests.py# Feedback & requests
│   │           ├── inventory.py       # Stock adjustments & valuation
│   │           ├── invoices.py        # Authoritative invoice creation & numbering
│   │           ├── parties.py         # Party ledgers & statements
│   │           ├── payments.py        # Razorpay orders & webhook verification
│   │           ├── pos.py             # POS counter sales & barcode generation
│   │           ├── purchases.py       # Authoritative purchase bills
│   │           ├── reports.py         # P&L, Trial Balance, Balance Sheet, GST
│   │           └── whatsapp.py        # WhatsApp notification gateway
│   ├── core/
│   │   ├── config.py         # Pydantic Settings & environment variables
│   │   ├── database.py       # Database connection pools
│   │   ├── security.py       # Token verification & crypto hashing
│   │   └── supabase.py       # Supabase service-role client initializer
│   ├── repositories/         # Direct database access layer
│   │   ├── __init__.py       # Re-exports Invoice, Purchase, Inventory, Party, Audit repos
│   │   ├── audit_repository.py
│   │   ├── inventory_repository.py
│   │   ├── invoice_repository.py
│   │   ├── party_repository.py
│   │   └── purchase_repository.py
│   ├── schemas/              # Pydantic v2 data transfer models (DTOs)
│   │   ├── __init__.py
│   │   ├── ai.py, audit.py, inventory.py, invoices.py, parties.py, payments.py,
│   │   └── pos.py, purchases.py, reports.py, whatsapp.py, feature_requests.py
│   └── services/             # Business logic layer
│       ├── __init__.py       # Re-exports core services
│       ├── ai.py, audit.py, barcode.py, inventory.py, invoices.py, parties.py,
│       ├── pos.py, prompts.py, purchases.py, reports.py
│       ├── payments/         # Payment gateways (Razorpay, Stripe, Mock)
│       └── whatsapp/         # OpenWA WhatsApp integration
└── tests/                    # Pytest test suite (100% passing)
```

---

## 3. Frontend File Structure (`frontend/`)

The frontend follows a **Domain-Driven Feature Slice** pattern organized into `core/`, `components/`, `features/`, `pages/`, and `utils/`.

```text
frontend/src/
├── App.tsx                   # Central router & protected routes
├── main.tsx                  # React DOM bootstrapping
├── index.css                 # Global Tailwind styles & CSS variables
│
├── core/                     # Shared application core & infrastructure
│   ├── api/                  # Authoritative backend API clients
│   │   ├── index.ts          # Barrel export for all API clients
│   │   ├── apiClient.ts      # Axios client with JWT & automatic 401 refresh
│   │   ├── invoices.ts, purchases.ts, inventory.ts, parties.ts, reports.ts
│   ├── constants/            # Global constants (branding, currency)
│   ├── contexts/             # App-wide context providers (Business, Currency)
│   ├── hooks/                # Global and API-connected custom hooks
│   │   ├── index.ts          # Barrel export for all core hooks
│   │   ├── useInvoicesApi.ts, usePurchasesApi.ts, useInventoryApi.ts,
│   │   ├── usePartiesApi.ts, useReportsApi.ts, useSubscription.ts,
│   │   ├── useOfflineData.ts, useOfflineSync.ts, useProductsRealtime.ts,
│   │   └── use-toast.ts, use-mobile.tsx, use-sales-settings.ts
│   ├── integrations/         # External integrations (Supabase client, Gemini AI)
│   ├── lib/                  # Auth provider and shared utilities
│   ├── offline/              # SQLite, OPFS, and IndexedDB sync engine
│   └── utils/                # Barcode, E-invoicing, image compression
│
├── components/               # Cross-feature reusable UI components
│   ├── layout/               # AppLayout, AppSidebar, Header, BottomNav
│   ├── shared/               # Calculator, ThemeToggle, AppAssistantGate
│   └── ui/                   # Shadcn UI primitives (Button, Dialog, Popover, etc.)
│
├── features/                 # Modular domain slices
│   ├── auth/                 # Login, Registration, Salesman Login
│   ├── business/             # Core ERP: Invoicing, Purchases, Inventory, Parties, Banking
│   │   ├── components/       # Modals, dialogs, submodules (banking, orders, purchase, reports)
│   │   ├── hooks/            # useAccountingData.ts, useOrders.ts, index.ts
│   │   ├── pages/            # BusinessDashboard, Sales, Purchases, Parties, Inventory, etc.
│   │   ├── services/         # IFSC lookup, bank reconciliation, statement parsing
│   │   ├── types/            # Order types & state interfaces
│   │   └── utils/            # Payment transcripts, report exports
│   ├── dashboard/            # Personal mode dashboard & AI insights
│   ├── demo/                 # Interactive demo mode & Admin dashboard
│   ├── expenses/             # Expense tracking, smart categorization, bills
│   │   ├── components/, pages/, hooks/
│   ├── groups/               # Split-expense groups
│   ├── landing/              # Marketing website sections & mockups
│   ├── loans/                # Lent & Borrowed money ledgers
│   ├── pos/                  # Point of Sale counter & barcode printing
│   ├── reports/              # Personal financial reports
│   ├── salesman/             # Field sales representative portal
│   ├── settings/             # Store configuration, invoice customizers
│   ├── storefront/           # Public e-commerce customer ordering portal
│   ├── trash/                # Soft-deleted records restoration
│   └── whatsapp/             # WhatsApp messaging dialogs & QR connect
│
├── pages/                    # Top-level standalone routes
│   ├── Index.tsx             # Marketing home / App router entrance
│   ├── Pricing.tsx           # Subscription pricing & checkout
│   ├── PaymentSuccess.tsx    # Payment confirmation
│   ├── PaymentFailure.tsx    # Payment retry & error explanation
│   ├── TermsOfService.tsx    # Legal terms
│   ├── PrivacyPolicy.tsx     # Privacy policy
│   └── NotFound.tsx          # 404 handler
│
└── utils/                    # PDF generators, Excel/CSV exporters, thermal receipts
```
