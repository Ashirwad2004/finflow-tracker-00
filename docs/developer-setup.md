# Developer Setup & Deployment Guide

This guide will walk you through setting up the frontend application, the Supabase PostgreSQL database, and the optional FastAPI Python backend on your local machine.

---

## 📋 Prerequisites
Before you start, make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18.x or later) and `npm` (v9.x or later).
*   [Python](https://www.python.org/) (v3.9 or later, with `pip` and `venv` enabled).
*   [Supabase CLI](https://supabase.com/docs/guides/cli) (Optional, but recommended for local database emulation).

---

## 🎨 1. Frontend Client Setup

The client dashboard and storefront are built using Vite + React. Follow these steps to launch locally:

1.  **Clone the Repository**:
    ```sh
    git clone <your-repo-url>
    cd finflow-tracker
    ```

2.  **Install Frontend Dependencies**:
    ```sh
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file at the root of the project:
    ```env
    VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-string
    ```
    *(Retrieve these values from your Supabase Project Settings -> API page)*

4.  **Run Development Server**:
    ```sh
    npm run dev
    ```
    *The client will start running locally at [http://localhost:5173](http://localhost:5173).*

---

## 🗄️ 2. Database Schema Setup

You can set up the database using two paths: **Supabase Dashboard** or **Supabase Local CLI**.

### Option A: Via Supabase Dashboard (Easiest)
1.  Create a new project on [Supabase](https://supabase.com/).
2.  Go to the **SQL Editor** in the sidebar.
3.  Execute the migration scripts located in the `supabase/migrations/` directory in chronological order, or simply copy the latest schema definitions.
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

FinFlow features an optional FastAPI backend service for background computation, rates limiter, and utility APIs.

1.  **Navigate to backend folder**:
    ```sh
    cd backend
    ```

2.  **Create a Virtual Environment**:
    ```sh
    python -m venv venv
    ```

3.  **Activate Virtual Environment**:
    *   **Windows**:
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   **macOS / Linux**:
        ```sh
        source venv/bin/activate
        ```

4.  **Install Required Dependencies**:
    ```sh
    pip install -r requirements.txt
    ```

5.  **Configure Backend Environment Variables**:
    Create a `.env` file inside the `backend/` directory:
    ```env
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finflow
    ```

6.  **Run Alembic DB Migrations**:
    ```sh
    alembic upgrade head
    ```

7.  **Start FastAPI Server**:
    ```sh
    uvicorn main:app --reload --port 8000
    ```
    *The API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).*

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
For Vercel, this is handled automatically via our [vercel.json](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/vercel.json):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
