# 🧠 FinFlow Tracker - Repository Brain & Architecture Reference (`brain.md`)

This document serves as the **central memory index** for the FinFlow Tracker codebase. It provides a complete, structured overview of system architecture, technology stack, directory layout, database schema, state management, routing, and development workflows—allowing AI assistants and developers to quickly understand the codebase without needing to scan all files.

---

## 📌 Executive Summary

**FinFlow Tracker** (`finflow-tracker-monorepo`) is a dual-mode financial management ecosystem:
1. **Personal Finance**: Expense tracking, category budgets, group bill splitting, peer-to-peer loans (lent/borrowed money), and AI-assisted entry parsing.
2. **Business ERP / Merchant Mode**: GST-compliant sales & purchase journals, live inventory control, customer & supplier CRM (parties), PDF invoice generation, salesman staff permissions, GSTR-1 tax reporting, and public online e-commerce storefronts.

---

## 🛠️ Technology Stack

| Layer | Technology / Libraries | Key Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, Vite, TypeScript | Fast HMR, strong type-safety, component modularity. |
| **Styling & UI** | Tailwind CSS, Radix UI, `shadcn/ui`, Lucide Icons | Responsive modern design system with dynamic dark/light themes. |
| **State & Caching** | `@tanstack/react-query` | Offline-first query caching (`networkMode: "offlineFirst"`), auto-refetch, server state management. |
| **Routing & Auth** | `react-router-dom` v6, Supabase Auth (`GoTrue`) | Protected routes, role-based redirects, auth context wrappers. |
| **Database Engine** | Supabase (PostgreSQL) | Relational database, Row Level Security (RLS), Realtime WebSocket updates, Storage Buckets. |
| **Edge Functions** | Supabase Deno Edge Functions | Serverless endpoints for AI integration & background jobs. |
| **Backend Service** | Python (FastAPI, SQLAlchemy, Alembic) | Optional local/cloud Python API service (`backend/`). |
| **AI Integration** | Google Gemini API (2.5 Flash / 1.5 Flash) | AI Chat Accountant, Smart Expense Input parser, Magic Add, Bill OCR parser. |
| **Document Generation** | `jspdf`, `jspdf-autotable`, `xlsx` | PDF invoice printing, GSTR-1 JSON/Excel report exports. |

---

## 📁 Repository Directory Structure

```
finflow-tracker-00-1/
├── brain.md                   # 🧠 [THIS FILE] Core repository memory & architectural reference
├── brian.md                   # Reference copy of brain.md
├── package.json               # Monorepo scripts (concurrently runner for dev servers)
├── vite.config.ts             # Vite build & alias configuration (@ -> frontend/src or src)
├── tsconfig.json              # TypeScript root configuration
├── docker-compose.yml         # Container orchestration setup
├── run-backend.py             # Python FastAPI launcher script
│
├── frontend/                  # Main React Frontend Application
│   ├── package.json           # Frontend dependencies (React, Vite, Tailwind, TanStack Query)
│   ├── server.js              # Express static server helper for local production previews
│   └── src/
│       ├── main.tsx           # React entrypoint
│       ├── App.tsx            # Main router & root context providers
│       ├── App.css / index.css# Global styling, design tokens, responsive CSS rules
│       ├── components/
│       │   ├── layout/        # AppLayout, Sidebar, Navbar, MobileNav, ModeToggle
│       │   ├── shared/        # AssistantGate, ThemeToggle, Dialog primitives
│       │   └── ui/            # shadcn UI components (button, dialog, toast, dropdown, card, input)
│       ├── core/
│       │   ├── contexts/      # BusinessContext (Personal vs Business mode), CurrencyContext
│       │   ├── hooks/         # Custom React hooks (useAuth, useBusiness, useOfflineCache)
│       │   ├── integrations/  # Supabase client singleton & auto-refresh auth tokens
│       │   └── lib/           # Auth utilities and profile sync helpers
│       ├── features/          # Modular feature-driven domains:
│       │   ├── auth/          # Login, SignUp, ResetPassword, SalesmanLogin
│       │   ├── business/      # Sales, Purchases, Inventory, Parties, Reports, OnlineStore, PrintStudio
│       │   ├── dashboard/     # Financial overview widgets, charts, quick action cards
│       │   ├── demo/          # Admin demo dashboard & seed utilities
│       │   ├── expenses/      # AllExpenses, SmartExpenseInput, MagicAddExpense, BillUpload
│       │   ├── groups/        # Groups listing, GroupDetail bill splits, JoinGroup links
│       │   ├── landing/       # Public landing page & marketing hero sections
│       │   ├── loans/         # LentMoney & BorrowedMoney peer tracking with repayment logs
│       │   ├── reports/       # Personal expense reports & category breakdown charts
│       │   ├── salesman/      # Staff POS interface & salesman dashboard
│       │   ├── settings/      # Settings page, BudgetSection, NotificationSettings (Email/WhatsApp)
│       │   ├── storefront/    # Public customer online shop, cart drawer, checkout modal
│       │   └── trash/         # Soft-deleted item recovery & purge page
│       ├── pages/             # Route-level components (Index, NotFound, PaymentSuccess, PrivacyPolicy)
│       └── utils/             # Helper functions (currency formatting, date formatters, PDF utils)
│
├── supabase/                  # Supabase Ecosystem Configurations
│   ├── config.toml            # Supabase CLI configuration
│   └── migrations/            # 60+ Version-controlled PostgreSQL SQL migrations:
│       ├── 20260404133715_add_online_store.sql
│       ├── 20260515100000_auth_system_revamp.sql
│       ├── 20260624000000_add_store_salesmen.sql
│       ├── 20260718120000_gstr1_schema_and_rpc.sql
│       └── 20260719180000_add_email_to_notification_settings.sql
│
├── backend/                   # FastAPI Python Microservice (Optional API Layer)
│   ├── main.py                # FastAPI server application initialization
│   ├── alembic/               # Python SQLAlchemy database migrations
│   ├── requirements.txt       # Python dependencies (fastapi, sqlalchemy, uvicorn, pydantic)
│   └── src/
│       ├── api/v1/            # API routers (ai.py, feature_requests.py)
│       ├── core/              # Security and config settings
│       └── db/                # Models and DB session management
│
└── docs/                      # Technical Documentation
    ├── database-schema.md     # In-depth SQL tables, relationships & RLS policies
    ├── developer-setup.md     # Environment setup and deployment instructions
    ├── features-guide.md      # End-user feature documentation
    └── product-overview.md    # Product architecture & system design diagrams
```

