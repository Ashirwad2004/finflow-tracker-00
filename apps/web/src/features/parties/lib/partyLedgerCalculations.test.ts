import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computePartyLedgerMap,
  computeDirectorySummary,
  computeActivePartyTransactions,
} from "./partyLedgerCalculations";
import { Party } from "../types";

describe("Party Ledger Calculations", () => {
  const dummyParty: Party = {
    id: "party-1",
    user_id: "user-1",
    name: "Acme Corp",
    type: "customer",
    opening_balance: 500,
    opening_balance_type: "to_receive",
    created_at: "2026-01-01T00:00:00Z",
  };

  const dummyVendor: Party = {
    id: "party-2",
    user_id: "user-1",
    name: "Beta Suppliers",
    type: "vendor",
    opening_balance: 200,
    opening_balance_type: "to_pay",
    created_at: "2026-01-01T00:00:00Z",
  };

  it("calculates party ledger receivables with opening balance and invoices", () => {
    const parties = [dummyParty];
    const sales = [
      {
        id: "inv-1",
        party_id: "party-1",
        customer_name: "Acme Corp",
        total_amount: 1000,
        amount_paid: 400,
        balance_due: 600,
        document_type: "invoice",
        status: "partial",
      },
    ];
    const purchases: any[] = [];

    const ledgerMap = computePartyLedgerMap(parties, sales, purchases);
    const metrics = ledgerMap.get("party-1");
    assert.ok(metrics);
    assert.equal(metrics.totalSalesAmount, 1000);
    assert.equal(metrics.totalSalesPaid, 400);
    assert.equal(metrics.salesBalanceDue, 600);
    // Receivable = salesBalanceDue (600) + openingBalance (500) = 1100
    assert.equal(metrics.receivable, 1100);
    assert.equal(metrics.payable, 0);
  });

  it("computes directory summary across customers and vendors", () => {
    const parties = [dummyParty, dummyVendor];
    const sales = [
      {
        id: "inv-1",
        party_id: "party-1",
        total_amount: 1000,
        amount_paid: 1000,
        balance_due: 0,
        status: "paid",
      },
    ];
    const purchases = [
      {
        id: "bill-1",
        party_id: "party-2",
        total_amount: 800,
        amount_paid: 0,
        balance_due: 800,
        status: "pending",
      },
    ];

    const ledgerMap = computePartyLedgerMap(parties, sales, purchases);
    const summary = computeDirectorySummary(parties, ledgerMap);

    assert.equal(summary.totalParties, 2);
    // Party 1: receivable = 0 (invoice paid) + 500 (opening) = 500
    // Party 2: payable = 800 (bill due) + 200 (opening) = 1000
    assert.equal(summary.totalReceivables, 500);
    assert.equal(summary.totalPayables, 1000);
    assert.equal(summary.settledCount, 0);
  });

  it("generates sorted active party transactions with tab filtering", () => {
    const party = dummyParty;
    const metrics = {
      partySales: [
        {
          id: "s-1",
          invoice_number: "INV-001",
          date: "2026-05-10",
          total_amount: 500,
          amount_paid: 500,
          status: "paid",
        },
      ],
      partyPurchases: [
        {
          id: "p-1",
          bill_number: "BILL-001",
          date: "2026-06-01",
          total_amount: 300,
          amount_paid: 100,
          balance_due: 200,
          status: "partial",
        },
      ],
      totalSalesAmount: 500,
      totalSalesPaid: 500,
      salesBalanceDue: 0,
      totalPurchasesAmount: 300,
      totalPurchasesPaid: 100,
      purchasesBalanceDue: 200,
      receivable: 500,
      payable: 200,
      totalRecords: 3,
    };

    const allTx = computeActivePartyTransactions(party, metrics, "all");
    assert.equal(allTx.length, 3); // 1 sale, 1 purchase, 1 opening balance
    // Verify descending sort: BILL-001 (2026-06-01) first, INV-001 (2026-05-10) second, OPENING third
    assert.equal(allTx[0].docNumber, "BILL-001");
    assert.equal(allTx[1].docNumber, "INV-001");
    assert.equal(allTx[2].docNumber, "OPENING");

    const salesOnly = computeActivePartyTransactions(party, metrics, "sales");
    assert.equal(salesOnly.length, 2); // INV-001 + OPENING (receivable)
    assert.equal(salesOnly[0].docType, "sale");
    assert.equal(salesOnly[1].docType, "opening_balance");

    const purchasesOnly = computeActivePartyTransactions(party, metrics, "purchases");
    assert.equal(purchasesOnly.length, 1); // BILL-001
    assert.equal(purchasesOnly[0].docType, "purchase");
  });
});
