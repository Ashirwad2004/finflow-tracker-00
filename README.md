# RupayBill

Billing, inventory, payments, storefront, and personal finance application built with React, FastAPI, and Supabase.

The repository has two application workspaces and a shared API contract package:

```text
apps/web/             React + Vite application and production HTTP host
apps/api/             FastAPI service, domain modules, and Python tests
packages/api-types/   OpenAPI export and generated TypeScript contracts
supabase/             Versioned SQL migrations and Deno Edge Functions
scripts/              Repository development and test commands
docs/                 Architecture, setup, feature guides, and review findings
```

Install JavaScript dependencies once from the repository root:

```sh
npm ci
python -m venv .venv
.venv/Scripts/python -m pip install -r apps/api/requirements-dev.txt
```

On macOS/Linux, use `.venv/bin/python` for the last command. Copy `apps/web/.env.example` to `apps/web/.env` and `apps/api/.env.example` to `apps/api/.env`, then fill in the required values. Browser variables must contain only public values; service-role and payment secrets belong to the API environment.

```sh
npm run dev             # Web on :8080 and API on :8000
npm run web:dev          # Web only
npm run api:dev          # API only
npm run lint
npm run typecheck       # Application, build configuration, shared contracts
npm test                # Frontend, backend, and build-tool regression tests
npm run build           # Production bundle with offline asset manifest
npm run server          # Serve the built frontend on :3000 and proxy the API
```

PowerShell users with script execution disabled can invoke `npm.cmd` instead of `npm`.

The Python runner respects an activated virtual environment, otherwise checking `apps/api/.venv`, `apps/api/venv`, then the root `.venv`. Run a backend test subset with `npm run test:api -- -k payments`.

See [developer setup](docs/developer-setup.md), [architecture and folder boundaries](docs/architecture.md), [features](docs/features-guide.md), [database schema](docs/database-schema.md), and [review findings and remaining risks](docs/code-review.md).
