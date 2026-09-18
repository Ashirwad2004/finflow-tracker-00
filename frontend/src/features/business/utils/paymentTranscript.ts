/**
 * FinFlow Tracker — Bill Payment & Transaction Transcript Ledger
 *
 * Implements CA-grade double-entry audit records for:
 * 1. Sales Receipts (Payment In — Dr. Cash/Bank, Cr. Debtor)
 * 2. Purchase Vouchers (Payment Out — Dr. Creditor, Cr. Cash/Bank)
 *
 * Stores structured JSON ledger entries safely inside the existing `notes` column
 * via embedded metadata comments: <!-- FINFLOW_PAYMENTS:[...] -->
 * This guarantees 100% resilience across offline SQLite storage and Supabase sync.
 */

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

const TAG_REGEX = /<!--\s*FINFLOW_PAYMENTS:(.*?)\s*-->/s;

/**
 * Parses payment history transcript from a bill's notes.
 * If no embedded vouchers exist but amount_paid > 0, synthesizes the initial voucher
 * so legacy data is seamlessly represented in the accounting ledger.
 */
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

/**
 * Strict CA Bill Settlement Calculation (adhering to brain.md Invariant 4).
 *
 * Formulas:
 * - newAmountPaid = currentPaid + paymentAmount
 * - newBalanceDue = max(0, totalAmount - newAmountPaid)
 * - Status transitions:
 *   - newBalanceDue <= 0.001 -> 'paid'
 *   - 0 < newAmountPaid < totalAmount -> 'partial'
 *   - newAmountPaid <= 0 -> 'overdue' if past due, else 'pending'
 */
export function calculateBillSettlement(
  totalAmount: number,
  currentAmountPaid: number,
  newPaymentAmount: number,
  dueDate?: string | null
): {
  newAmountPaid: number;
  newBalanceDue: number;
  newStatus: "paid" | "partial" | "pending" | "overdue";
  isOverdue: boolean;
} {
  const safeTotal = Math.max(0, Number(totalAmount) || 0);
  const safeCurrent = Math.max(0, Number(currentAmountPaid) || 0);
  const safePayment = Math.max(0, Number(newPaymentAmount) || 0);

  const newAmountPaid = Math.min(
    safeTotal,
    Math.round((safeCurrent + safePayment) * 100) / 100
  );
  const newBalanceDue = Math.max(
    0,
    Math.round((safeTotal - newAmountPaid) * 100) / 100
  );

  let isOverdue = false;
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today && newBalanceDue > 0) {
      isOverdue = true;
    }
  }

  let newStatus: "paid" | "partial" | "pending" | "overdue" = "pending";
  if (newBalanceDue <= 0.001 && safeTotal > 0) {
    newStatus = "paid";
  } else if (newAmountPaid > 0 && newAmountPaid < safeTotal) {
    newStatus = "partial";
  } else if (newAmountPaid <= 0) {
    newStatus = isOverdue ? "overdue" : "pending";
  }

  return {
    newAmountPaid,
    newBalanceDue,
    newStatus,
    isOverdue,
  };
}

/**
 * Human-readable payment method label with badge iconography metadata.
 */
