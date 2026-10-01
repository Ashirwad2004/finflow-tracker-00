import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
  cost_price: z.number().min(0, "Cost price must be non-negative").optional(),
  stock_quantity: z.number().default(0),
  min_stock_level: z.number().min(0).default(5),
  unit: z.string().default("pcs"),
  category: z.string().optional(),
  hsn_code: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
});

export const stockAdjustmentSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  adjustment_type: z.enum(["increase", "decrease", "set", "damage", "theft"]),
  quantity: z.number().positive("Quantity must be positive"),
  reason: z.string().optional(),
});

export type ProductSchema = z.infer<typeof productSchema>;
export type StockAdjustmentSchema = z.infer<typeof stockAdjustmentSchema>;
