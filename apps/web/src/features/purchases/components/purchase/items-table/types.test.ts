import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePurchaseLineTotal,
  PurchaseItemRowData,
  COMMON_UNITS,
} from "./types";

describe("Purchase Item Calculations", () => {
  it("calculates basic line total without discount or tax", () => {
    const item: PurchaseItemRowData = {
      description: "Steel Rods",
      quantity: 5,
      price: 100,
      total: 0,
    };
    const total = calculatePurchaseLineTotal(item);
    assert.equal(total, 500);
  });

  it("calculates line total with item-level discount", () => {
    const item: PurchaseItemRowData = {
      description: "Cement Bags",
      quantity: 10,
      price: 300,
      discount: 10, // 3000 - 10% = 2700
      total: 0,
    };
    const total = calculatePurchaseLineTotal(item);
    assert.equal(total, 2700);
  });

  it("calculates line total with item-level tax rate", () => {
    const item: PurchaseItemRowData = {
      description: "Paint Buckets",
      quantity: 2,
      price: 1000,
      discount: 0,
      tax_rate: 18, // 2000 + 18% = 2360
      total: 0,
    };
    const total = calculatePurchaseLineTotal(item);
    assert.equal(total, 2360);
  });

  it("applies defaultTaxRate fallback when item has no explicit tax rate", () => {
    const item: PurchaseItemRowData = {
      description: "Bricks",
      quantity: 100,
      price: 10, // 1000
      discount: 0,
      total: 0,
    };
    const total = calculatePurchaseLineTotal(item, 12); // 1000 + 12% = 1120
    assert.equal(total, 1120);
  });

  it("contains standard accounting units in COMMON_UNITS", () => {
    assert.ok(COMMON_UNITS.includes("pc"));
    assert.ok(COMMON_UNITS.includes("kg"));
    assert.ok(COMMON_UNITS.includes("box"));
  });
});
