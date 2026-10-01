import { z } from "zod";

export const bankAccountSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(3, "Valid account number is required"),
  ifscCode: z
    .string()
    .min(11, "IFSC code must be 11 characters")
    .max(11, "IFSC code must be 11 characters")
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC code format (e.g. HDFC0001234)"),
  branchName: z.string().optional().default(""),
  isDefault: z.boolean().default(false),
  accountType: z.enum(["checking", "savings", "overdraft", "cash"]).default("checking"),
  initialBalance: z.number().min(0, "Initial balance cannot be negative").default(0),
  odLimit: z.number().min(0).optional().default(0),
  upiId: z.string().optional(),
  colorTheme: z.string().optional().default("default"),
  notes: z.string().optional(),
});

export type BankAccountFormData = z.infer<typeof bankAccountSchema>;

export const bankTransactionSchema = z.object({
  accountId: z.string().min(1, "Bank account is required"),
  date: z.string().min(1, "Transaction date is required"),
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.number().positive("Amount must be greater than zero"),
  category: z.string().min(1, "Category is required"),
  paymentMode: z.string().min(1, "Payment mode is required"),
  referenceNo: z.string().optional().default(""),
  description: z.string().optional().default(""),
  partyName: z.string().optional(),
});

export type BankTransactionFormData = z.infer<typeof bankTransactionSchema>;
