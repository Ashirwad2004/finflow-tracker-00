# RupayBill — Business Domain Boundaries & Accounting Rules

## 1. Domain Map

RupayBill organizes its ERP capabilities into 12 core business domains:

```text
RupayBill Core ERP
├── Sales & Invoicing
├── Purchases & Procurement
├── Point of Sale (POS)
├── Inventory & Stock Control
├── Parties & Khata Ledger
├── Payments & Vouchers
├── Banking & Reconciliation
├── GST & Statutory Compliance
├── Financial Reports & Analytics
├── Storefront (E-Commerce)
├── WhatsApp & Customer Engagement
└── System, Licensing & Security
```

---

## 2. Invariable Accounting & Calculation Rules

### A. Invoice Calculation Matrix
- **Gross Item Amount**: `quantity * unit_price`
- **Item Discount**: `(gross_amount * discount_percent / 100)` or `flat_discount`
- **Taxable Value**: `gross_amount - item_discount`
- **GST Rate Application**:
  - Intra-State (State of Supplier == Place of Supply):
    - `CGST = taxable_value * (gst_rate / 2) / 100`
    - `SGST = taxable_value * (gst_rate / 2) / 100`
    - `IGST = 0`
  - Inter-State (State of Supplier != Place of Supply):
    - `CGST = 0`
    - `SGST = 0`
    - `IGST = taxable_value * gst_rate / 100`
- **Total Tax Amount**: `CGST + SGST + IGST`
- **Invoice Net Total**: `sum(taxable_value) + sum(tax_amount) + additional_charges - global_discount`
- **Round-Off**: `Math.round(net_total) - net_total`
- **Final Payable Total**: `net_total + round_off`

### B. Payment Status Invariants
- `amount_paid >= final_total`: Status = `'paid'`, `balance_due = 0`
- `0 < amount_paid < final_total`: Status = `'partial'`, `balance_due = final_total - amount_paid`
- `amount_paid <= 0`: Status = `'pending'`, `balance_due = final_total`

### C. Party Khata Balance Invariants
- **Customer Net Receivable**:
  $$\text{Receivable} = \sum \text{balance\_due (Sales)} + (\text{opening\_balance if to\_receive else } -\text{opening\_balance})$$
- **Vendor Net Payable**:
  $$\text{Payable} = \sum \text{balance\_due (Purchases)} + (\text{opening\_balance if to\_pay else } -\text{opening\_balance})$$

### D. Stock Deduction Invariants
- **Sales Invoice Finalized**: Decrements `products.stock_quantity` by line item quantity.
- **Sales Return / Credit Note**: Increments `products.stock_quantity`.
- **Purchase Bill Finalized**: Increments `products.stock_quantity`.
- **Purchase Return / Debit Note**: Decrements `products.stock_quantity`.
- **Stock Adjustment**: Direct override or Delta $(\pm)$ with audit reason.

### E. Universal Payment Ledger Invariants
- **Payment In (Receipt)**:
  - Debit: Cash / Bank Account
  - Credit: Customer Account
  - With Bill: Reduces `invoice.balance_due`, appends payment voucher into `invoice.notes` transcript (`<!-- FINFLOW_PAYMENTS:[...] -->`).
  - Without Bill (On Account / Advance): Deducts from `customer.opening_balance`.
- **Payment Out (Voucher)**:
  - Debit: Vendor Account
  - Credit: Cash / Bank Account
  - With Bill: Reduces `purchase.balance_due`, appends voucher into `purchase.notes` transcript.
  - Without Bill: Deducts from `vendor.opening_balance`.
