# Feature Manual & User Guide

FinFlow is designed around two interfaces: **Personal Mode** (default) and **Business Mode** (merchant settings). This guide outlines the capabilities and use cases for every component in both modes.

---

## 👤 Personal Mode Features

Designed for daily expense logging, peer-to-peer tracking, and simple expense reports.

### 1. Personal Expense Tracking
*   **Manual Entry**: Input amount, select date, choose category (Food, Entertainment, Rent, Utilities, Transport, etc.), add description, and upload receipts.
*   **Smart Receipt Upload**: Upload image files (PNG, JPG, PDF) directly. Receipts are saved to Supabase Storage, and the system extracts key metrics like vendor and amount to prefill the dialog.
*   **"Magic Add" / Smart Input**: Enter natural sentences (e.g., *"spent $45 on groceries yesterday"*). The system parses the text dynamically into appropriate transaction categories, dates, and amounts.
*   **Dynamic Visualizations**: Real-time spending charts and monthly expense reports categorized visually to track budgets and prevent overspending.

### 2. Group Splits (Shared Expense Management)
Perfect for roommates, travel partners, or project teams who need to split costs fairly.
*   **Creating Groups**: Users can create a group (e.g., "Apartment 4B"), generating a unique invitation link containing a secure token.
*   **Joining Groups**: New members can enter the invitation code or visit the invite URL to join the group instantly.
*   **Split Types**:
    *   **Equal Splits (Default)**: Expenses are automatically divided evenly among all registered group members.
    *   **Custom Split Selection**: Users can specify the exact members involved in the split (e.g., if only 3 out of 5 roommates shared a meal).
*   **Settlement Dashboard**: Calculates the exact net balance of each member. Shows who owes whom what amount (minimizing the number of transactions required to settle).

### 3. Loans Tracker (Lent & Borrowed Money)
Peer-to-peer debt ledger. Keep track of informal borrowings without cluttering personal expense histories.
*   **Lent Money**: Record money given to friends, including target due dates, interest details (if any), and status (`pending` / `repaid`).
*   **Borrowed Money**: Record money borrowed from others, setting calendar alerts for repayments to maintain credibility.

---

## 💼 Business Mode Features

By enabling "Business Mode" under settings, the interface morphs into a lightweight ERP dashboard for independent business owners and retail shops.

```
┌──────────────────────────────────────────────────────────┐
│                   BUSINESS DASHBOARD                     │
├───────────────┬─────────────────┬──────────────┬─────────┤
│ Sales Book    │ Purchases Book  │ Live Stock   │ CRM     │
│ (Invoices/Tax)│ (Vendor Bills)  │ (Inventory)  │ (Parties│
└───────────────┴─────────────────┴──────────────┴─────────┘
```

### 1. Invoicing & Sales Ledger
*   **Billing Generator**: Generate GST-compliant tax invoices for customers.
*   **Indian GST Support**: Standard auto-calculation of:
    *   **CGST** (Central Goods and Services Tax)
    *   **SGST** (State Goods and Services Tax)
    *   **IGST** (Integrated Goods and Services Tax - for inter-state sales)
*   **Payment Customization**: Record discounts, apply custom tax rates (5%, 12%, 18%, 28%), and tag payment methods (UPI, Cash, Card, Bank Transfer, Net Banking).

### 2. Purchases & Vendor Bills
*   **Cost Tracking**: Record all purchase transactions from wholesale distributors.
*   **Document Storage**: Upload vendor invoices directly to store digital proofs for tax auditing.

### 3. CRM & Parties Directory
*   **Customer & Supplier Directory**: Add name, contact phone, email, and GSTIN of business contacts.
*   **Account Statements**: View historical transaction ledger for individual parties to verify payments.

### 4. Live Inventory Management
*   **Product Catalogs**: Track products with name, price, cost price, and stock quantity.
*   **Automatic Stock Deductions**: Recording a sale dynamically deducts quantities from the inventory.
*   **Out-of-Stock Alerts**: Live alerts on the dashboard when specific stock quantities drop below critical thresholds.

### 5. Print Studio
*   **Custom Receipts**: Format invoices into thermal or standard formats ready to print.
*   **Barcode Label Generator**: Generate barcode stickers for physical products to stick on store items for easier checkout scanning.

---

## 🛍️ Digital Storefront (E-Commerce SaaS)

One of FinFlow's most powerful capabilities is allowing merchants to set up a digital shop instantly.

```
                    ┌────────────────────────┐
                    │  Customer Storefront  │
                    │   (/store/my-shop)     │
                    └───────────┬────────────┘
                                │ (Places Order)
                                ▼
                    ┌────────────────────────┐
                    │   Merchant Dashboard   │
                    │   (Real-time Orders)   │
                    └────────────────────────┘
```

### 1. Instant Setup
Merchants enter a unique slug (e.g., `organic-bites`). Their store becomes publicly accessible at `/store/organic-bites`.

### 2. Customer Portal Experience
*   **Browse Catalog**: View products uploaded by the merchant, complete with pricing, availability, and unit descriptions.
*   **AI Recommendations**: The storefront analyzes popular products and recommends related items to customers during checkout to increase order values.
*   **Interactive Shopping Cart**: Add/remove items and calculate discounts instantly.

### 3. Order Management
*   **Checkout Verification**: Customers submit order requests with their phone numbers.
*   **Real-time Merchant Notifications**: When an order is placed, the merchant's screen updates in real time using Postgres replication, flashing sound notifications and alerts.
*   **Delivery Logistics**: Automatic calculations of delivery fees and free delivery thresholds (configured by the merchant).
