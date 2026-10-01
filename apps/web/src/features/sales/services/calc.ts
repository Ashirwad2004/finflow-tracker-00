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
  const qty = Number(quantity) || 0;
  const unitPrice = Number(price) || 0;
  const disc = Number(discountPercent) || 0;
  return Math.max(0, qty * unitPrice * (1 - disc / 100));
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

  const subtotal = calculateSubtotal(items);
  const discountPct = Number(overallDiscountPercent) || 0;
  const overallDiscountAmount = (subtotal * discountPct) / 100;
  const taxableAmount = Math.max(0, subtotal - overallDiscountAmount);

  let taxAmount = 0;
  let effectiveTaxRate = Number(taxRate) || 0;

  if (isItemWiseTax) {
    const discountFactor = subtotal > 0 ? taxableAmount / subtotal : 1;
    taxAmount = items.reduce((sum, item) => {
      const lineTaxable =
        calculateLineItemTotal(item.quantity, item.price, item.discount) *
        discountFactor;
      const itemTaxRate = Number(item.tax_rate ?? defaultTaxRate ?? 0);
      return sum + (lineTaxable * itemTaxRate) / 100;
    }, 0);

    effectiveTaxRate =
      taxableAmount > 0 ? (taxAmount / taxableAmount) * 100 : 0;
  } else {
    taxAmount = (taxableAmount * effectiveTaxRate) / 100;
  }

  const rawTotal = taxableAmount + taxAmount;
  const roundedTotal = roundOffTotal ? Math.round(rawTotal) : rawTotal;
  const roundOffDiff = roundOffTotal ? roundedTotal - rawTotal : 0;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    overallDiscountAmount: Math.round(overallDiscountAmount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
    rawTotal: Math.round(rawTotal * 100) / 100,
    roundedTotal: Math.round(roundedTotal * 100) / 100,
    roundOffDiff: Math.round(roundOffDiff * 100) / 100,
    totalAmount: Math.round(roundedTotal * 100) / 100,
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
  if (status === "pending") return totalAmount;
  const paid = Number(amountPaid) || 0;
  return Math.max(0, totalAmount - paid);
}
