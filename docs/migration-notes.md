# RupayBill — Architectural Migration Notes & Risk Registry

## 1. Codebase Audit Findings

### A. Monolithic "God Module": `features/business`
- **Current State**: `features/business` currently occupies over 800 KB of source code across 40+ files, attempting to serve as the container for 10 distinct domains:
  - Sales & Invoicing (`CreateInvoiceDialog.tsx` is 191 KB!)
  - Purchases & Scanner (`RecordPurchaseDialog.tsx` is 82 KB, `PurchaseBillScanner.tsx` is 34 KB)
  - Parties & Khata (`Parties.tsx` is 143 KB, `PartyImportExportDialog.tsx` is 114 KB, `DetailedPartyReport.tsx` is 75 KB)
  - GST & Taxes (`GSTR1Report.tsx` is 61 KB, `GSTR2BReport.tsx`, `GSTR3BReport.tsx`)
  - Banking & Reconciliation (`BankDetails.tsx` is 54 KB, 11 subcomponents in `components/banking/`)
  - Orders (`components/orders/` contains 8 files totaling 250 KB)
  - Reports (`FinFlowReportsStudio.tsx` is 124 KB)
  - Online Store & Print Studio (`OnlineStore.tsx` 129 KB, `PrintStudio.tsx` 137 KB)
- **Problem**: Severe coupling, merge conflicts, difficulty in code navigation, and duplicated state logic.

### B. Dual Utility Directories
- `frontend/src/utils/`: Contains 11 files (PDF generators, Excel exporters)
- `frontend/src/core/utils/`: Contains 6 files (barcode, einvoiceGenerator, invoiceGenerator, jobQueue)
- **Problem**: Inconsistent import patterns (`@/utils/...` vs `@/core/utils/...`).

### C. Flat Page Routing vs Domain Grouping
- `frontend/src/pages/`: Contains only 7 miscellaneous pages (`Index.tsx`, `Pricing.tsx`, etc.).
- The real production billing pages are buried deep inside `frontend/src/features/business/pages/` and `frontend/src/features/pos/pages/`.
- `App.tsx` contains 339 lines of inline route definitions, 4 inline auth wrappers, and inline query callbacks.

---

## 2. High-Risk Files & Invariant Guardrails

1. **`CreateInvoiceDialog.tsx` (191 KB)**:
   - *Risk*: Contains complex dynamic calculations (line item taxes, auto-party creation, partial payments, stock checking).
   - *Strategy*: Migrate as an intact domain module under `features/sales/components/CreateInvoiceDialog.tsx`, verifying calculations before any internal sub-component decomposition.
2. **`syncService.ts`**:
   - *Risk*: Contains the offline sync whitelist. Stripping fields breaks offline synchronization.
   - *Strategy*: Preserve intact without field removal.
3. **`useSubscription.ts` & `MerchantRoute`**:
   - *Risk*: Controls the paid SaaS gate and 15-day trial access.
   - *Strategy*: Keep intact; extract route guards cleanly into `app/guards/`.
4. **`UniversalPaymentDialog.tsx` & `paymentTranscript.ts`**:
   - *Risk*: Encodes payment receipts and vouchers into bill `notes`.
   - *Strategy*: Preserve serialization logic.
5. **`generateInvoicePDF.ts` (103 KB)**:
   - *Risk*: PDF generation with tables, tax columns, QR codes, and bank accounts.
   - *Strategy*: Keep intact and relocate to `utils/pdf/generateInvoicePDF.ts`.

---

## 3. Migration Verification Checklist

- [x] Initial build passes (`npm run build --workspace=frontend`)
- [x] Initial linter passes (`npm run lint --workspace=frontend`)
- [x] Backend test suite passes (68 tests passing)
- [ ] Step 1: Create domain directories (`features/sales`, `features/purchases`, `features/inventory`, etc.)
- [ ] Step 2: Relocate domain components from `features/business` into dedicated domain slices
- [ ] Step 3: Centralize app infrastructure (`app/App.tsx`, `app/routes.tsx`, `app/providers/`, `app/guards/`)
- [ ] Step 4: Update path aliases & clean up dead imports
- [ ] Step 5: Full verification (Typecheck, Lint, Build, Pytest)
