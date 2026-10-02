/**
 * Domain types for Inventory & Products.
 */

export interface Product {
  id: string;
  user_id: string;
  name: string;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  unit: string;
  hsn_code?: string | null;
  barcode?: string | null;
  barcode_type?: string;
  barcode_source?: string;
  sku?: string | null;
  category?: string | null;
  mrp?: number | null;
  tax_rate?: number;
  min_stock_level?: number;
  description?: string | null;
  created_at: string;
  updated_at?: string;
  is_listed_online?: boolean;
  online_description?: string | null;
  image_url?: string | null;
  rack_location?: string | null;
  is_active?: boolean;
}

export interface ProductFormValues {
  name: string;
  price: number;
  cost_price?: number | null;
  stock_quantity: number;
  unit: string;
  hsn_code?: string;
  barcode?: string;
  barcode_type?: string;
  barcode_source?: string;
  sku?: string;
  category?: string;
  mrp?: number | null;
  tax_rate?: number;
  is_listed_online?: boolean;
  online_description?: string;
  image_url?: string;
  rack_location?: string;
}

export type StockFilterType = "all" | "stock" | "non-stock";

export type StockAdjustmentType = "increase" | "decrease" | "set" | "damage" | "theft";

export interface StockAdjustment {
  product_id: string;
  adjustment_type: StockAdjustmentType;
  quantity: number;
  reason?: string;
}
