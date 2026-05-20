# SQL Archive Documentation

This directory contains all SQL migration scripts for the FinFlow Tracker database schema. Each script is organized by functionality and can be executed in Supabase SQL Editor.

**⚠️ Important:** Historical SQL scripts kept for reference. **Do not run these on production** if the equivalent change already exists in `supabase/migrations/`. The live schema source of truth is `supabase/migrations/`.

## Table of Contents

1. [Business Columns Setup](#business-columns-setup)
2. [Business Schema](#business-schema)
3. [Business Billing Schema](#business-billing-schema)
4. [Business Mode](#business-mode)
5. [Group Features](#group-features)
6. [Invoice PDF Features](#invoice-pdf-features)
7. [Admin Functions](#admin-functions)
8. [Additional Features](#additional-features)
9. [Execution Order](#execution-order)

---

## Business Columns Setup

**File:** `add_business_columns.sql`

### Purpose
Adds business-related columns to the profiles table and configures Row Level Security (RLS) policies.

### Changes
- **business_name** (TEXT) - Name of the business
- **gst_number** (TEXT) - GST registration number
- **business_phone** (TEXT) - Business contact phone
- **business_address** (TEXT) - Business physical address
- **is_business_mode** (BOOLEAN) - Flag to enable/disable business mode

### RLS Policies
- ✅ Users can update their own profile

### Execution
```sql
-- Run in Supabase SQL Editor
-- Copy and paste the contents of add_business_columns.sql
```

---

## Business Schema

**File:** `business_schema.sql`

### Purpose
Creates the foundation tables for business inventory and customer management systems.

### Tables Created

#### 1. **products** Table
Manages product inventory for businesses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Reference to auth.users (CASCADE delete) |
| `name` | TEXT | Product name |
| `price` | NUMERIC | Selling price |
| `cost_price` | NUMERIC | Cost price |
| `stock_quantity` | NUMERIC | Current stock level |
| `unit` | TEXT | Unit type (pc, kg, ltr, etc.) |
| `created_at` | TIMESTAMP | Creation timestamp (UTC) |
| `updated_at` | TIMESTAMP | Last update timestamp (UTC) |

#### 2. **customers** Table
Stores customer information for future CRM features.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Reference to auth.users (CASCADE delete) |
| `name` | TEXT | Customer name |
| `phone` | TEXT | Contact number |
| `email` | TEXT | Email address |
| `address` | TEXT | Physical address |
| `created_at` | TIMESTAMP | Creation timestamp (UTC) |
| `updated_at` | TIMESTAMP | Last update timestamp (UTC) |

### Indexes
- `idx_products_user_id` - Quick lookup by user
- `idx_products_name` - Quick lookup by product name
- `idx_customers_user_id` - Quick lookup by user

### RLS Policies

**Products Table:**
- ✅ Users can view their own products
- ✅ Users can insert their own products
- ✅ Users can update their own products
- ✅ Users can delete their own products

**Customers Table:**
- ✅ Users can view their own customers
- ✅ Users can insert their own customers
- ✅ Users can update their own customers
- ✅ Users can delete their own customers

### Auto-Update Trigger
- Automatically updates `updated_at` timestamp on every record modification

---

## Business Billing Schema

**File:** `business_billing_schema.sql`

### Purpose
Creates tables for managing sales invoices and purchase bills with comprehensive billing features.

### Tables Created

#### 1. **sales** Table
Tracks all outgoing invoices/sales transactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Reference to auth.users (CASCADE delete) |
| `invoice_number` | TEXT | Unique invoice identifier |
| `customer_name` | TEXT | Customer name |
| `customer_phone` | TEXT | Customer contact number |
| `customer_email` | TEXT | Customer email address |
| `items` | JSONB | Array of invoice line items |
| `subtotal` | NUMERIC | Total before taxes |
| `tax_amount` | NUMERIC | Total tax charged |
| `total_amount` | NUMERIC | Final invoice amount |
| `status` | TEXT | Status: 'paid', 'pending', 'cancelled' |
| `payment_method` | TEXT | Method: 'cash', 'card', 'upi', 'bank_transfer', 'other' |
| `date` | TIMESTAMP | Transaction date (UTC) |
| `created_at` | TIMESTAMP | Creation timestamp (UTC) |

**items JSONB Structure:**
```json
[
  {
    "name": "Product Name",
    "quantity": 2,
    "price": 100,
    "total": 200
  }
]
```

#### 2. **purchases** Table
Tracks incoming bills/purchase transactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Reference to auth.users (CASCADE delete) |
| `bill_number` | TEXT | Bill reference number |
| `vendor_name` | TEXT | Vendor/supplier name |
| `items` | JSONB | Array of purchase line items |
| `subtotal` | NUMERIC | Total before taxes |
| `tax_amount` | NUMERIC | Total tax charged |
| `total_amount` | NUMERIC | Final bill amount |
| `status` | TEXT | Status: 'paid', 'pending' |
| `date` | TIMESTAMP | Transaction date (UTC) |
| `attachment_url` | TEXT | URL to bill attachment/image |
| `created_at` | TIMESTAMP | Creation timestamp (UTC) |

### RLS Policies

**Sales Table:**
- ✅ Users can view their own sales
- ✅ Users can insert their own sales
- ✅ Users can update their own sales
- ✅ Users can delete their own sales

**Purchases Table:**
- ✅ Users can view their own purchases
- ✅ Users can insert their own purchases
- ✅ Users can update their own purchases
- ✅ Users can delete their own purchases

---

## Business Mode

**File:** `business_mode.sql`

### Purpose
Configures business mode features and adds tax/invoice tracking capabilities to expenses.

### Changes to Existing Tables

#### profiles Table
- **is_business_mode** (BOOLEAN) - Toggle for business features

#### expenses Table
- **tax_amount** (NUMERIC) - Tax charged on expense
- **invoice_number** (TEXT) - Reference invoice/bill number
- **vendor_name** (TEXT) - Name of vendor/supplier
- **is_reimbursable** (BOOLEAN) - Whether expense can be reimbursed

### Global Categories Added
The following business-focused categories are created:
- **Marketing** - Color: #F97316 (Orange)
- **Office Supplies** - Color: #19bc86ff (Green)
- **Software** - Color: #3B82F6 (Blue)
- **Travel** - Color: #EC4899 (Pink)

---

## Group Features

### 1. Group Tables

**File:** `create_group_tables.sql`

Creates the complete group expense sharing system with tables for:
- Groups
- Group members
- Group expenses

---

### 2. Group Permissions

**File:** `fix_group_permissions.sql`

### Purpose
Configures Row Level Security policies for group expense sharing and member management.

### Tables Affected
- `group_expenses`
- `group_members`

### RLS Policies

#### group_expenses Policies
| Policy | Operation | Condition |
|--------|-----------|-----------|
| Members can add expenses | INSERT | User is a group member |
| Members can view expenses | SELECT | User is a group member |
| Users can delete their own expenses | DELETE | User is the expense creator |

#### group_members Policies
| Policy | Operation | Condition |
|--------|-----------|-----------|
| Members can view other members | SELECT | User is in the same group |

---

## Invoice PDF Features

**File:** `add_invoice_pdf_fields.sql`

### Purpose
Adds fields required for generating professional PDF invoices with tax calculations and GST support.

### Changes to sales Table
- **customer_phone** (TEXT) - Customer contact for invoice
- **customer_email** (TEXT) - Email for invoice delivery
- **customer_gstin** (TEXT) - GST identification number
- **tax_rate** (DECIMAL) - Applied tax percentage
- **discount_amount** (DECIMAL) - Discount given
- **cgst** (DECIMAL) - Central GST (India)
- **sgst** (DECIMAL) - State GST (India)
- **igst** (DECIMAL) - Integrated GST (India)

### Changes to purchases Table
- **vendor_phone** (TEXT) - Vendor contact for bill
- **vendor_email** (TEXT) - Vendor email
- **vendor_gstin** (TEXT) - Vendor GST number
- **tax_rate** (DECIMAL) - Applied tax percentage
- **discount_amount** (DECIMAL) - Discount received
- **cgst** (DECIMAL) - Central GST (India)
- **sgst** (DECIMAL) - State GST (India)
- **igst** (DECIMAL) - Integrated GST (India)

### Use Cases
- Generate GST-compliant invoices for Indian businesses
- Track tax calculations (CGST + SGST = IGST)
- Apply discounts to invoices
- Store customer GST information
- Create professional PDF documents with complete tax details

### Example Invoice Structure with GST
```json
{
  "invoice_number": "INV-001",
  "customer_name": "ABC Corporation",
  "customer_gstin": "27AABCT1234H1Z0",
  "items": [
    {
      "name": "Product A",
      "quantity": 10,
      "price": 100,
      "total": 1000
    }
  ],
  "subtotal": 1000,
  "tax_rate": 18,
  "cgst": 90,
  "sgst": 90,
  "igst": 180,
  "discount_amount": 100,
  "total_amount": 1080
}
```

---

## Admin Functions

**File:** `admin_get_users_rpc.sql`

### Purpose
Creates a secure RPC function for admin dashboard to fetch all user data with profile information.

### Function: get_admin_users()

#### Returns
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | User ID |
| `user_id` | UUID | User ID (duplicate for consistency) |
| `email` | VARCHAR | User email from auth.users |
| `created_at` | TIMESTAMPTZ | Account creation date |
| `updated_at` | TIMESTAMPTZ | Last profile update |
| `avatar_url` | TEXT | Avatar image URL |
| `full_name` | TEXT | Display name |
| `business_name` | TEXT | Business name |
| `gst_number` | TEXT | GST number |
| `business_phone` | TEXT | Business phone |
| `business_address` | TEXT | Business address |
| `is_business_mode` | BOOLEAN | Business mode status |
| `business_logo` | TEXT | Logo URL |
| `signature_url` | TEXT | Signature image URL |

#### Features
- ✅ Bypasses RLS using SECURITY DEFINER
- ✅ Joins auth.users and profiles tables
- ✅ Returns up to 200 most recent users
- ✅ Safely accesses email from auth.users
- ✅ Returns users ordered by most recent first

#### Security Considerations
- Function is marked as `SECURITY DEFINER` - use with caution
- Should only be assigned to admin users
- Bypasses Row Level Security policies
- Returns comprehensive user information for admin dashboard

#### Usage Example
```sql
SELECT * FROM public.get_admin_users();

-- Get specific columns
SELECT email, business_name, is_business_mode 
FROM public.get_admin_users();
```

---

## Additional Features

### Borrowed Money Tracking

**File:** `update_schema_borrowed.sql`

#### Purpose
Tracks borrowed money (debts) from other people.

#### Table: borrowed_money

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Current user |
| `amount` | NUMERIC | Amount borrowed |
| `person_name` | TEXT | Name of lender |
| `description` | TEXT | Details about the debt |
| `due_date` | TIMESTAMP | When it's due |
| `status` | TEXT | 'pending' or 'repaid' |
| `created_at` | TIMESTAMP | When recorded |
| `updated_at` | TIMESTAMP | Last modified |

#### RLS Policies
- ✅ Users can view their own borrowed money records
- ✅ Users can insert their own borrowed money records
- ✅ Users can update their own borrowed money records
- ✅ Users can delete their own borrowed money records

#### Example Usage
```json
{
  "amount": 5000,
  "person_name": "Rahul",
  "description": "Borrowed for emergency expenses",
  "due_date": "2026-06-20",
  "status": "pending"
}
```

---

### Expense Splits

**File:** `update_schema_splits.sql`

#### Purpose
Enables party-wise expense tracking in group expenses for more granular control over splits.

#### Changes to group_expenses Table
- **split_data** (JSONB) - Array of user IDs involved in the split

#### split_data Structure
```json
["uuid-user-1", "uuid-user-2", "uuid-user-3"]
```

#### Behavior
- If `split_data` is **NULL**: Expense is split equally among **ALL** group members
- If `split_data` contains UUIDs: Expense is split equally only among specified users

#### Example Scenarios

**Scenario 1: Equal split among all members**
```json
{
  "amount": 300,
  "split_data": null
  // Split among all 5 group members = 60 each
}
```

**Scenario 2: Split among specific members**
```json
{
  "amount": 300,
  "split_data": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ]
  // Split between 2 members = 150 each
}
```

---

## Execution Order

For a fresh database setup, execute scripts in this recommended order:

### Phase 1: User Profiles
1. `add_business_columns.sql` - Add business fields to profiles

### Phase 2: Business Operations
2. `business_schema.sql` - Create products and customers tables
3. `business_billing_schema.sql` - Create sales and purchases tables
4. `business_mode.sql` - Enable business mode and add categories
5. `add_invoice_pdf_fields.sql` - Add GST/tax fields to sales and purchases

### Phase 3: Group Features
6. `create_group_tables.sql` - Create group features (if needed)
7. `fix_group_permissions.sql` - Configure group permissions
8. `update_schema_splits.sql` - Add expense splitting

### Phase 4: Additional Features
9. `update_schema_borrowed.sql` - Create borrowed money tracking

### Phase 5: Admin
10. `admin_get_users_rpc.sql` - Create admin dashboard function

---

## Important Notes

### 🔐 RLS Considerations
- All tables have Row Level Security enabled
- Users can only access their own data
- Group tables have special policies for shared access
- Admin functions use SECURITY DEFINER with caution

### 🕐 Timestamps
- All timestamps use UTC timezone for consistency
- `created_at` is immutable (set on creation only)
- `updated_at` is updated automatically on record modification
- Always query with timezone awareness

### 💰 Data Integrity
- Foreign keys cascade on delete (user deletion removes all related data)
- JSONB columns use PostgreSQL native JSON support for efficiency
- Numeric precision is maintained for financial calculations
- Status fields use CHECK constraints for valid values only

### 🇮🇳 GST Compliance (India)
- CGST + SGST = IGST (calculated at application level)
- IGST is used for inter-state transactions
- Fields support Indian tax system (18%, 12%, 5%, 0%)
- Can be adapted for other tax systems by modifying field names

### 📊 Performance Tips
- Create indexes on frequently queried columns (user_id, date ranges)
- Use JSONB queries for filtering within items arrays
- Archive old sales/purchase records periodically
- Monitor group_expenses table for large groups

---

## Troubleshooting

### RLS Policy Issues
If you get "permission denied" errors:
1. Check user is properly authenticated
2. Verify RLS policies are created correctly
3. For group features, ensure user is added to group_members
4. Test with admin account using SECURITY DEFINER functions

### JSONB Query Issues
If JSONB queries fail:
1. Ensure data is valid JSON format
2. Use `->` operator for object access, `->>` for text extraction
3. Validate JSONB structure matches expected format

### Timestamp Issues
If timestamps appear incorrect:
1. Verify Supabase project timezone is set to UTC
2. Use `timezone('utc'::text, now())` in queries
3. Convert timestamps in application code before display

---

## Support & Resources

- **Supabase Documentation:** https://supabase.com/docs
- **PostgreSQL JSON Functions:** https://www.postgresql.org/docs/current/functions-json.html
- **Row Level Security Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **Check the individual SQL file comments** for implementation details

---

**Last Updated:** 2026-05-20
**Version:** 1.0
**Status:** Reference Documentation (Check supabase/migrations/ for production schema)
