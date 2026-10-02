import { InvoicePdfTheme, PageSize, BankDetailsInfo, UniversalDocumentType } from "@/utils/generateInvoicePDF";

export type InvoiceTheme = InvoicePdfTheme | "thermal";

export const themeMeta: Record<InvoiceTheme, { name: string; desc: string; color: string; class: string }> = {
  "startup-gradient": {
    name: "Startup Gradient",
    desc: "Trendy tech layout with vibrant indigo-pink gradients and modern typography.",
    color: "bg-gradient-to-r from-indigo-500 to-pink-500 text-white",
    class: "border-indigo-200 hover:border-indigo-400",
  },
  "sale-invoice": {
    name: "Sale Invoice",
    desc: "Vyapar-style professional GST Tax Invoice with sky-blue header, dual metadata columns, and itemized tax grid.",
    color: "bg-sky-500 text-white border border-sky-400",
    class: "border-sky-300 hover:border-sky-500",
  },
  "tally-accounting": {
    name: "Tally ERP Standard",
    desc: "Classic Indian GST Tax invoice with dual quadrants, HSN summary, and bank details.",
    color: "bg-zinc-800 text-white border border-black",
    class: "border-slate-300 hover:border-slate-500",
  },
  thermal: {
    name: "Thermal POS Receipt",
    desc: "Compact receipt format with barcode styling for 58mm/80mm thermal rolls.",
    color: "bg-stone-300 text-stone-800 font-mono",
    class: "border-stone-300 hover:border-stone-400",
  },
};

export const invoiceThemes = Object.keys(themeMeta) as InvoiceTheme[];

export const sampleSale = {
  id: "sample-id-12345",
  invoice_number: "INV-2026-089",
  date: new Date().toISOString().split("T")[0],
  created_at: new Date().toISOString(),
  customer_name: "Acme Corporates Ltd.",
  customer_phone: "+91 98765 01234",
  customer_email: "billing@acme.com",
  customer_gstin: "27AAAAA1111A1Z1",
  subtotal: 14500,
  discount_amount: 1500,
  tax_rate: 18,
  tax_amount: 2340,
  total_amount: 15340,
  amount_paid: 10000,
  balance_due: 5340,
  previous_balance: 8500,
  total_due_balance: 13840,
  party_pending_balance: 13840,
  status: "partial",
  payment_method: "upi",
  items: [
    { description: "Premium Software Subscription (Annual)", quantity: 1, price: 12000, total: 12000, hsn_code: "998313", unit: "pcs" },
    { description: "Developer API Integration Consultancy", quantity: 2, price: 1250, total: 2500, hsn_code: "998314", unit: "Hours" },
  ],
};

export const samplePurchaseBill = {
  id: "sample-pb-1001",
  invoice_number: "BILL-2026-441",
  date: new Date().toISOString().split("T")[0],
  created_at: new Date().toISOString(),
  customer_name: "Apex Raw Materials & Logistics",
  customer_phone: "+91 94455 88990",
  customer_email: "orders@apexrawmaterials.in",
  customer_gstin: "29AABCA5566Z1Z8",
  subtotal: 38000,
  discount_amount: 2000,
  tax_rate: 18,
  tax_amount: 6480,
  total_amount: 42480,
  amount_paid: 20000,
  balance_due: 22480,
  previous_balance: 15000,
  total_due_balance: 37480,
  party_pending_balance: 37480,
  status: "partial",
  payment_method: "bank_transfer",
  items: [
    { description: "Industrial Grade Stainless Fasteners M8 (1000pcs)", quantity: 2, price: 11500, total: 23000, hsn_code: "731815", unit: "box" },
    { description: "Corrugated Export Packaging Cartons", quantity: 500, price: 30, total: 15000, hsn_code: "481910", unit: "pcs" },
  ],
};

export const sampleSaleOrder = {
  id: "sample-so-2002",
  invoice_number: "SO-2026-015",
  date: new Date().toISOString().split("T")[0],
  due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  created_at: new Date().toISOString(),
  customer_name: "Bharat Retail Networks Pvt Ltd",
  customer_phone: "+91 98111 22334",
  customer_email: "procurement@bharatretail.com",
  customer_gstin: "07AAACB2233M1ZU",
  subtotal: 55000,
  discount_amount: 2500,
  tax_rate: 18,
  tax_amount: 9450,
  total_amount: 61950,
  amount_paid: 30000,
  balance_due: 31950,
  previous_balance: 12500,
  total_due_balance: 44450,
  party_pending_balance: 44450,
  status: "confirmed",
  payment_method: "upi",
  items: [
    { description: "Enterprise Cloud ERP Annual License Seat", quantity: 5, price: 8000, total: 40000, hsn_code: "998313", unit: "licenses" },
    { description: "On-site Deployment & Training Services", quantity: 1, price: 15000, total: 15000, hsn_code: "998319", unit: "session" },
  ],
};

export const samplePurchaseOrder = {
  id: "sample-po-3003",
  invoice_number: "PO-2026-088",
  date: new Date().toISOString().split("T")[0],
  due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  created_at: new Date().toISOString(),
  customer_name: "Global Components Fabricators Corp",
  customer_phone: "+91 97222 44556",
  customer_email: "supply@globalcomponents.com",
  customer_gstin: "24AAACG8899K1Z5",
  subtotal: 78000,
  discount_amount: 3000,
  tax_rate: 18,
  tax_amount: 13500,
  total_amount: 88500,
  amount_paid: 0,
  balance_due: 88500,
  previous_balance: 20000,
  total_due_balance: 108500,
  party_pending_balance: 108500,
  status: "sent",
  payment_method: "cheque",
  items: [
    { description: "High Precision CNC Aluminium Enclosures", quantity: 40, price: 1200, total: 48000, hsn_code: "761699", unit: "pcs" },
    { description: "Custom Molded Silicon Dampening Gaskets", quantity: 600, price: 50, total: 30000, hsn_code: "401693", unit: "pcs" },
  ],
};

export interface InvoiceMockPreviewProps {
  sale: any;
  profile: any;
  theme: InvoiceTheme;
  formatCurrency: (n: number) => string;
  pageSize: PageSize;
  customTerms: string;
  printBankDetails?: boolean;
  bankAccount?: BankDetailsInfo | null;
  printUpiQr?: boolean;
  upiId?: string;
  showItemTaxRate?: boolean;
  showPartyPreviousBalance?: boolean;
  showPartyPendingBalance?: boolean;
  documentType?: UniversalDocumentType;
}
