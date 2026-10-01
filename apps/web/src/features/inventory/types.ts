/**
 * Domain types for Inventory & Products.
 */

export interface Product {
  id: string;
  user_id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  min_stock_level?: number;
  unit?: string;
  category?: string | null;
  hsn_code?: string | null;
  tax_rate?: number;
  image_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type StockAdjustmentType = "increase" | "decrease" | "set" | "damage" | "theft";

export interface StockAdjustment {
  product_id: string;
  adjustment_type: StockAdjustmentType;
  quantity: number;
  reason?: string;
}
