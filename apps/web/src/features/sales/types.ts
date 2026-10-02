/**
 * Domain types for the sales feature slice (Invoices, Quotations, Sale Orders).
 */

export * from "./types/orders";
export * from "./services/calc";

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  price: number;
  discount: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  hsn_code?: string;
  unit?: string;
}

export type InvoiceStatus = "paid" | "pending" | "partial" | "cancelled" | "draft";

export type InvoiceDocumentType = "invoice" | "credit_note" | "debit_note" | "quotation";

export interface InvoiceRecord {
  id: string;
  user_id: string;
  invoice_number: string;
  date: string;
  due_date?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_gstin?: string | null;
  place_of_supply?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  party_id?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate?: number;
  tax_amount: number;
  overall_discount?: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  document_type: InvoiceDocumentType;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  irn?: string | null;
  eway_bill_number?: string | null;
  qr_code?: string | null;
}

export interface InvoiceFormValues {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_gstin: string;
  place_of_supply?: string;
  billing_address?: string;
  shipping_address?: string;
  is_reverse_charge?: boolean;
  document_type?: InvoiceDocumentType;
  original_invoice_id?: string;
  is_amendment?: boolean;
  amended_invoice_id?: string;
  invoice_number: string;
  date: string;
  due_date?: string;
  notes?: string;
  items: InvoiceItem[];
  tax_rate: number;
  overall_discount: number;
  status: "paid" | "pending" | "partial";
  amount_paid?: number;
  irn?: string;
  eway_bill_number?: string;
  qr_code?: string;
  quick_item_name?: string;
  quick_total_amount?: number;
}

export interface SaleItem {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  amount?: number;
  total?: number;
  hsn_code?: string;
  unit?: string;
}

export interface Sale {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_gstin?: string;
  invoice_number: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft' | 'partial';
  total_amount: number;
  amount_paid?: number;
  balance_due?: number;
  subtotal?: number;
  tax_amount?: number;
  tax_rate?: number;
  discount_amount?: number;
  date: string;
  due_date?: string | null;
  party_id?: string | null;
  previous_balance?: number;
  total_due_balance?: number;
  items: SaleItem[];
  notes?: string | null;
  irn?: string | null;
  eway_bill_number?: string | null;
  qr_code?: string | null;
  payment_method?: string;
  document_type?: string;
  created_at?: string;
}

export interface SalesMetrics {
  outstandingTotal: number;
  overdueTotal: number;
  paidThisMonth: number;
  totalRevenue: number;
  totalBilled: number;
  collectionRate: number;
  avgInvoiceValue: number;
}
