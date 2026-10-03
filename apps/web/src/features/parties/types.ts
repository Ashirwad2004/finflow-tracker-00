/**
 * Domain types for Parties (Customers & Vendors).
 */

export type PartyType = "customer" | "vendor" | "both";
export type OpeningBalanceType = "to_receive" | "to_pay";

export interface Party {
  id: string;
  user_id: string;
  name: string;
  type: PartyType;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  gstin?: string | null;
  pan_number?: string | null;
  opening_balance?: number;
  opening_balance_type?: OpeningBalanceType;
  current_balance?: number;
  credit_limit?: number | null;
  payment_terms_days?: number | null;
  notes?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PartyLedgerEntry {
  id: string;
  date: string;
  document_type: "invoice" | "purchase" | "payment_in" | "payment_out" | "credit_note" | "debit_note";
  reference_number: string;
  debit: number;
  credit: number;
  running_balance: number;
  description?: string;
}

export interface PartyFilter {
  type?: PartyType;
  search?: string;
  hasOutstanding?: boolean;
}

export type SettlementType = "sale" | "purchase";

export interface SettlementTarget {
  id?: string;
  type: SettlementType;
  record?: any;
  partyName: string;
  docNumber: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
}
