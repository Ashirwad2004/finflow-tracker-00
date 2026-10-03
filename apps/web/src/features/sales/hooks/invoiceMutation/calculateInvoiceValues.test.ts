import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateInvoiceValues } from "./calculateInvoiceValues";
import { InvoiceFormValues } from "./types";

describe("Invoice Values Calculation Engine", () => {
  it("computes reverse tax and single item in quick billing mode", () => {
    const values: InvoiceFormValues = {
      customer_name: "Cash Walk-in",
      customer_phone: "",
      customer_email: "",
      customer_gstin: "",
      invoice_number: "INV-001",
      date: "2026-10-03",
      items: [],
      tax_rate: 18,
      overall_discount: 0,
      status: "paid",
      quick_item_name: "Stationery",
      quick_total_amount: 118,
    };

    const res = calculateInvoiceValues(values, undefined, true, false);
    assert.equal(res.calcTotalAmount, 118);
    assert.equal(res.calcSubtotal, 100);
    assert.equal(res.calcTaxAmount, 18);
    assert.equal(res.processedItems.length, 1);
    assert.equal(res.processedItems[0].description, "Stationery");
  });

  it("filters empty line items and computes subtotal and tax in standard billing", () => {
    const values: InvoiceFormValues = {
      customer_name: "Retail Client",
      customer_phone: "",
      customer_email: "",
      customer_gstin: "",
      invoice_number: "INV-002",
      date: "2026-10-03",
      items: [
        {
          description: "Widget A",
          quantity: 2,
          price: 50,
          discount: 10, // 100 - 10% = 90
          total: 0,
        },
        {
          description: "   ", // Should be filtered out
          quantity: 1,
          price: 999,
          discount: 0,
          total: 0,
        },
      ],
      tax_rate: 10, // 10% of 90 = 9
      overall_discount: 0,
      status: "pending",
    };

    const res = calculateInvoiceValues(values, undefined, false, false);
    assert.equal(res.processedItems.length, 1);
    assert.equal(res.calcSubtotal, 90);
    assert.equal(res.calcTaxAmount, 9);
    assert.equal(res.calcTotalAmount, 99);
  });

  it("handles roundOffTotal setting accurately", () => {
    const values: InvoiceFormValues = {
      customer_name: "Retail Client",
      customer_phone: "",
      customer_email: "",
      customer_gstin: "",
      invoice_number: "INV-003",
      date: "2026-10-03",
      items: [
        {
          description: "Part X",
          quantity: 1,
          price: 10.55,
          discount: 0,
          total: 0,
        },
      ],
      tax_rate: 0,
      overall_discount: 0,
      status: "paid",
    };

    // With roundOffTotal: true -> Math.round(10.55) = 11
    const resRounded = calculateInvoiceValues(
      values,
      { roundOffTotal: true } as any,
      false,
      false
    );
    assert.equal(resRounded.calcTotalAmount, 11);

    // With roundOffTotal: false -> 10.55
    const resUnrounded = calculateInvoiceValues(
      values,
      { roundOffTotal: false } as any,
      false,
      false
    );
    assert.equal(resUnrounded.calcTotalAmount, 10.55);
  });

  it("calculates item-wise tax rates when isItemWiseTax is true", () => {
    const values: InvoiceFormValues = {
      customer_name: "GST Client",
      customer_phone: "",
      customer_email: "",
      customer_gstin: "",
      invoice_number: "INV-004",
      date: "2026-10-03",
      items: [
        {
          description: "Food Item (5%)",
          quantity: 1,
          price: 100,
          discount: 0,
          tax_rate: 5,
          total: 0,
        },
        {
          description: "Electronics (18%)",
          quantity: 1,
          price: 200,
          discount: 0,
          tax_rate: 18,
          total: 0,
        },
      ],
      tax_rate: 0, // Fallback tax rate
      overall_discount: 0,
      status: "paid",
    };

    const res = calculateInvoiceValues(values, undefined, false, true);
    assert.equal(res.calcSubtotal, 300);
    // Item 1 tax: 100 * 5% = 5
    // Item 2 tax: 200 * 18% = 36
    // Total tax: 41
    assert.equal(res.calcTaxAmount, 41);
    assert.equal(res.calcTotalAmount, 341);
  });
});
