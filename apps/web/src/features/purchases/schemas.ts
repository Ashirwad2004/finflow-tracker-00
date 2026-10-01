import { z } from "zod";

export const purchaseItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional(),
  description: z.string().min(1, "Item description is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  price: z.number().min(0, "Cost price must be non-negative"),
  discount: z.number().min(0).max(100).default(0),
  tax_rate: z.number().min(0).max(100).optional(),
  tax_amount: z.number().min(0).optional(),
  total: z.number().min(0),
  hsn_code: z.string().optional(),
  unit: z.string().optional(),
});

export const purchaseFormSchema = z.object({
  vendor_name: z.string().min(1, "Vendor name is required"),
  vendor_phone: z.string().optional(),
  vendor_email: z.string().email("Invalid email").or(z.literal("")).optional(),
  vendor_gstin: z.string().optional(),
  bill_number: z.string().min(1, "Bill/Invoice number is required"),
  date: z.string().min(1, "Bill date is required"),
  due_date: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
  tax_rate: z.number().min(0).max(100).default(0),
  overall_discount: z.number().min(0).max(100).default(0),
  status: z.enum(["paid", "pending", "partial"]).default("paid"),
  amount_paid: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export type PurchaseItemSchema = z.infer<typeof purchaseItemSchema>;
export type PurchaseFormSchema = z.infer<typeof purchaseFormSchema>;
