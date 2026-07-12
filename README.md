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

## 📖 Documentation Hub

We have prepared structured developer guides inside the `/docs` directory:

*   **[Product Overview & Architecture](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/product-overview.md)**: System vision, client-server models, and directory architectures.
*   **[Feature Manual & User Guide](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/features-guide.md)**: In-depth usage guide for Personal, Groups, Loans, Business Mode, and storefront checkouts.
*   **[Database Schema & Security](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/database-schema.md)**: Database tables, triggers, and Row-Level Security (RLS) policies.
*   **[Developer Setup & Deployment](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/developer-setup.md)**: Step-by-step instructions for database migrations and edge deployment.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite, TypeScript, Tailwind CSS, Shadcn UI, Recharts)
*   **Backend & DB**: Supabase (PostgreSQL, Storage buckets, Row-Level Security)
*   **Serverless Logic**: Supabase Deno Edge Functions
*   **AI Integration**: Google Gemini API via secure Edge Function Proxy

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-pub-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

To configure the AI proxy, add your Gemini API Key to your Supabase Edge Function environment:
```sh
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

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

## ⚡ Developer Scripts

```sh
# Clone repository
git clone <YOUR_GIT_URL>
cd finflow-tracker

# Install client packages
npm install

# Start Vite React server (Hot reload)
npm run dev
```

The app will start at `http://localhost:5173`. Make sure to configure your `.env` file with Supabase credentials as described in the **[Developer Setup](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/developer-setup.md)**.
