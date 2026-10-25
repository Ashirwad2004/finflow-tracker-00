import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computePartyLedgerMap,
  computeDirectorySummary,
  computeActivePartyTransactions,
} from "./partyLedgerCalculations";
import { Party } from "../types";
import { computeDetailedPartyLedger, processSalesForLedger, processPurchasesForLedger } from "./detailed-ledger";

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

  it("applies receipts and credit notes regardless of sales input order", () => {
    const party = { ...dummyParty, opening_balance: 0 };
    const invoice = { party_id: party.id, total_amount: 1000, amount_paid: 100, balance_due: 900 };
    const receipt = { party_id: party.id, document_type: "receipt", total_amount: 250 };
    const credit = { party_id: party.id, document_type: "credit_note", total_amount: 150 };

    for (const sales of [[invoice, receipt, credit], [receipt, credit, invoice], [credit, invoice, receipt]]) {
      const metrics = computePartyLedgerMap([party], sales, []).get(party.id)!;
      assert.equal(metrics.salesBalanceDue, 500);
      assert.equal(metrics.receivable, 500);
      assert.equal(metrics.payable, 0);
    }
  });

  it("applies payments and debit notes regardless of purchase input order", () => {
    const party = { ...dummyVendor, opening_balance: 0 };
    const bill = { party_id: party.id, total_amount: 1000, amount_paid: 100, balance_due: 900 };
    const payment = { party_id: party.id, document_type: "payment", total_amount: 250 };
    const debit = { party_id: party.id, document_type: "debit_note", total_amount: 150 };

    for (const purchases of [[bill, payment, debit], [payment, debit, bill], [debit, bill, payment]]) {
      const metrics = computePartyLedgerMap([party], [], purchases).get(party.id)!;
      assert.equal(metrics.purchasesBalanceDue, 500);
      assert.equal(metrics.payable, 500);
      assert.equal(metrics.receivable, 0);
    }
  });

  it("settles opening balances with standalone receipts and payments", () => {
    const receipt = { party_id: dummyParty.id, document_type: "receipt", total_amount: 300 };
    const payment = { party_id: dummyVendor.id, document_type: "payment", total_amount: 150 };
    const map = computePartyLedgerMap([dummyParty, dummyVendor], [receipt], [payment]);

    assert.equal(map.get(dummyParty.id)!.receivable, 200);
    assert.equal(map.get(dummyVendor.id)!.payable, 50);
  });

  it("preserves customer and supplier advances on the opposite balance side", () => {
    const receipt = { party_id: dummyParty.id, document_type: "receipt", total_amount: 700 };
    const payment = { party_id: dummyVendor.id, document_type: "payment", total_amount: 350 };
    const map = computePartyLedgerMap([dummyParty, dummyVendor], [receipt], [payment]);

    assert.equal(map.get(dummyParty.id)!.receivable, 0);
    assert.equal(map.get(dummyParty.id)!.payable, 200);
    assert.equal(map.get(dummyVendor.id)!.payable, 0);
    assert.equal(map.get(dummyVendor.id)!.receivable, 150);
  });

  it("keeps drafts and cancelled documents visible without posting their balances", () => {
    const party = { ...dummyParty, opening_balance: 0 };
    const sales = [
      { party_id: party.id, total_amount: 100, status: "draft" },
      { party_id: party.id, total_amount: 200, status: "cancelled" },
      { party_id: party.id, total_amount: 300, document_type: "receipt", status: "cancelled" },
    ];
    const purchases = [{ party_id: party.id, total_amount: 400, status: "draft" }];
    const metrics = computePartyLedgerMap([party], sales, purchases).get(party.id)!;

    assert.equal(metrics.totalSalesAmount, 0);
    assert.equal(metrics.totalPurchasesAmount, 0);
    assert.equal(metrics.receivable, 0);
    assert.equal(metrics.payable, 0);
    assert.equal(metrics.totalRecords, 4);
  });

  it("uses party IDs before name matches for parties sharing the same name", () => {
    const first = { ...dummyParty, opening_balance: 0 };
    const second = { ...first, id: "party-duplicate-name" };
    const sales = [{ party_id: first.id, customer_name: first.name, total_amount: 100 }];
    const purchases = [{ party_id: second.id, vendor_name: second.name, total_amount: 200 }];
    const map = computePartyLedgerMap([first, second], sales, purchases);

    assert.equal(map.get(first.id)!.receivable, 100);
    assert.equal(map.get(first.id)!.payable, 0);
    assert.equal(map.get(second.id)!.receivable, 0);
    assert.equal(map.get(second.id)!.payable, 200);

    const legacy = computePartyLedgerMap([first], [{ customer_name: "  ACME CORP  ", total_amount: 50 }], []);
    assert.equal(legacy.get(first.id)!.receivable, 50);
  });

  it("excludes unposted and other parties' same-name documents from detailed ledgers", () => {
    const sales = [
      { id: "sale-cancelled", party_id: dummyParty.id, total_amount: 100, status: "cancelled" },
      { id: "sale-draft", party_id: dummyParty.id, total_amount: 200, status: "draft" },
      { id: "sale-other", party_id: "another-party", customer_name: dummyParty.name, total_amount: 300 },
      { id: "sale-posted", party_id: dummyParty.id, total_amount: 400 },
    ];
    const purchases = [
      { id: "purchase-draft", party_id: dummyParty.id, total_amount: 100, status: "draft" },
      { id: "purchase-other", party_id: "another-party", vendor_name: dummyParty.name, total_amount: 200 },
      { id: "purchase-posted", party_id: dummyParty.id, total_amount: 300 },
    ];

    const salesRows = processSalesForLedger(sales, dummyParty.id, "acme corp");
    const purchaseRows = processPurchasesForLedger(purchases, dummyParty.id, "acme corp");
    assert.equal(salesRows.length, 1);
    assert.equal(salesRows[0].debit, 400);
    assert.equal(purchaseRows.length, 1);
    assert.equal(purchaseRows[0].credit, 300);
  });

  it("uses the selected party's opening balance before an earlier same-name directory row", () => {
    const selected = { ...dummyParty, id: "selected-party", opening_balance: 125 };
    const ledger = computeDetailedPartyLedger({
      selectedParty: selected.name,
      activePartyRecord: selected,
      partiesDirectory: [dummyParty, selected],
      sales: [],
      purchases: [],
      dateRange: {},
    });

    assert.equal(ledger.closingBalance, 125);
    assert.equal(ledger.fullLedger[0].id, "open-bal-selected-party");
  });

  it("does not match unnamed documents when no party identity is selected", () => {
    assert.deepEqual(processSalesForLedger([{ id: "sale", total_amount: 100 }], undefined, ""), []);
    assert.deepEqual(processPurchasesForLedger([{ id: "purchase", total_amount: 100 }], undefined, ""), []);
  });
});
