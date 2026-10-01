# RupayBill — Target Folder Structure

## 1. Monorepo Organization

```text
finflow-tracker-monorepo/
├── package.json              # Monorepo workspaces definition
├── tsconfig.json             # Root TypeScript project references
├── run-backend.py            # Backend development runner
├── docker-compose.yml        # Orchestration configuration
├── docs/                     # Canonical architectural documentation
│   ├── architecture.md
│   ├── folder-structure.md
│   ├── business-domains.md
│   ├── database.md
│   └── migration-notes.md
├── supabase/                 # Supabase migrations & Deno functions
│   ├── migrations/
│   └── functions/
├── backend/                  # FastAPI microservice
│   ├── src/
│   │   ├── api/
│   │   ├── core/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── services/
│   └── tests/
└── frontend/                 # React 18 + Vite frontend
    └── src/
```

---

## 2. Target Frontend Architecture (`frontend/src/`)

```text
frontend/src/
├── app/
│   ├── App.tsx                   # Top-level composition & route tree
│   ├── routes.tsx                # Centralized route table & guards
│   ├── providers/                # Top-level React context providers
│   │   ├── AppProviders.tsx
│   │   ├── AuthProvider.tsx
│   │   ├── BusinessProvider.tsx
│   │   ├── CurrencyProvider.tsx
│   │   └── QueryProvider.tsx
│   └── guards/                   # Navigation protection guards
│       ├── ProtectedRoute.tsx
│       ├── MerchantRoute.tsx
│       ├── SalesmanRoute.tsx
│       └── AdminRoute.tsx
│
├── pages/                        # Thin routing views that render feature containers
│   ├── dashboard/
│   ├── sales/
│   ├── purchases/
│   ├── pos/
│   ├── inventory/
│   ├── parties/
│   ├── payments/
│   ├── banking/
│   ├── gst/
│   ├── reports/
│   ├── expenses/
│   ├── loans/
│   ├── storefront/
│   ├── settings/
│   └── public/                   # Marketing, Pricing, Terms, Privacy, 404
│
├── features/                     # Domain-Driven Feature Slices
│   ├── sales/                    # Invoices, Quotations, Sale Orders, Returns
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── purchases/                # Purchase Bills, Purchase Orders, Debit Notes
│   ├── pos/                      # Billing counter, Barcode, Shifts, Held bills
│   ├── inventory/                # Stock items, Categories, Units, Barcode generator
│   ├── parties/                  # Customers, Suppliers, Ledgers, Statements
│   ├── payments/                 # Universal Payment In/Out, Vouchers, Transcripts
│   ├── banking/                  # Bank accounts, Reconciliation, Passbook, Cheques
│   ├── gst/                      # GSTR-1, GSTR-2B, GSTR-3B, Tax audit tables
│   ├── reports/                  # P&L, Daybook, Balance sheet, Analytics studio
│   ├── expenses/                 # Expense vouchers, Categories, Receipts
│   ├── loans/                    # Lent / Borrowed money trackers
│   ├── storefront/               # Public e-commerce portal, Cart, Order timeline
│   ├── salesman/                 # Field rep portal & commission logs
│   ├── loyalty/                  # Loyalty programs & SMS/WhatsApp campaigns
│   ├── print-studio/             # Invoice templates, Thermal slips, Label printer
│   ├── whatsapp/                 # OpenWA integration, Automated messaging
│   └── trash/                    # Soft-delete recovery center
│
├── components/                   # Shared Presentational UI Primitives
│   ├── ui/                       # Shadcn / Radix primitives (Button, Dialog, Table...)
│   ├── layout/                   # AppLayout, AppSidebar, Header, BottomNav
│   └── shared/                   # Calculator, ThemeToggle, ErrorBoundary, StatCards
│
├── core/                         # Shared Cross-Cutting Infrastructure
│   ├── api/                      # Authoritative Axios microservice clients
│   ├── integrations/             # Supabase client, Gemini AI client
│   ├── offline/                  # Dexie IndexedDB, SQLite, OPFS & Sync Engine
│   └── lib/                      # Base utilities & classname mergers
│
├── utils/                        # Pure mathematical & formatting utilities
│   ├── currency.ts               # INR formatting, symbol localization
│   ├── dates.ts                  # Safe date parser, ISO formatters
│   ├── gst.ts                    # Statutory tax matrices & HSN validation
│   ├── pdf/                      # jsPDF invoice, order & statement generators
│   └── export/                   # Excel & CSV data streaming exporters
│
└── types/                        # Core shared domain types & DTO definitions
    ├── auth.ts
    ├── billing.ts
    ├── inventory.ts
    └── common.ts
```
