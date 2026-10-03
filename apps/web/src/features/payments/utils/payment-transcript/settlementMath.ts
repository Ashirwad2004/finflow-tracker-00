import { PaymentMethodType } from "./transcriptCodec";

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
      return {
        label: "Cash",
        icon: "Banknote",
        badgeClass:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      };
    case "upi":
      return {
        label: "UPI / QR",
        icon: "QrCode",
        badgeClass:
          "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      };
    case "bank_transfer":
      return {
        label: "Bank Transfer / NEFT",
        icon: "Landmark",
        badgeClass:
          "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      };
    case "card":
      return {
        label: "Debit / Credit Card",
        icon: "CreditCard",
        badgeClass:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      };
    case "cheque":
      return {
        label: "Cheque",
        icon: "FileSpreadsheet",
        badgeClass:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
      };
    default:
      return {
        label: method || "Other",
        icon: "Coins",
        badgeClass:
          "bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800",
      };
  }
}

/**
 * Standard CA/Accounting FIFO (First-In, First-Out) Auto-Allocation.
 * Allocates payment against oldest unpaid bills first.
 */
export function autoAllocateFIFO(
  bills: Array<{ id: string; balanceDue: number }>,
  paymentAmount: number
): {
  allocations: Record<string, number>;
  totalAllocated: number;
  unallocatedAmount: number;
} {
  const allocations: Record<string, number> = {};
  let remaining = Math.max(0, Number(paymentAmount) || 0);
  let totalAllocated = 0;

  for (const bill of bills) {
    if (remaining <= 0) {
      allocations[bill.id] = 0;
      continue;
    }
    const due = Math.max(0, Number(bill.balanceDue) || 0);
    const allocate = Math.min(due, remaining);
    const rounded = Math.round(allocate * 100) / 100;
    allocations[bill.id] = rounded;
    remaining = Math.round((remaining - rounded) * 100) / 100;
    totalAllocated = Math.round((totalAllocated + rounded) * 100) / 100;
  }

  return {
    allocations,
    totalAllocated,
    unallocatedAmount: Math.max(0, remaining),
  };
}
