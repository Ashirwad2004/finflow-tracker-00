import { describe, it, expect } from "vitest";
import {
  calculateLineItemTotal,
  calculateSubtotal,
  calculateInvoiceTotals,
  calculateInvoiceDue,
} from "./calc";

describe("Sales Calculation Service", () => {
  it("calculates line item total with discount correctly", () => {
    expect(calculateLineItemTotal(2, 50, 10)).toBe(90); // 100 - 10% = 90
    expect(calculateLineItemTotal(1, 100, 0)).toBe(100);
    expect(calculateLineItemTotal(0, 100, 10)).toBe(0);
  });

  it("calculates invoice subtotal across multiple items", () => {
    const items = [
      { quantity: 2, price: 100, discount: 0 },
      { quantity: 1, price: 50, discount: 10 }, // 45
    ];
    expect(calculateSubtotal(items)).toBe(245);
  });

  it("calculates tax and roundoff correctly for invoice-level tax", () => {
    const items = [
      { quantity: 1, price: 100, discount: 0 },
    ];
    const totals = calculateInvoiceTotals({
      items,
      overallDiscountPercent: 10, // subtotal 100, discount 10 -> taxable 90
      taxRate: 18, // 18% of 90 = 16.2
      roundOffTotal: true, // raw 106.2 -> rounded 106
    });

    expect(totals.subtotal).toBe(100);
    expect(totals.taxableAmount).toBe(90);
    expect(totals.taxAmount).toBe(16.2);
    expect(totals.rawTotal).toBe(106.2);
    expect(totals.roundedTotal).toBe(106);
    expect(totals.roundOffDiff).toBe(-0.2);
  });

  it("calculates item-wise tax rates accurately", () => {
    const items = [
      { quantity: 1, price: 100, discount: 0, tax_rate: 18 },
      { quantity: 1, price: 200, discount: 0, tax_rate: 12 },
    ];
    const totals = calculateInvoiceTotals({
      items,
      isItemWiseTax: true,
      roundOffTotal: false,
    });

    expect(totals.subtotal).toBe(300);
    // item 1: 100 * 18% = 18
    // item 2: 200 * 12% = 24
    // total tax = 42
    expect(totals.taxAmount).toBe(42);
    expect(totals.totalAmount).toBe(342);
  });

  it("calculates invoice due according to payment status", () => {
    expect(calculateInvoiceDue(500, "paid", 500)).toBe(0);
    expect(calculateInvoiceDue(500, "pending", 0)).toBe(500);
    expect(calculateInvoiceDue(500, "partial", 200)).toBe(300);
    expect(calculateInvoiceDue(500, "partial", 600)).toBe(0);
  });
});
