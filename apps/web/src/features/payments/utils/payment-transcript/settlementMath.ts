import { PaymentMethodType } from "./transcriptCodec";
import { nonNegativeNumber, roundMoney } from "@/core/utils/money";

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
  const safeTotal = roundMoney(nonNegativeNumber(totalAmount));
  const safeCurrent = roundMoney(nonNegativeNumber(currentAmountPaid));
  const safePayment = roundMoney(nonNegativeNumber(newPaymentAmount));

  const newAmountPaid = Math.min(
    safeTotal,
    roundMoney(safeCurrent + safePayment)
  );
  const newBalanceDue = Math.max(
    0,
    roundMoney(safeTotal - newAmountPaid)
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

/** Validate the entire voucher before any bill is updated. */
export function validatePaymentAllocations(
  bills: Array<{ id: string; balanceDue: number }>,
  requestedAllocations: Record<string, number>,
  enteredAmount: number
): {
  allocations: Record<string, number>;
  paymentAmount: number;
  totalAllocated: number;
  advanceAmount: number;
} {
  const paymentAmount = roundMoney(enteredAmount);
  if (!Number.isFinite(enteredAmount) || paymentAmount <= 0) {
    throw new Error("Enter a payment amount greater than zero.");
  }
  const billsById = new Map(bills.map((bill) => [bill.id, bill]));
  const allocations: Record<string, number> = {};
  let totalAllocated = 0;
  for (const [id, requested] of Object.entries(requestedAllocations)) {
    if (!Number.isFinite(requested) || requested < 0) {
      throw new Error("Bill allocations must be finite, non-negative amounts.");
    }
    const amount = roundMoney(requested);
    if (amount === 0) continue;
    const bill = billsById.get(id);
    if (!bill) throw new Error("An allocated bill is no longer available. Refresh and try again.");
    if (amount > roundMoney(nonNegativeNumber(bill.balanceDue))) {
      throw new Error("An allocation exceeds the bill's outstanding balance.");
    }
    allocations[id] = amount;
    totalAllocated = roundMoney(totalAllocated + amount);
  }
  if (totalAllocated > paymentAmount) {
    throw new Error("The total allocated to bills exceeds the payment amount.");
  }
  return {
    allocations,
    paymentAmount,
    totalAllocated,
    advanceAmount: roundMoney(paymentAmount - totalAllocated),
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
  let remaining = roundMoney(nonNegativeNumber(paymentAmount));
  let totalAllocated = 0;

  for (const bill of bills) {
    if (remaining <= 0) {
      allocations[bill.id] = 0;
      continue;
    }
    const due = roundMoney(nonNegativeNumber(bill.balanceDue));
    const allocate = Math.min(due, remaining);
    const rounded = roundMoney(allocate);
    allocations[bill.id] = rounded;
    remaining = roundMoney(remaining - rounded);
    totalAllocated = roundMoney(totalAllocated + rounded);
  }

  return {
    allocations,
    totalAllocated,
    unallocatedAmount: Math.max(0, remaining),
  };
}
