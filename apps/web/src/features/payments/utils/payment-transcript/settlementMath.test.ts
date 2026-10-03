import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBillSettlement,
  autoAllocateFIFO,
} from "./settlementMath.ts";
import {
  parsePaymentTranscript,
  encodePaymentTranscript,
  BillPaymentVoucher,
} from "./transcriptCodec.ts";

describe("Bill Settlement Math", () => {
  it("calculates full bill settlement correctly", () => {
    const res = calculateBillSettlement(1000, 0, 1000);
    assert.equal(res.newAmountPaid, 1000);
    assert.equal(res.newBalanceDue, 0);
    assert.equal(res.newStatus, "paid");
    assert.equal(res.isOverdue, false);
  });

  it("calculates partial payment correctly", () => {
    const res = calculateBillSettlement(1000, 200, 300);
    assert.equal(res.newAmountPaid, 500);
    assert.equal(res.newBalanceDue, 500);
    assert.equal(res.newStatus, "partial");
  });

  it("caps payment at total amount and does not allow negative balance due", () => {
    const res = calculateBillSettlement(1000, 900, 200);
    assert.equal(res.newAmountPaid, 1000);
    assert.equal(res.newBalanceDue, 0);
    assert.equal(res.newStatus, "paid");
  });

  it("marks past due unpaid bills as overdue", () => {
    const pastDate = "2020-01-01";
    const res = calculateBillSettlement(500, 0, 0, pastDate);
    assert.equal(res.newStatus, "overdue");
    assert.equal(res.isOverdue, true);
  });

  it("performs FIFO auto-allocation across multiple outstanding bills", () => {
    const bills = [
      { id: "bill-1", balanceDue: 400 },
      { id: "bill-2", balanceDue: 600 },
      { id: "bill-3", balanceDue: 500 },
    ];

    // Allocate 700: 400 to bill-1, 300 to bill-2, 0 to bill-3
    const res = autoAllocateFIFO(bills, 700);
    assert.equal(res.allocations["bill-1"], 400);
    assert.equal(res.allocations["bill-2"], 300);
    assert.equal(res.allocations["bill-3"], 0);
    assert.equal(res.totalAllocated, 700);
    assert.equal(res.unallocatedAmount, 0);
  });

  it("reports unallocated amount when payment exceeds total due in FIFO", () => {
    const bills = [
      { id: "b1", balanceDue: 100 },
    ];
    const res = autoAllocateFIFO(bills, 250);
    assert.equal(res.allocations["b1"], 100);
    assert.equal(res.totalAllocated, 100);
    assert.equal(res.unallocatedAmount, 150);
  });
});

describe("Payment Transcript Codec", () => {
  it("encodes and decodes payment vouchers into notes", () => {
    const vouchers: BillPaymentVoucher[] = [
      {
        id: "vch_1",
        voucher_number: "REC-20261003-0001",
        type: "receipt",
        date: "2026-10-03",
        amount: 250,
        payment_method: "upi",
        balance_before: 1000,
        balance_after: 750,
        created_at: "2026-10-03T10:00:00Z",
      },
    ];

    const encoded = encodePaymentTranscript("Customer paid via GPay", vouchers);
    assert.match(encoded, /Customer paid via GPay/);
    assert.match(encoded, /FINFLOW_PAYMENTS:/);

    const parsed = parsePaymentTranscript(encoded, {
      total_amount: 1000,
      type: "sale",
    });

    assert.equal(parsed.cleanNotes, "Customer paid via GPay");
    assert.equal(parsed.payments.length, 1);
    assert.equal(parsed.payments[0].amount, 250);
    assert.equal(parsed.payments[0].payment_method, "upi");
  });

  it("synthesizes legacy voucher when notes have no vouchers but amount_paid > 0", () => {
    const parsed = parsePaymentTranscript("Old invoice note", {
      total_amount: 1000,
      amount_paid: 400,
      payment_method: "cash",
      type: "sale",
    });

    assert.equal(parsed.cleanNotes, "Old invoice note");
    assert.equal(parsed.payments.length, 1);
    assert.equal(parsed.payments[0].id, "vch_legacy_init");
    assert.equal(parsed.payments[0].amount, 400);
    assert.equal(parsed.payments[0].balance_after, 600);
  });
});
