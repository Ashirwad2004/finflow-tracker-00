# RupayBill — Database Architecture & Persistence Invariants

## 1. Storage Tiers

RupayBill employs a hybrid three-tier persistence layer:
1. **Primary Cloud Store**: Supabase PostgreSQL 15 with Row-Level Security (RLS) and real-time CDC (Change Data Capture) via WebSockets.
2. **Local Primary Store**: Dexie (IndexedDB) for sub-millisecond local querying and instant UI rendering.
3. **Persistent Offline Storage**: OPFS (Origin Private File System) and SQLite WASM for eviction-immune, durable local persistence.

---

## 2. Core PostgreSQL Tables & Tenancy Isolation

Every database table is tenant-isolated using RLS based on `auth.uid() = user_id` or `store_id`:

| Table Name | Primary Key | Isolation Key | Description |
|---|---|---|---|
| `profiles` | `id` (UUID) | `user_id` | Business profile, tax number, store slug, admin flag |
| `subscription_status` | `user_id` (UUID) | `user_id` | Active plan (`trial`, `premium`, `free`), validity end date |
| `trial_claims` | `id` (UUID) | `normalized_email` | Anti-abuse registry preventing repeated trial activation |
| `products` | `id` (UUID) | `user_id` | Items, stock quantity, cost price, sale price, HSN, barcode |
| `sales` | `id` (UUID) | `user_id` / `store_id` | Invoices, quotes, orders, amounts, balance due, payment notes |
| `purchases` | `id` (UUID) | `user_id` / `store_id` | Purchase bills, supplier reference, balance due, payment notes |
| `parties` | `id` (UUID) | `user_id` / `store_id` | Customers & vendors, GSTIN, opening balance, credit terms |
| `payments` | `id` (UUID) | `user_id` | Subscription payments, gateway transaction records |
| `rupeebill_bank_accounts` | `id` (UUID) | `user_id` | Bank accounts, IFSC, opening balance, current ledger balance |
| `rupeebill_bank_transactions`| `id` (UUID) | `user_id` | Bank deposits, withdrawals, contra transfers, reconciliations |
| `online_orders` | `id` (UUID) | `merchant_id` | Storefront customer orders, delivery addresses, status events |

---

## 3. Database Triggers & Stored Functions

- **Local Trigger Variable Isolation**: All PL/pgSQL local variables must be prefixed with `v_` (e.g. `v_norm_email`) to prevent column-variable collision errors in `ON CONFLICT` clauses.
- **Stock Audit Triggers**: Mutations in `sales` or `purchases` invoke stock adjustment routines ensuring transactional integrity.
- **Search Indices**: GIN and btree indices on `party_id`, `invoice_number`, `barcode`, and `user_id` for $O(\log n)$ lookup speed.
