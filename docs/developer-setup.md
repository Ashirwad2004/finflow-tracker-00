# Developer Setup & Deployment Guide

This guide covers the FinFlow monorepo: the React/Vite frontend in `frontend/`, the optional FastAPI service in `backend/`, and the Supabase project in `supabase/`.

---

## 📋 Prerequisites
Before you start, make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18.x or later) and `npm`.
*   [Python](https://www.python.org/) (3.11 or later recommended) with `pip` and `venv`.
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) for the compose workflow.
*   [Supabase CLI](https://supabase.com/docs/guides/cli) for local Supabase development and migrations.

---

## 🎨 1. Frontend Client Setup

The client dashboard and storefront are built using Vite + React. Follow these steps to launch locally:

1.  **Clone the Repository**:
    ```sh
    git clone <your-repo-url>
    cd finflow-tracker-00-1
    ```

2.  **Install Frontend Dependencies**:
    ```sh
    npm install
    ```

3.  **Configure Frontend Environment Variables**:
    Create `frontend/.env`:
    ```env
    VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-string
    ```
    *(Retrieve these values from your Supabase Project Settings -> API page)*

4.  **Run Development Server**:
    ```sh
    npm run dev
    ```
    *The Vite client runs at [http://localhost:8080](http://localhost:8080). The root command also starts FastAPI on port 8000.*

    To run either service separately, use `npm run frontend:dev` or `npm run backend:dev` from the repository root.

---

## 🗄️ 2. Database Schema Setup

You can set up the database using two paths: **Supabase Dashboard** or **Supabase Local CLI**.

### Option A: Via Supabase Dashboard
1.  Create a new project on [Supabase](https://supabase.com/).
2.  Go to the **SQL Editor** in the sidebar.
3.  Apply the SQL files in `supabase/migrations/` in filename order. They are the source of truth; `docs/sql-archive/` contains historical/reference scripts and should not be replayed blindly.
4.  Navigate to **Settings -> API** and copy your `URL` and `Anon key` to your frontend `.env` file.

### Option B: Via Local Supabase CLI
If you want to run the database locally inside Docker containers:
1.  Initialize Supabase locally:
    ```sh
    supabase init
    ```
2.  Start the local database instance (requires Docker running):
    ```sh
    supabase start
    ```
3.  Apply migration scripts to sync the local database schema:
    ```sh
    supabase db push
    ```

---

## 🐍 3. FastAPI Python Backend Setup

The FastAPI service provides health checks, AI parsing/insights, payment endpoints, and other API routes. It uses Supabase rather than a repo-managed Alembic migration directory.

1.  **Navigate to backend folder**:
    ```sh
    cd backend
    ```

2.  **Create a Virtual Environment**:
    ```sh
    python -m venv .venv
    ```

3.  **Activate Virtual Environment**:
    *   **Windows**:
        ```powershell
        .\.venv\Scripts\Activate.ps1
        ```
    *   **macOS / Linux**:
        ```sh
        source .venv/bin/activate
        ```

4.  **Install Required Dependencies**:
    ```sh
    pip install -r requirements.txt
    ```

5.  **Configure Backend Environment Variables**:
    Create `backend/.env`:
    ```env
    VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
    GEMINI_API_KEY=your-gemini-api-key
    ENVIRONMENT=development
    SHOW_DOCS=true
    ```

6.  **Start FastAPI Server** from the repository root (open a new terminal or run `cd ..` first):
    ```sh
    python run-backend.py
    ```
    *The health check is available at [http://localhost:8000/health](http://localhost:8000/health). OpenAPI is available at [http://localhost:8000/docs](http://localhost:8000/docs) when `ENVIRONMENT=development` or `SHOW_DOCS=true`.*

---

## 🚀 4. Deployment Instructions

### Frontend (Vercel)
FinFlow is ready to deploy directly to Vercel:
1.  Push your code to a Git repository (GitHub/GitLab).
2.  Log in to [Vercel](https://vercel.com/) and create a new project from your repository.
3.  Configure Build settings:
    *   **Framework Preset**: `Vite`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
4.  Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
5.  Click **Deploy**.

### Storefront Custom Routing (SPA Wildcard Support)
Because customer storefronts use dynamic path patterns like `/store/:storeSlug`, verify your Hosting provider supports URL rewrite rules to prevent `404 Not Found` errors when refreshing.
For Vercel, this is handled automatically via [vercel.json](../vercel.json):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Backend and Docker

The backend has its own [Vercel configuration](../backend/vercel.json). For a single-host deployment, build the frontend and serve it with `npm run server`; the server proxies `/api/v1` and `/health` to FastAPI. The provided `docker-compose.yml` starts both services, publishes frontend port 3000 and backend port 8000, and passes the two `VITE_SUPABASE_*` build arguments to the frontend.
