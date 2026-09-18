export interface POSProduct {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  unit: string;
  barcode?: string | null;
  barcode_type?: "code128" | "ean13" | "upca" | "qr" | string;
  barcode_source?: "manufacturer" | "internal" | string;
  sku?: string | null;
  category?: string | null;
  mrp?: number | null;
  tax_rate?: number;
  hsn_code?: string | null;
  image_url?: string | null;
  rack_location?: string | null;
}

export interface POSCartItem {
  id: string; // unique row id in cart
  product_id?: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  mrp?: number;
  discount: number; // percentage (0 - 100)
  tax_rate: number; // percentage (0, 5, 12, 18, 28)
  tax_amount: number;
  total: number; // line total (tax-inclusive)
  unit: string;
  hsn_code?: string;
  notes?: string;
}

export interface POSTerminal {
  id: string;
  store_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
}

export interface POSShift {
  id: string;
  store_id: string;
  terminal_id?: string | null;
  cashier_id: string;
  cashier_snapshot_name?: string | null;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number;
  expected_cash: number;
  actual_cash?: number | null;
  difference?: number;
  status: "open" | "closed";
  notes?: string | null;
}

export interface POSShiftSummary {
  shift_id: string;
  store_id: string;
  cashier_id: string;
  cashier_snapshot_name?: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number;
  cash_sales: number;
  cash_in: number;
  cash_out: number;
  cash_refunds: number;
  expected_cash: number;
  actual_cash?: number | null;
  difference: number;
  total_bills: number;
  notes?: string | null;
}

export interface POSHeldBill {
  id: string;
  store_id: string;
  terminal_id?: string | null;
  cashier_id: string;
  customer_name: string;
  customer_phone?: string | null;
  party_id?: string | null;
  items: POSCartItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  discount_amount: number;
  notes?: string | null;
  created_at: string;
}

export interface POSReturnItem {
  original_sale_item_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  refund_amount: number;
  restock_inventory: boolean;
}

export type POSPaymentMethodType = "cash" | "upi" | "card" | "bank_transfer" | "credit" | "split";

export interface POSSplitPaymentBreakdown {
  cash: number;
  upi: number;
  card: number;
  bank_transfer: number;
  credit: number;
  upi_reference?: string;
  card_reference?: string;
}
