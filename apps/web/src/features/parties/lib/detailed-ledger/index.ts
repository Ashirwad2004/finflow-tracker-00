import {
  LedgerTransaction,
  ComputeDetailedPartyLedgerParams,
  DetailedPartyLedgerResult,
} from "./types";
import { processSalesForLedger } from "./salesLedgerProcessor";
import { processPurchasesForLedger } from "./purchasesLedgerProcessor";
import {
  sortAndFilterLedgerTransactions,
  accumulateLedgerBalances,
} from "./ledgerAccumulator";

export * from "./types";
export * from "./salesLedgerProcessor";
export * from "./purchasesLedgerProcessor";
export * from "./ledgerAccumulator";

export function computeDetailedPartyLedger({
  selectedParty,
  activePartyRecord,
  partiesDirectory,
  sales,
  purchases,
  dateRange,
}: ComputeDetailedPartyLedgerParams): DetailedPartyLedgerResult {
  if (!selectedParty || selectedParty === "all") {
    return {
      fullLedger: [],
      closingBalance: 0,
      totalPeriodDebit: 0,
      totalPeriodCredit: 0,
      hasBroughtForward: false,
      initialBroughtForward: 0,
    };
  }

  const normSelected = selectedParty.trim().toLowerCase();
  const partyId = activePartyRecord?.id;
  const rawTransactions: Omit<LedgerTransaction, "runningBalance">[] = [];

  // 1. OPENING BALANCE (Recorded in Parties Directory)
  const masterParty = partiesDirectory.find(
    (p: any) =>
      (partyId && p.id === partyId) ||
      (p.name && p.name.trim().toLowerCase() === normSelected)
  );

  if (masterParty && Number(masterParty.opening_balance) > 0) {
    const openBal = Number(masterParty.opening_balance);
    const isReceivable = masterParty.opening_balance_type
      ? masterParty.opening_balance_type === "to_receive"
      : masterParty.type !== "vendor";

    rawTransactions.push({
      id: `open-bal-${masterParty.id}`,
      date: masterParty.created_at || "2020-01-01T00:00:00.000Z",
      type: "opening_balance",
      amount: openBal,
      amount_paid: 0,
      balance_due: openBal,
      status: isReceivable ? "to_receive" : "to_pay",
      ref: "Opening Balance (Master Record)",
      debit: isReceivable ? openBal : 0,
      credit: !isReceivable ? openBal : 0,
      voucher_number: "OPENING",
    });
  }

  // 2. PROCESS SALES (Receivables & Collections)
  const salesTxns = processSalesForLedger(sales, partyId, normSelected);
  rawTransactions.push(...salesTxns);

  // 3. PROCESS PURCHASES (Payables & Disbursements)
  const purchasesTxns = processPurchasesForLedger(purchases, partyId, normSelected);
  rawTransactions.push(...purchasesTxns);

  // 4 & 5. SORT AND FILTER WITH BALANCE BROUGHT FORWARD
  const { filteredRaw, initialBroughtForward, hasBF } = sortAndFilterLedgerTransactions(
    rawTransactions,
    dateRange
  );

  // 6. ACCUMULATE RUNNING BALANCE
  return accumulateLedgerBalances(
    filteredRaw,
    initialBroughtForward,
    hasBF,
    dateRange
  );
}
