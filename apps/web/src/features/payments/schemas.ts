import { z } from "zod";

export const paymentSchema = z.object({
  party_id: z.string().optional(),
  party_name: z.string().min(1, "Party name is required"),
  payment_type: z.enum(["payment_in", "payment_out"]),
  payment_mode: z.enum(["cash", "upi", "bank_transfer", "cheque", "card", "other"]).default("cash"),
  amount: z.number().positive("Amount must be greater than zero"),
  date: z.string().min(1, "Payment date is required"),
  reference_number: z.string().optional(),
  bank_account_id: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentSchema = z.infer<typeof paymentSchema>;
