/**
 * Domain types for Payments (Payment-In, Payment-Out, Receipts).
 */

export type PaymentType = "payment_in" | "payment_out";

export type PaymentMode =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "cheque"
  | "card"
  | "other";

export interface PaymentRecord {
  id: string;
  user_id: string;
  party_id?: string | null;
  party_name?: string;
  payment_type: PaymentType;
  payment_mode: PaymentMode;
  amount: number;
  date: string;
  reference_number?: string | null;
  bank_account_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentCreatePayload {
  party_id?: string | null;
  party_name?: string;
  payment_type: PaymentType;
  payment_mode: PaymentMode;
  amount: number;
  date: string;
  reference_number?: string | null;
  bank_account_id?: string | null;
  notes?: string | null;
}
