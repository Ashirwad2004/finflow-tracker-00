import {
  BillContext,
  BillPaymentVoucher,
  encodePaymentTranscript,
  parsePaymentTranscript,
  PaymentMethodType,
} from "./transcriptCodec";

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
      balance_due: Number(
        sale.balance_due != null
          ? sale.balance_due
          : Number(sale.total_amount || 0) - Number(sale.amount_paid || 0)
      ),
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
      balance_due: Number(
        purchase.balance_due != null
          ? purchase.balance_due
          : Number(purchase.total_amount || 0) - Number(purchase.amount_paid || 0)
      ),
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
        voucherNumber: isStandalonePayment
          ? purchase.bill_number
          : `PAY-${purchase.id?.substring(0, 6)?.toUpperCase()}`,
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

/**
 * Removes a payment voucher from a bill's notes transcript and recalculates the bill's
 * payment totals and settlement status.
 */
export function removePaymentVoucherFromBill(
  notes: string | null | undefined,
  voucherId: string,
  billContext: BillContext
): {
  updatedNotes: string;
  newAmountPaid: number;
  newBalanceDue: number;
  newStatus: "paid" | "partial" | "pending" | "overdue";
  removedVoucher: BillPaymentVoucher | null;
} {
  const { cleanNotes, payments } = parsePaymentTranscript(notes, billContext);
  const voucherIndex = payments.findIndex(
    (p) => p.id === voucherId || p.voucher_number === voucherId
  );

  if (voucherIndex === -1) {
    return {
      updatedNotes: notes || "",
      newAmountPaid: Number(billContext.amount_paid || 0),
      newBalanceDue: Number(billContext.balance_due || 0),
      newStatus: (billContext.status as any) || "pending",
      removedVoucher: null,
    };
  }

  const removedVoucher = payments[voucherIndex];
  const remainingPayments = payments.filter((_, idx) => idx !== voucherIndex);
  const updatedNotes = encodePaymentTranscript(cleanNotes, remainingPayments);

  // Recalculate amount_paid: sum of remaining vouchers
  const total = Number(billContext.total_amount || 0);
  const sumRemaining = remainingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const newAmountPaid = Math.max(0, Math.min(total, Math.round(sumRemaining * 100) / 100));
  const newBalanceDue = Math.max(0, Math.round((total - newAmountPaid) * 100) / 100);

  let isOverdue = false;
  if (billContext.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(billContext.due_date);
    due.setHours(0, 0, 0, 0);
    if (due < today && newBalanceDue > 0) {
      isOverdue = true;
    }
  }

  let newStatus: "paid" | "partial" | "pending" | "overdue" = "pending";
  if (newBalanceDue <= 0.001 && total > 0) {
    newStatus = "paid";
  } else if (newAmountPaid > 0 && newAmountPaid < total) {
    newStatus = "partial";
  } else if (newAmountPaid <= 0) {
    newStatus = isOverdue ? "overdue" : "pending";
  }

  return {
    updatedNotes,
    newAmountPaid,
    newBalanceDue,
    newStatus,
    removedVoucher,
  };
}
