import { discountPercent, nonNegativeNumber, roundMoney } from "@/core/utils/money";

/**
 * Pure calculation logic for sales invoices, quotations, and orders.
 * Invariant: All financial sums and taxes must be non-negative and properly rounded.
 */

export interface LineItemCalculationInput {
  quantity: number;
  price: number;
  discount?: number;
  tax_rate?: number;
}

export interface InvoiceTotalsCalculationInput {
  items: LineItemCalculationInput[];
  overallDiscountPercent?: number;
  taxRate?: number;
  isItemWiseTax?: boolean;
  roundOffTotal?: boolean;
  defaultTaxRate?: number;
}

export interface InvoiceTotalsResult {
  subtotal: number;
  overallDiscountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  effectiveTaxRate: number;
  rawTotal: number;
  roundedTotal: number;
  roundOffDiff: number;
  totalAmount: number;
}

/**
 * Calculates line item total before tax.
 */
export function calculateLineItemTotal(
  quantity: number,
  price: number,
  discountPercent: number = 0
): number {
  const qty = nonNegativeNumber(quantity);
  const unitPrice = nonNegativeNumber(price);
  const disc = Math.min(100, nonNegativeNumber(discountPercent));
  return roundMoney(Math.max(0, qty * unitPrice * (1 - disc / 100)));
}

/**
 * Calculates invoice subtotal from line items.
 */
export function calculateSubtotal(items: LineItemCalculationInput[]): number {
  return items.reduce((sum, item) => {
    return sum + calculateLineItemTotal(item.quantity, item.price, item.discount);
  }, 0);
}

/**
 * Computes all authoritative invoice totals, taxes, and roundoff.
 */
export function calculateInvoiceTotals(
  input: InvoiceTotalsCalculationInput
): InvoiceTotalsResult {
  const {
    items = [],
    overallDiscountPercent = 0,
    taxRate = 0,
    isItemWiseTax = false,
    roundOffTotal = false,
    defaultTaxRate = 0,
  } = input;

  const subtotal = roundMoney(calculateSubtotal(items));
  const discountPct = discountPercent(overallDiscountPercent);
  const overallDiscountAmount = roundMoney((subtotal * discountPct) / 100);
  const taxableAmount = roundMoney(Math.max(0, subtotal - overallDiscountAmount));

  let taxAmount = 0;
  let effectiveTaxRate = nonNegativeNumber(taxRate);

  if (isItemWiseTax) {
    const discountFactor = subtotal > 0 ? taxableAmount / subtotal : 1;
    taxAmount = items.reduce((sum, item) => {
      const lineTaxable =
        calculateLineItemTotal(item.quantity, item.price, item.discount) *
        discountFactor;
      const itemTaxRate = nonNegativeNumber(item.tax_rate ?? defaultTaxRate);
      return sum + (lineTaxable * itemTaxRate) / 100;
    }, 0);

    effectiveTaxRate =
      taxableAmount > 0 ? (taxAmount / taxableAmount) * 100 : 0;
  } else {
    taxAmount = (taxableAmount * effectiveTaxRate) / 100;
  }

  taxAmount = roundMoney(taxAmount);
  const rawTotal = roundMoney(taxableAmount + taxAmount);
  const roundedTotal = roundOffTotal ? Math.round(rawTotal) : rawTotal;
  const roundOffDiff = roundOffTotal ? roundMoney(roundedTotal - rawTotal) : 0;

  return {
    subtotal,
    overallDiscountAmount,
    taxableAmount,
    taxAmount,
    effectiveTaxRate: roundMoney(effectiveTaxRate),
    rawTotal,
    roundedTotal,
    roundOffDiff,
    totalAmount: roundedTotal,
  };
}

/**
 * Calculates current invoice due depending on status and paid amount.
 */
export function calculateInvoiceDue(
  totalAmount: number,
  status: "paid" | "pending" | "partial",
  amountPaid: number = 0
): number {
  if (status === "paid") return 0;
  const total = roundMoney(nonNegativeNumber(totalAmount));
  if (status === "pending") return total;
  const paid = roundMoney(nonNegativeNumber(amountPaid));
  return roundMoney(Math.max(0, total - paid));
}

/** Resolve legacy or current invoice records without replacing a settled zero balance. */
export function getInvoiceOutstandingAmount(invoice: {
  total_amount?: number | string | null;
  amount_paid?: number | string | null;
  balance_due?: number | string | null;
  status?: string | null;
} | null | undefined): number {
  if (!invoice || ["paid", "cancelled", "draft"].includes(invoice.status || "")) return 0;
  const total = roundMoney(nonNegativeNumber(invoice.total_amount));
  if (invoice.balance_due != null) {
    return roundMoney(Math.min(total, nonNegativeNumber(invoice.balance_due)));
  }
  return roundMoney(Math.max(0, total - nonNegativeNumber(invoice.amount_paid)));
}
