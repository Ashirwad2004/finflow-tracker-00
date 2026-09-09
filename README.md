# FinFlow Tracker 🚀✨

FinFlow Tracker is a premium, high-performance financial management ecosystem. It seamlessly blends personal financial planning (expenses, budget goals, group splits, peer-to-peer loans) with robust commercial operations tools (GST-compliant sales/purchase journals, real-time inventory tracking, CRM, invoice generation, and customer-facing digital e-commerce storefronts).

---

## 🤖 Premium Gemini AI Features (Grounded & Trained)

FinFlow is fully integrated with Google's **Gemini 2.5 Flash** models, designed to act as your virtual accountant, business co-pilot, and natural language assistant.

*   **💬 FinFlow AI Chat Accountant (`AIAssistantChat`)**: A floating assistant powered by Gemini that dynamically reads your local cash flow context (last 50 expenses, debts, business sales ledger, and product inventory) to answer complex financial questions, calculate revenue statistics, and guide you step-by-step through the application.
*   **✨ AI Smart Fill (`SmartExpenseInput`)**: An in-context trained parser that maps natural language entries (e.g. *"Starbucks coffee 150"*, *"₹1200 electricity bill"*) directly into structured expense fields (amount, description, category) matching your configured account categories.
*   **🪄 Magic Add (`MagicAddExpense`)**: A natural language bar on your dashboard. Type complex sentences like *"Spent 400 on cab yesterday and Rahul borrowed 500"* to automatically parse and record multiple entries (expenses, lent books, or borrowed books) with relative dates and names.
*   **📷 AI Bill Scanner OCR (`BillUpload`)**: Upload a photo of your receipt (JPEG/PNG) to let Gemini extract the merchant name, total, date, tax amounts, and suggest the best category instantly.

---

## Documentation Hub

We have prepared structured developer guides inside the `/docs` directory:

*   **[Product Overview & Architecture](docs/product-overview.md)**: System vision, service boundaries, and repository layout.
*   **[Feature Manual & User Guide](docs/features-guide.md)**: Personal finance, groups, loans, business mode, and storefront workflows.
*   **[Database Schema & Security](docs/database-schema.md)**: Supabase tables, migrations, storage, and Row-Level Security (RLS).
*   **[Developer Setup & Deployment](docs/developer-setup.md)**: Local development, environment variables, migrations, and deployment.

---

## 🛠️ Technology Stack

*   **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Radix/shadcn UI, Recharts
*   **Backend**: Optional FastAPI service under `backend/`, proxied at `/api/v1`
*   **Data platform**: Supabase PostgreSQL, Auth, Storage, Realtime, and RLS
*   **Serverless logic**: Supabase Deno Edge Functions
*   **AI integration**: Google Gemini 2.5 Flash through the backend or `gemini-proxy` Edge Function

---

## ⚙️ Environment Configuration

Create `frontend/.env` for browser-exposed Supabase settings:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-pub-key
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser. Put server-only values in `backend/.env` instead:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
ENVIRONMENT=development
SHOW_DOCS=true
```

For the Supabase Edge Function fallback, configure the key separately with `supabase secrets set GEMINI_API_KEY=your-gemini-api-key`.

---

## 🦕 Editor & Deno Workspace Setup

The project co-exists with a Deno-based edge functions environment (`supabase/functions/`). To prevent type conflicts between Node/React files and Deno edge files in VS Code, we use workspace paths settings.

If using VS Code, ensure `.vscode/settings.json` is configured as follows:
```json
{
  "deno.enable": true,
  "deno.enablePaths": [
    "supabase/functions"
  ],
  "deno.importMap": "supabase/functions/import_map.json"
}
```
This isolates Deno intelligence exclusively to the `supabase/functions/` directory, resolving editing red lines while preserving React TypeScript compilation in the root.

---

## Developer Scripts

```sh
# Clone repository
git clone <YOUR_GIT_URL>
cd finflow-tracker-00-1

# Install workspace packages
npm install

# Start Vite and FastAPI together
npm run dev
```

The Vite development server runs at `http://localhost:8080` and proxies API calls to FastAPI at `http://localhost:8000`. Useful commands:

```sh
npm run frontend:dev   # frontend only
npm run backend:dev    # FastAPI only
npm run build          # production frontend build
npm run lint           # frontend ESLint
npm run test:backend   # backend pytest suite
```

For the production-style containers, copy the frontend variables into a root `.env` file and run `docker compose up -d --build`. The frontend is available at `http://localhost:3000`; see the [Developer Setup](docs/developer-setup.md) for the full workflow.