---

## 🗄️ Database Architecture & Key Schemas

The application database is hosted on **Supabase (PostgreSQL)** secured by **Row Level Security (RLS)**.

### Core Tables & Domains

1. **`profiles`**: User details, settings, business mode toggle (`is_business_mode`), business details (GSTIN, trade name, logo URL, currency, bank details).
2. **`expenses`**: Personal expense records (`id`, `user_id`, `amount`, `category`, `date`, `description`, `receipt_url`, `is_deleted`).
3. **`group_expenses` & `group_members`**: Shared group bill splitting with equal/custom weight splits and settlement records.
4. **`loans`**: Peer-to-peer lent and borrowed records (`lender_name`, `borrower_name`, `amount`, `due_date`, `status`, `repayments`).
5. **`products` & `inventory_logs`**: Commercial product inventory (`sku`, `name`, `selling_price`, `purchase_price`, `stock_quantity`, `min_stock_alert`, `rack_location`, `hsn_code`, `image_url`).
6. **`sales` & `sales_items`**: GST sales transactions, customer links, subtotal, SGST/CGST/IGST, discount, payment status (`paid`, `partial`, `pending`), balance due.
7. **`purchases` & `purchase_items`**: Vendor purchases, input tax credit, supplier link, invoice numbers.
8. **`parties`**: CRM directory for Customers & Suppliers (`name`, `party_type`, `phone`, `email`, `gstin`, `opening_balance`, `current_balance`).
9. **`storefront_orders`**: Public online storefront orders (`order_number`, `customer_name`, `phone`, `delivery_address`, `total_amount`, `status`, `items` JSONB).
10. **`salesmen` & `salesman_permissions`**: Store staff accounts with configurable feature permissions (can create sales, view inventory, manage purchases).
11. **`notification_settings`**: Alert configurations for Email and WhatsApp notifications (due payment reminders, low stock alerts).
12. **`gstr1_*` / Tax Tables**: Compliance schemas for GSTR-1 B2B, B2C, Amendments, and HSN summary exports via RPC functions.

---

## 🔄 Core Application State & Workflows

### 1. Dual Mode System (Personal vs. Business)
- Controlled via `BusinessContext` ([`frontend/src/core/contexts/BusinessContext.tsx`](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/frontend/src/core/contexts/BusinessContext.tsx)).
- When `isBusinessMode` is `true`, the layout sidebar renders Business routes (Sales, Purchases, Inventory, Parties, Reports, Online Store, Print Studio).
- When `false`, the layout renders Personal routes (Dashboard, All Expenses, Groups, Lent Money, Borrowed Money, Reports).

### 2. Offline-First & Query Strategy
- Configured in [`frontend/src/App.tsx`](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/frontend/src/App.tsx):
  - `staleTime`: 5 minutes (prevents redundant re-fetches).
  - `gcTime`: 15 minutes.
  - `networkMode`: `"offlineFirst"` (prevents UI freeze when network connectivity fluctuates).
- Local mutation fallbacks allow instant optimistic UI updates.

### 3. AI Integrations (Gemini Flash)
- **AI Assistant Chat**: Floating accountant widget (`AIAssistantChat`) using ground context (recent transactions, balances, inventory status).
- **Smart Expense Input**: Parses natural language input (e.g. `"Lunch 250 with team"`) into structured expense properties.
- **Magic Add**: Parses combined sentences containing multiple entries, expenses, and loan notes in a single action.
- **Bill OCR**: Extracts receipt text, amounts, dates, and vendors directly from image uploads.

### 4. Online Storefront & Realtime Orders
- Public store available at `/store/:storeSlug` or `/storefront`.
- Live stock checks prevent over-purchasing.
- Orders placed by customers trigger Supabase Realtime notifications on the merchant dashboard.

---

## ⚡ Developer Commands Quick Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs frontend dev server + backend concurrently |
| `npm run dev --workspace=frontend` | Launches Vite React frontend at `http://localhost:5173` |
| `npm run build --workspace=frontend` | Compiles TypeScript and builds production frontend bundle |
| `npm run backend:dev` / `python run-backend.py` | Starts local Python FastAPI backend service |
| `docker-compose up -d` | Launches Dockerized full-stack services |

---

> [!NOTE]
> Keep this `brain.md` updated whenever new major features, database tables, or core architecture patterns are added to the codebase.
