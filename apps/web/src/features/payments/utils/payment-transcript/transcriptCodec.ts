export type PaymentMethodType =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "card"
  | "cheque";

export interface BillPaymentVoucher {
  id: string;
  voucher_number: string;
  type: "receipt" | "payment"; // 'receipt' = Payment In (Sales), 'payment' = Payment Out (Purchases)
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  amount: number;
  payment_method: PaymentMethodType;
  reference_number?: string; // UTR Number, Cheque #, or Bank Ref
  referenceNumber?: string; // Alias for reference_number
  notes?: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
}

export interface BillContext {
  total_amount: number;
  amount_paid?: number;
  balance_due?: number;
  status?: string;
  payment_method?: string | null;
  date?: string | null;
  due_date?: string | null;
  type: "sale" | "purchase";
}

export const TAG_REGEX = /<!--\s*FINFLOW_PAYMENTS:(.*?)\s*-->/s;

/**
 * Parses payment history transcript from a bill's notes.
 * If no embedded vouchers exist but amount_paid > 0, synthesizes the initial voucher
 * so legacy data is seamlessly represented in the accounting ledger.
 */
export function parsePaymentNotes(notes?: string | null): {
  referenceNumber?: string;
  notes?: string;
  settledBills?: Array<{
    billNumber: string;
    billDate?: string;
    billTotal: number;
    settledAmount: number;
    remainingDue: number;
  }>;
} {
  if (!notes) return {};
  const { cleanNotes, payments } = parsePaymentTranscript(notes, {
    total_amount: 0,
    type: "sale",
  });
  const latest = payments.length > 0 ? payments[payments.length - 1] : undefined;
  return {
    referenceNumber: latest?.reference_number || latest?.referenceNumber,
    notes: cleanNotes || latest?.notes,
  };
}

export function parsePaymentTranscript(
  notes: string | null | undefined,
  bill: BillContext
): { cleanNotes: string; payments: BillPaymentVoucher[] } {
  const rawNotes = notes || "";
  const match = rawNotes.match(TAG_REGEX);

  let cleanNotes = rawNotes.replace(TAG_REGEX, "").trim();
  let payments: BillPaymentVoucher[] = [];

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        payments = parsed.map((p) => ({
          ...p,
          amount: Number(p.amount || 0),
          balance_before: Number(p.balance_before || 0),
          balance_after: Number(p.balance_after || 0),
        }));
      }
    } catch (e) {
      console.warn("Failed to parse embedded payment transcript JSON:", e);
    }
  }

  // Graceful fallback for bills recorded before transcript system:
  // If no vouchers exist but bill has amount_paid > 0, create a synthesized initial voucher.
  if (payments.length === 0 && Number(bill.amount_paid || 0) > 0) {
    const paid = Number(bill.amount_paid || 0);
    const total = Number(bill.total_amount || 0);
    const initialVoucher: BillPaymentVoucher = {
      id: "vch_legacy_init",
      voucher_number: `${bill.type === "sale" ? "REC" : "PAY"}-INIT`,
      type: bill.type === "sale" ? "receipt" : "payment",
      date: bill.date ? bill.date.split("T")[0] : new Date().toISOString().split("T")[0],
      amount: paid,
      payment_method: (bill.payment_method as PaymentMethodType) || "cash",
      reference_number: "Initial Settlement",
      notes: "Initial payment recorded at bill generation",
      balance_before: total,
      balance_after: Math.max(0, Math.round((total - paid) * 100) / 100),
      created_at: bill.date || new Date().toISOString(),
    };
    payments.push(initialVoucher);
  }

  return { cleanNotes, payments };
}

/**
 * Serializes user notes and structured payment vouchers into an offline-safe string
 * stored in the `notes` column.
 */
export function encodePaymentTranscript(
  cleanNotes: string,
  payments: BillPaymentVoucher[]
): string {
  const trimmed = cleanNotes.trim();
  const jsonStr = JSON.stringify(payments);
  const tag = `<!-- FINFLOW_PAYMENTS:${jsonStr} -->`;

  if (!trimmed) {
    return tag;
  }
  return `${trimmed}\n\n${tag}`;
}

/**
 * Generates an auditable, sequential voucher number.
 * E.g., REC-20260918-7F3A or PAY-20260918-B92C
 */
export function generateVoucherNumber(type: "receipt" | "payment"): string {
  const prefix = type === "receipt" ? "REC" : "PAY";
  const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateSegment}-${randomSuffix}`;
}
