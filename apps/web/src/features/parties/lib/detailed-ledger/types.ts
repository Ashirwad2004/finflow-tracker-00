export interface LedgerTransaction {
  id: string;
  date: string;
  type:
    | "sale"
    | "purchase"
    | "payment_received"
    | "payment_made"
    | "credit_note"
    | "debit_note"
    | "opening_balance";
  amount: number;
  amount_paid?: number;
  balance_due?: number;
  status?: string;
  ref: string;
  debit: number;
  credit: number;
  runningBalance: number;
  notes?: string;
  payment_method?: string;
  voucher_number?: string;
}

export const parseSafeDate = (d: any): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
  if (typeof d === "string") {
    const s = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, day] = s.split("-").map(Number);
      return new Date(y, m - 1, day, 12, 0, 0);
    }
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
      const [day, m, y] = s.split(/[-/]/).map(Number);
      return new Date(y, m - 1, day, 12, 0, 0);
    }
  }
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? new Date() : dt;
};

export interface ComputeDetailedPartyLedgerParams {
  selectedParty: string;
  activePartyRecord: any;
  partiesDirectory: any[];
  sales: any[];
  purchases: any[];
  dateRange: { from?: Date; to?: Date };
}

export interface DetailedPartyLedgerResult {
  fullLedger: LedgerTransaction[];
  closingBalance: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  hasBroughtForward: boolean;
  initialBroughtForward: number;
}
