import { z } from "zod";

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Item description is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  price: z.number().min(0, "Price must be non-negative"),
  discount: z.number().min(0).max(100).default(0),
  tax_rate: z.number().min(0).max(100).optional(),
  tax_amount: z.number().min(0).optional(),
  total: z.number().min(0),
  hsn_code: z.string().optional(),
  unit: z.string().optional(),
});

export const invoiceFormSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),
  customer_email: z.string().email("Invalid email").or(z.literal("")).optional(),
  customer_gstin: z.string().optional(),
  place_of_supply: z.string().optional(),
  billing_address: z.string().optional(),
  shipping_address: z.string().optional(),
  is_reverse_charge: z.boolean().default(false),
  document_type: z.enum(["invoice", "credit_note", "debit_note", "quotation"]).default("invoice"),
  original_invoice_id: z.string().optional(),
  invoice_number: z.string().min(1, "Invoice number is required"),
  date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  tax_rate: z.number().min(0).max(100).default(0),
  overall_discount: z.number().min(0).max(100).default(0),
  status: z.enum(["paid", "pending", "partial"]).default("paid"),
  amount_paid: z.number().min(0).optional(),
  quick_item_name: z.string().optional(),
  quick_total_amount: z.number().min(0).optional(),
});

export type InvoiceItemSchema = z.infer<typeof invoiceItemSchema>;
export type InvoiceFormSchema = z.infer<typeof invoiceFormSchema>;
