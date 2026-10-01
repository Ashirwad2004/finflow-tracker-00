/**
 * Domain types for Purchases (Bills, Inward Goods, Purchase Orders).
 */

export * from "./types/orders";

export interface PurchaseItem {
  id?: string;
  product_id?: string;
  name?: string;
  description: string;
  quantity: number;
  price: number;
  cost_price?: number;
  discount: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  hsn_code?: string;
  unit?: string;
}

export type PurchaseStatus = "paid" | "pending" | "partial" | "cancelled";

export interface PurchaseBill {
  id: string;
  user_id: string;
  purchase_number?: string;
  bill_number?: string;
  date: string;
  due_date?: string | null;
  vendor_name: string;
  party_id?: string | null;
  vendor_phone?: string | null;
  vendor_gstin?: string | null;
  items: PurchaseItem[];
  subtotal: number;
  tax_amount: number;
  overall_discount?: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: PurchaseStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseFormValues {
  vendor_name: string;
  vendor_phone?: string;
  vendor_email?: string;
  vendor_gstin?: string;
  bill_number: string;
  date: string;
  due_date?: string;
  items: PurchaseItem[];
  overall_discount: number;
  tax_rate: number;
  status: "paid" | "pending" | "partial";
  amount_paid?: number;
  notes?: string;
}
