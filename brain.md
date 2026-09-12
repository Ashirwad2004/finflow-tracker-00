# FinFlow Tracker — AI Brain

> Minimal context map for AI agents. Read this first, then inspect the repository.
> **Never guess. Source code and migrations are the final authority.**

## Product

India-focused financial/business SaaS with two modes.

* Personal: expenses, budgets, groups, loans, reports, AI assistance.
* Business: sales, purchases, inventory, parties, invoices, GST, reports, staff, storefront.

## Stack

```text
Frontend: React + Vite + TypeScript
UI: Tailwind + shadcn/ui + Radix + Lucide
State: TanStack Query
Routing: React Router
Auth/DB: Supabase Auth + PostgreSQL
Security: PostgreSQL RLS
Realtime/Storage: Supabase
Backend: Python + FastAPI + SQLAlchemy + Alembic
AI: Google Gemini
Deploy: Vercel
```

## Repository

```text
/
├── AI/RULES.md
├── brain.md
├── frontend/
│   └── src/
│       ├── components/
│       ├── core/
│       ├── features/
│       │   ├── auth/
│       │   ├── business/
│       │   ├── dashboard/
│       │   ├── expenses/
│       │   ├── groups/
│       │   ├── loans/
│       │   ├── reports/
│       │   ├── salesman/
│       │   ├── settings/
│       │   ├── storefront/
│       │   └── trash/
│       ├── pages/
│       └── utils/
├── backend/
├── supabase/migrations/
└── docs/
```

## Architecture

```text
UI → Features/Hooks → TanStack Query/Services
  → Supabase and/or FastAPI → PostgreSQL
```

Shared frontend infrastructure: `frontend/src/core/`

Shared UI: `frontend/src/components/`

Business mode: `frontend/src/core/contexts/BusinessContext.tsx`

Do not create duplicate mode/state architecture.

## Database

Supabase PostgreSQL is the primary database.

Major domains:

```text
profiles
expenses
groups
loans / repayments
products / inventory
sales / purchases
parties
storefront_orders
salesmen / permissions
GST / GSTR-1
```

These are navigation hints only.

**Inspect `supabase/migrations/` before relying on schema, RLS, relationships, triggers, functions, or RPCs.**

## Critical Areas

Treat these as high-risk:

```text
Authentication / authorization
RLS
Invoices / sales / purchases
GST
Payments / balances
Inventory
Financial reports
AI-generated financial data
```

Never trust client-provided financial values or AI output.

## AI Workflow

```text
brain.md
→ AI/RULES.md
→ understand task
→ locate relevant code
→ inspect implementation
→ inspect migrations/tests when needed
→ trace data flow
→ find root cause/design
→ make smallest correct change
→ verify
```

Do not read the entire repository unless necessary.

## Source of Truth

```text
1. Database migrations/schema
2. Source code
3. Tests
4. API/types/contracts
5. docs/
6. brain.md
7. AI assumptions
```

Never invent files, APIs, database fields, relationships, or business rules.

## Documentation

`brain.md` = project map.

`AI/RULES.md` = coding/safety rules.

`docs/` = detailed knowledge.

Keep `brain.md` small. Update it only when the architecture, major domains, stack, or repository structure changes.

# Core Principle

**Inspect first. Change minimally. Preserve security and financial correctness. Verify before declaring success.**
