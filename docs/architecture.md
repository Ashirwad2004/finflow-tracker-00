# Architecture and repository structure

## Workspaces

```text
/
  apps/
    web/
      src/
        app/             Application composition, providers, guards, route table
        features/        Domain UI, hooks, types, and calculation services
        core/            API clients, auth, offline storage, sync, shared hooks
        components/      Shared layout, UI primitives, reusable components
        pages/public/    Landing, pricing, legal, and payment result pages
        utils/           Shared export, PDF, and print implementations
        main.tsx         Browser entry point
      public/            Static assets, manifest, service worker
      scripts/           PWA build tooling and its integration tests
      server.js          Production static HTTP host and FastAPI proxy
      Dockerfile         Build from repository root to include shared contracts
    api/
      src/
        main.py          FastAPI composition and middleware
        api/             Shared request dependencies and API v1 router
        core/            Configuration, database clients, authentication, limits
        modules/         Domain routers, schemas, services, repositories
      tests/             Isolated Python regression tests
  packages/api-types/    Generated API contracts and export scripts
  supabase/
    migrations/          Ordered, append-only database history
    functions/           Deno Edge Functions
  scripts/api.py         Cross-platform development and test runner
  docs/                  Maintained documentation and historical SQL reference
  package.json           Workspace orchestration
  package-lock.json      Single JavaScript dependency lockfile
  docker-compose.yml     API and frontend container wiring
```

## Boundaries

Use `@/app/App` as the application entry. Feature screens belong to their domain under `features/`; the central route table composes them. Shared React primitives belong to `components/`, infrastructure to `core/`, and document rendering to `utils/`. Import a domain's actual module instead of adding a second implementation or a forwarding compatibility file.

The API follows `router -> service -> repository` within `src/modules/<domain>/`. Use `src.core` and `src.modules` imports consistently. The shared API v1 router only registers domain routers. Keep backend tests outside source modules.

`packages/api-types` is an active workspace, not disposable build output. Exporting contracts imports the FastAPI app and therefore requires installed Python dependencies and a configured environment. Generated contracts should be regenerated together with API schema changes and reviewed.

## Data and financial boundaries

The browser renders views, computes previews, and stores offline changes in IndexedDB/SQLite. It calls the API and Supabase; the API also calls privileged database RPCs. Consequently, access checks and money/inventory invariants must be enforced in the database as well as the API. Client validation alone does not protect directly callable RPCs.

Use the shared sales calculation engine for invoice previews and client save payloads. Preserve payment transcripts embedded in bill notes and the offline sync payload allowlist. Changes to invoice, refund, tax, stock, or ledger calculations need regression coverage.

Offline browser storage can be evicted or cleared; it is not a backup guarantee. The service worker precaches the built application assets and bypasses API/authentication traffic. Offline mutations and replay are handled by `core/offline` and require separate reconciliation testing.

Versioned SQL migrations are the schema history. Keep historical migration files intact. Reference scripts in `docs/sql-archive` are not deployment entry points and should not be replayed against production.

See [code review](code-review.md) for verified changes and database/runtime issues that still need integration testing.
