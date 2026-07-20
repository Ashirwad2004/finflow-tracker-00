# 🧠 FinFlow Tracker - Repository Brain (`brian.md` / `brain.md`)

> **Note**: This file is an alias/mirror for [brain.md](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/brain.md).

---

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
├── brain.md                   # 🧠 Core repository memory & architectural reference
├── brian.md                   # Alias copy of brain.md
├── package.json               # Monorepo scripts (concurrently runner for dev servers)
├── vite.config.ts             # Vite build & alias configuration
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
│       ├── components/        # Layout, Shared, UI primitives (shadcn UI)
│       ├── core/              # Contexts (BusinessContext, CurrencyContext), Supabase client, Auth
│       ├── features/          # Auth, Business, Dashboard, Expenses, Groups, Loans, Storefront, Settings
│       ├── pages/             # Route-level components (Index, NotFound, PaymentSuccess, PrivacyPolicy)
│       └── utils/             # Helper functions (currency, dates, PDF generation)
│
├── supabase/                  # Supabase Ecosystem Configurations
│   └── migrations/            # 60+ Version-controlled PostgreSQL SQL migrations
│
├── backend/                   # FastAPI Python Microservice (Optional API Layer)
└── docs/                      # Technical Documentation (database-schema, developer-setup, etc.)
```

---

## 🗄️ Database Architecture & Key Schemas

The application database is hosted on **Supabase (PostgreSQL)** secured by **Row Level Security (RLS)**.

- **`profiles`**: User details, settings, business mode toggle (`is_business_mode`), business details (GSTIN, logo, bank details).
- **`expenses`**: Personal expense records (`user_id`, `amount`, `category`, `date`, `description`, `receipt_url`, `is_deleted`).
- **`group_expenses` & `group_members`**: Shared group bill splitting and settlement records.
- **`loans`**: Peer-to-peer lent and borrowed records (`amount`, `due_date`, `status`, `repayments`).
- **`products` & `inventory_logs`**: Commercial product inventory (`sku`, `selling_price`, `stock_quantity`, `rack_location`, `hsn_code`).
- **`sales` & `sales_items`**: GST sales transactions, customer links, tax calculations, balance due.
- **`purchases` & `purchase_items`**: Vendor purchases and tax input credit tracking.
- **`parties`**: CRM directory for Customers & Suppliers (`name`, `party_type`, `phone`, `gstin`, `current_balance`).
- **`storefront_orders`**: Public online storefront orders with realtime status sync.
- **`salesmen` & `salesman_permissions`**: Store staff accounts with configurable permissions.

---

## ⚡ Developer Commands Quick Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs frontend dev server + backend concurrently |
| `npm run dev --workspace=frontend` | Launches Vite React frontend at `http://localhost:5173` |
| `npm run build --workspace=frontend` | Compiles TypeScript and builds production frontend bundle |
| `npm run backend:dev` / `python run-backend.py` | Starts local Python FastAPI backend service |

---