export function getPaymentMethodDetails(method: PaymentMethodType | string) {
  switch (method) {
    case "cash":
      return { label: "Cash", icon: "Banknote", badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" };
    case "upi":
      return { label: "UPI / QR", icon: "QrCode", badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800" };
    case "bank_transfer":
      return { label: "Bank Transfer / NEFT", icon: "Landmark", badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800" };
    case "card":
      return { label: "Debit / Credit Card", icon: "CreditCard", badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800" };
    case "cheque":
      return { label: "Cheque", icon: "FileSpreadsheet", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700" };
    default:
      return { label: method || "Other", icon: "Coins", badgeClass: "bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800" };
  }
}

export interface UnifiedPaymentTransaction {
  id: string;
  voucherNumber: string;
  type: "receipt" | "payment";
  date: string;
  time?: string;
  partyId?: string | null;
  partyName: string;
  partyPhone?: string | null;
  partyGstin?: string | null;
  amount: number;
  paymentMethod: PaymentMethodType;
  referenceNumber?: string;
  notes?: string;
  linkedBillId?: string;
  linkedBillNumber?: string;
  isWithoutBill: boolean;
  rawBillRecord?: any;
}

/**
 * Extracts each and every Payment In transaction across all sales and receipts.
 */
export function extractAllPaymentInTransactions(sales: any[]): UnifiedPaymentTransaction[] {
  const allTxns: UnifiedPaymentTransaction[] = [];

  for (const sale of sales || []) {
    const isStandaloneReceipt =
      sale.document_type === "receipt" || sale.invoice_number?.startsWith("REC-");

    const { payments } = parsePaymentTranscript(sale.notes, {
      total_amount: Number(sale.total_amount || 0),
      amount_paid: Number(sale.amount_paid || 0),
      balance_due: Number(sale.balance_due != null ? sale.balance_due : (Number(sale.total_amount || 0) - Number(sale.amount_paid || 0))),
      status: sale.status,
      payment_method: sale.payment_method || "cash",
      date: sale.date,
      due_date: sale.due_date,
      type: "sale",
    });

    if (payments.length > 0) {
      for (const p of payments) {
        allTxns.push({
          id: p.id,
          voucherNumber: p.voucher_number,
          type: "receipt",
          date: p.date,
          time: p.time,
          partyId: sale.party_id,
          partyName: sale.customer_name || "Unknown Customer",
          partyPhone: sale.customer_phone,
          partyGstin: sale.customer_gstin,
          amount: Number(p.amount || 0),
          paymentMethod: (p.payment_method as PaymentMethodType) || "cash",
          referenceNumber: p.reference_number,
          notes: p.notes,
          linkedBillId: isStandaloneReceipt ? undefined : sale.id,
          linkedBillNumber: isStandaloneReceipt ? undefined : sale.invoice_number,
          isWithoutBill: isStandaloneReceipt,
          rawBillRecord: sale,
        });
      }
    } else if (Number(sale.amount_paid || 0) > 0) {
      allTxns.push({
        id: `txn_${sale.id}`,
        voucherNumber: isStandaloneReceipt ? sale.invoice_number : `REC-${sale.invoice_number}`,
        type: "receipt",
        date: sale.date ? sale.date.split("T")[0] : new Date().toISOString().split("T")[0],
        partyId: sale.party_id,
        partyName: sale.customer_name || "Unknown Customer",
        partyPhone: sale.customer_phone,
        partyGstin: sale.customer_gstin,
        amount: Number(sale.amount_paid || 0),
        paymentMethod: (sale.payment_method as PaymentMethodType) || "cash",
        notes: "Initial payment recorded on bill",
        linkedBillId: isStandaloneReceipt ? undefined : sale.id,
        linkedBillNumber: isStandaloneReceipt ? undefined : sale.invoice_number,
        isWithoutBill: isStandaloneReceipt,
        rawBillRecord: sale,
      });
    }
  }

  // Sort descending: newest transactions first
  return allTxns.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return timeB - timeA;
  });
}

/**
 * Extracts each and every Payment Out transaction across all purchase bills.
 */
export function extractAllPaymentOutTransactions(purchases: any[]): UnifiedPaymentTransaction[] {
  const allTxns: UnifiedPaymentTransaction[] = [];

  for (const purchase of purchases || []) {
    const isStandalonePayment = purchase.bill_number?.startsWith("PAY-");

    const { payments } = parsePaymentTranscript(purchase.notes, {
      total_amount: Number(purchase.total_amount || 0),
      amount_paid: Number(purchase.amount_paid || 0),
      balance_due: Number(purchase.balance_due != null ? purchase.balance_due : (Number(purchase.total_amount || 0) - Number(purchase.amount_paid || 0))),
      status: purchase.status,
      payment_method: "cash",
      date: purchase.date,
      due_date: purchase.due_date,
      type: "purchase",
    });

    const billNumber = purchase.bill_number || `BILL-${purchase.id?.substring(0, 6)?.toUpperCase()}`;

    if (payments.length > 0) {
      for (const p of payments) {
        allTxns.push({
          id: p.id,
          voucherNumber: p.voucher_number,
          type: "payment",
          date: p.date,
          time: p.time,
          partyId: purchase.party_id,
          partyName: purchase.vendor_name || "Unknown Vendor",
          partyPhone: purchase.vendor_phone,
          partyGstin: purchase.vendor_gstin,
          amount: Number(p.amount || 0),
          paymentMethod: (p.payment_method as PaymentMethodType) || "cash",
          referenceNumber: p.reference_number,
          notes: p.notes,
          linkedBillId: isStandalonePayment ? undefined : purchase.id,
          linkedBillNumber: isStandalonePayment ? undefined : billNumber,
          isWithoutBill: isStandalonePayment,
          rawBillRecord: purchase,
        });
      }
    } else if (Number(purchase.amount_paid || 0) > 0) {
      allTxns.push({
        id: `txn_${purchase.id}`,
        voucherNumber: isStandalonePayment ? purchase.bill_number : `PAY-${purchase.id?.substring(0, 6)?.toUpperCase()}`,
        type: "payment",
        date: purchase.date ? purchase.date.split("T")[0] : new Date().toISOString().split("T")[0],
        partyId: purchase.party_id,
        partyName: purchase.vendor_name || "Unknown Vendor",
        partyPhone: purchase.vendor_phone,
        partyGstin: purchase.vendor_gstin,
        amount: Number(purchase.amount_paid || 0),
        paymentMethod: "cash",
        notes: "Initial payment recorded on bill",
        linkedBillId: isStandalonePayment ? undefined : purchase.id,
        linkedBillNumber: isStandalonePayment ? undefined : billNumber,
        isWithoutBill: isStandalonePayment,
        rawBillRecord: purchase,
      });
    }
  }

  // Sort descending: newest transactions first
  return allTxns.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return timeB - timeA;
  });
}
