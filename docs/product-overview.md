# Product Overview & Architecture

Welcome to **FinFlow Tracker** , a modern, comprehensive, and high-performance financial management ecosystem. FinFlow is designed to be the ultimate dual-purpose financial ledger—serving both individual users (personal expense tracking, group split calculations, peer loans) and small-to-medium merchants (GST-compliant sales and purchases bookkeeping, live inventory control, customer relations, and instant public digital storefronts).

---

## 🌟 The Vision
Most financial trackers force a division between **personal finance** and **business ledgering**. FinFlow bridges this gap:
1.  **For Individuals**: A slick, intuitive, and modern portal to upload receipts, split bills with roommates, track lent/borrowed money, and analyze personal spending.
2.  **For Businesses**: A full-scale micro-ERP system. A merchant can enable "Business Mode" to unlock inventory tracking, parties directory (customer/supplier CRM), Sales/Purchases journals, a PDF Print Studio, and launch an active digital store in seconds.

---

## 🏗️ High-Level System Architecture

FinFlow is designed around a decoupled, cloud-first architecture optimized for speed, reliability, offline resilience, and real-time database state synchronization.

```mermaid
graph TD
    %% Clients
    subgraph Clients["User & Customer Clients"]
        Dashboard["Merchant/User Dashboard (React)"]
        Storefront["Public E-Commerce Storefront (React)"]
    end

    %% Edge Router & Gateway
    SupabaseGateway["Supabase Edge & Gateway"]

    %% Database and Auth
    subgraph DatabaseEngine["Supabase Cloud Platform"]
        Auth["GoTrue Auth Service"]
        DB[("PostgreSQL DB (Schema & RLS)")]
        Storage["Storage Buckets (Invoices & Product Images)"]
        Realtime["Postgres Realtime Replication"]
    end

    %% Local Python Backend Services
    subgraph LocalServices["Optional Python Backend Service"]
        FastAPI["FastAPI Web Server"]
        Migrations["Supabase SQL Migrations"]
        Edge["Deno Edge Functions"]
    end

    %% Connections
    Dashboard -->|HTTPS / WSS| SupabaseGateway
    Storefront -->|HTTPS / WSS| SupabaseGateway
    
    SupabaseGateway --> Auth
    SupabaseGateway --> DB
    SupabaseGateway --> Storage
    SupabaseGateway --> Realtime

    Dashboard -.->|Optional API Sync| FastAPI
    FastAPI -.->|Supabase client| DB
    Migrations -.->|Schema Version Control| DB
    Edge -.->|Serverless workflows| DB
```

### Architectural Pillars:
*   **Offline-First Data Access**: React Query and the IndexedDB-backed offline layer cache reads and queue supported writes for background synchronization when connectivity returns.
*   **Real-time Synchronization**: Uses Supabase Realtime (WebSockets) to synchronize storefront orders and inventory stock levels instantly between the customer storefront and merchant dashboard.
*   **Row-Level Security (RLS)**: Every single table in the PostgreSQL database is secured using context-aware RLS policies. A user can only read and write data that belongs to them or groups they are verified members of.
*   **Modular Component Organization**: Divided strictly by "features" to ensure frontend code remains clean, testable, and highly decoupled.

---

## 🛠️ Technology Stack

FinFlow is built with modern, industry-standard technologies:

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | React 18, TypeScript, Vite | Fast compilation, component modularity, and strict type safety. |
| **Styling** | Tailwind CSS, CSS Variables | Responsive, utility-driven layout with custom color systems. |
| **UI Components** | Radix UI, shadcn/ui | Accessible, customizable components (dialogs, charts, selects). |
| **State & Cache** | TanStack Query (React Query) | Server state management, auto-refetching, and cache optimization. |
| **Database & Auth** | Supabase, PostgreSQL | Relational storage, Real-time channels, Row Level Security. |
| **Storage** | Supabase Storage | File storage for invoices, receipts, and product photos. |
| **Optional Backend** | FastAPI, Pydantic, SlowAPI | AI, payment, health, and utility API routes. |
| **DB Migrations** | Supabase SQL migrations | Version-controlled database schema states in `supabase/migrations/`. |

---

## 📂 Codebase Directory Structure

```
finflow-tracker/
├── backend/                  # Optional FastAPI Python service
│   ├── src/
│   │   ├── api/v1/           # Versioned API routes
│   │   ├── core/             # Settings, security, AI, and rate limiting
│   │   └── services/         # AI, payments, and domain services
│   ├── tests/                # Backend pytest suite
│   ├── Dockerfile
│   └── requirements.txt      # Python dependencies
├── docs/                     # Documentation hub
│   ├── sql-archive/          # Historical SQL query scripts
│   ├── product-overview.md   # [This File] High level architecture
│   ├── features-guide.md     # Detailed user-facing feature guide
│   ├── database-schema.md    # Detailed database table schemas and RLS
│   └── developer-setup.md    # Local setup and deployment manual
├── frontend/                 # React/Vite frontend workspace
│   ├── src/                  # Application source
│   ├── public/               # Static assets and service worker
│   ├── vite.config.ts        # Dev server (port 8080) and API proxy
│   └── package.json
├── package.json              # Root workspace scripts
├── docker-compose.yml        # Frontend and backend containers
├── run-backend.py            # Cross-platform FastAPI runner
└── supabase/                 # Supabase configuration and migrations
    ├── functions/            # Deno Edge Functions
    └── migrations/           # Database source of truth
```

The frontend source is organized as follows:

```
frontend/src/
│   ├── components/
│   │   ├── layout/           # AppLayout, Sidebars, Header, Navigation
│   │   ├── shared/           # AssistantGate, ThemeToggle, Dialogs
│   │   └── ui/               # Primitive shadcn-ui components
│   ├── core/
│   │   ├── contexts/         # React Contexts (Currency, Business context)
│   │   ├── hooks/            # Custom React hooks (offline cache, etc.)
│   │   └── lib/              # Auth wrappers (auth.tsx) and Supabase client
│   ├── features/             # Feature-based pages and component splits
│   │   ├── auth/             # Login & SignUp processes
│   │   ├── business/         # Sales, Purchases, Parties, Live Inventory
│   │   ├── storefront/       # Public-facing merchant e-commerce shop
│   │   ├── expenses/         # Personal ledger, Magic Add, Bill upload
│   │   ├── groups/           # Bill splits and Invite mechanisms
│   │   └── loans/            # Lent & Borrowed peer-to-peer tracking
│   ├── pages/                # Page route endpoints (Index, NotFound)
│   ├── App.tsx               # Main routing map & provider wrapper
│   └── index.css             # Root Tailwind / CSS configurations
```