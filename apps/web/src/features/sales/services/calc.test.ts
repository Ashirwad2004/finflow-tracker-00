import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateLineItemTotal,
  calculateSubtotal,
  calculateInvoiceTotals,
  calculateInvoiceDue,
} from "./calc";

describe("Sales Calculation Service", () => {
  it("calculates line item total with discount correctly", () => {
    assert.equal(calculateLineItemTotal(2, 50, 10), 90); // 100 - 10% = 90
    assert.equal(calculateLineItemTotal(1, 100, 0), 100);
    assert.equal(calculateLineItemTotal(0, 100, 10), 0);
  });

  it("calculates invoice subtotal across multiple items", () => {
    const items = [
      { quantity: 2, price: 100, discount: 0 },
      { quantity: 1, price: 50, discount: 10 }, // 45
    ];
    assert.equal(calculateSubtotal(items), 245);
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

    assert.equal(totals.subtotal, 100);
    assert.equal(totals.taxableAmount, 90);
    assert.equal(totals.taxAmount, 16.2);
    assert.equal(totals.rawTotal, 106.2);
    assert.equal(totals.roundedTotal, 106);
    assert.equal(totals.roundOffDiff, -0.2);
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

    assert.equal(totals.subtotal, 300);
    // item 1: 100 * 18% = 18
    // item 2: 200 * 12% = 24
    // total tax = 42
    assert.equal(totals.taxAmount, 42);
    assert.equal(totals.totalAmount, 342);
  });

  it("calculates invoice due according to payment status", () => {
    assert.equal(calculateInvoiceDue(500, "paid", 500), 0);
    assert.equal(calculateInvoiceDue(500, "pending", 0), 500);
    assert.equal(calculateInvoiceDue(500, "partial", 200), 300);
    assert.equal(calculateInvoiceDue(500, "partial", 600), 0);
  });
});
