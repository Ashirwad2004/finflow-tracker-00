# FinFlow Tracker 🚀

FinFlow Tracker is a modern, high-performance financial management ecosystem. It blends personal financial planning (expenses, splits, peer loans) with commercial operation tools (sales/purchase journals, real-time inventory, CRM, custom invoice generator, and customer-facing digital storefronts).

---

## 📖 Project Documentation Hub

We have written detailed guides to cover every aspect of the project. Please follow the links below depending on your goal:

*   **[Product Overview & Architecture](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/product-overview.md)**
    *   *System vision, architectural flow diagram, client-server models, and folder structures.*
*   **[Feature Manual & User Guide](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/features-guide.md)**
    *   *Step-by-step descriptions of Personal, Groups, Loans, Business Mode, and Storefront modules.*
*   **[Database Schema & Security](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/database-schema.md)**
    *   *Entity-Relationship Diagram, table definitions, RLS (Row-Level Security) policies, and database triggers/RPC functions.*
*   **[Developer Setup & Deployment](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/developer-setup.md)**
    *   *Local setup guide for running Vite/React client, Supabase migrations, and FastAPI backend.*

---

## ✨ Features at a Glance

*   **👤 Personal Finance**: Dynamic expense categorization, charts, monthly reports, receipt scanner, and "Magic Add" natural language processing.
*   **👥 Group splits**: Create invite links to group rooms, record shared expenses, customize splits, and settle balances instantly.
*   **🤝 Peer-to-Peer Loans**: Separate lent/borrowed books with due-date reminders.
*   **💼 Business Mode (Micro-ERP)**: Complete GST-compliant billing, vendor invoice attachments, and contact list CRM.
*   **📦 Real-time Inventory**: Catalog products, track cost-to-sale profit margins, and get out-of-stock alerts.
*   **🛍️ Digital Storefront**: Launch a public-facing e-commerce shop under `/store/:storeSlug` featuring cart checkouts, real-time notifications, and item recommendations.
*   **🖨️ Print Studio**: Thermal custom receipt layouts and barcode sticker label generator.

---

## ⚡ Quick Start (Local Frontend Client)

Ensure you have [Node.js](https://nodejs.org/) installed.

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd finflow-tracker

# Install client-side dependencies
npm install

# Start the Vite React development server
npm run dev
```

The app will start at `http://localhost:8080`. Make sure to configure your `.env` file with Supabase credentials as described in the **[Developer Setup](file:///c:/Users/ashir/Downloads/finflow-tracker-00-1/docs/developer-setup.md)**.
