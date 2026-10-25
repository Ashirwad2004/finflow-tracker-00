# Developer setup and deployment

## Local development

Use Node.js 22 and Python 3.11 or later. Run commands from the repository root unless a command says otherwise.

```sh
npm ci
python -m venv .venv
```

Install Python dependencies with `.venv/Scripts/python -m pip install -r apps/api/requirements-dev.txt` on Windows, or `.venv/bin/python -m pip install -r apps/api/requirements-dev.txt` on macOS/Linux. Activation is optional for `scripts/api.py`; it discovers these environments automatically.

Copy the checked-in `apps/web/.env.example` and `apps/api/.env.example` files to `.env` in their respective directories. Configure the public Supabase URL/key for the browser. Configure the service-role key, payment gateway, webhook secrets, and any AI/WhatsApp credentials only in the API environment. `VITE_API_URL` may be empty when the frontend and API use the same-origin proxy.

```sh
npm run dev
npm run web:dev
npm run api:dev
```

The frontend is at `http://localhost:8080`; the API is at `http://localhost:8000`. Vite proxies `/api` to the API. Check `/health` for connectivity. Set `ENVIRONMENT=development` or `SHOW_DOCS=true` to enable API documentation at `/docs`.

The root `package-lock.json` manages both JavaScript workspaces. Do not create a nested lockfile or run a second frontend dependency install in CI.

## Checks

```sh
npm run lint
npm run typecheck
npm run test:web
npm run test:api
npm run test:tooling
npm run build
```

`typecheck` checks the actual application and Vite configurations as well as shared contracts. `test:tooling` runs the built service worker against a cache fixture. `build` must successfully inject the generated asset manifest; it fails if the service worker no longer exposes the expected declarations.

Run a focused Python test with `npm run test:api -- -k <test_name>`. Generate API contracts with `npm run types:generate` after installing Python dependencies and configuring the API environment; review changes to both `packages/api-types/openapi.json` and `src/generated.ts`.

## Database

Use `supabase/migrations/` as ordered database history. Preserve existing migration filenames and contents. New database changes need a new migration and verification against an isolated database. `docs/sql-archive/` contains old reference scripts, not an alternative setup flow.

The CLI's generated `.temp/` and `.branches/` state is local and ignored. Do not commit linked-project caches, connection metadata, or database credentials.

## Production host

```sh
npm run build
npm run server
```

The Express host serves `apps/web/dist` on port 3000 and proxies the API and `/health`. Set `BACKEND_HOST`, `BACKEND_PORT`, and `PORT` as needed. The backend entry point is `uvicorn src.main:app --host 0.0.0.0 --port <port>` with working directory `apps/api`.

For Docker, copy the public frontend values into a root `.env` used by Compose interpolation, configure `apps/api/.env`, then run:

```sh
docker compose config
docker compose up -d --build
```

The frontend Dockerfile uses repository-root context so shared workspace contracts and the root lockfile are available. The runtime image runs as the unprivileged `node` user. The frontend listens on port 3000 and the API on port 8000.

Existing Vercel configurations support repository-root or `apps/web` hosting, and `render.yaml` describes the API service. Changes here do not deploy or modify cloud resources. Configure public frontend variables during the build and server-only variables on the API service. Confirm hosting rewrites for `/api` and SPA navigation before deployment.

## Release validation still required

Local unit checks do not prove payment-provider behavior, SQL concurrency, browser camera/printing, offline replay, or tenant isolation in the deployed database. Review [known findings](code-review.md), run integration tests on an isolated database, and perform payment sandbox and browser smoke tests before a production rollout.
