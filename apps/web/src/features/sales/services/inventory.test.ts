import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateInventoryDeductions } from "./inventory";

describe("Invoice inventory deductions", () => {
  const product = {
    id: "7ae02cbf-4ba0-4c15-bab1-a5bbb04ebfda",
    name: "Widget",
    stock_quantity: 10,
  };

  it("deducts all duplicate product rows once instead of overwriting each deduction", () => {
    const deductions = calculateInventoryDeductions([
      { description: "Widget", quantity: 2 },
      { description: " widget ", quantity: 3 },
    ], [product]);
    assert.equal(deductions.length, 1);
    assert.equal(deductions[0].quantity, 5);
    assert.equal(deductions[0].updatedStock, 5);
    assert.equal(product.stock_quantity, 10);
  });

  it("skips unmapped and invalid lines and preserves fractional or negative opening stock", () => {
    const deductions = calculateInventoryDeductions([
      { description: "Widget", quantity: 0.5 },
      { description: "Widget", quantity: -2 },
      { description: "Widget", quantity: Infinity },
      { description: "Custom service", quantity: 1 },
    ], [{ ...product, stock_quantity: -1 }]);
    assert.equal(deductions.length, 1);
    assert.equal(deductions[0].updatedStock, -1.5);
  });

  it("prioritizes product_id reference over product name to prevent naming collision errors", () => {
    const deductions = calculateInventoryDeductions([
      { product_id: "7ae02cbf-4ba0-4c15-bab1-a5bbb04ebfda", description: "Different Display Name", quantity: 4 },
    ], [product]);
    assert.equal(deductions.length, 1);
    assert.equal(deductions[0].product.id, product.id);
    assert.equal(deductions[0].quantity, 4);
    assert.equal(deductions[0].updatedStock, 6);
  });
});
