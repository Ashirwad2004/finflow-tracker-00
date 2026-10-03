import { z } from "zod";

export const expenseSchema = z.object({
  description: z.string().trim().min(1),
  amount: z.number().positive(),
  category_id: z.string().uuid(),
  date: z.string(),
  // Business fields (optional/nullable)
  tax_amount: z.number().nonnegative().optional(),
  invoice_number: z.string().optional(),
  vendor_name: z.string().optional(),
  is_reimbursable: z.boolean().optional(),
});

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  userId: string;
}

export interface ExpenseRow {
  id: string; // Temp ID for React keys
  description: string;
  amount: string;
  categoryId: string;
  date: string;
  billFile: File | null;
  billPreview: string | null;
  // Business fields
  taxAmount: string; // Keep as string for input
  invoiceNumber: string;
  vendorName: string;
  isReimbursable: boolean;
}
