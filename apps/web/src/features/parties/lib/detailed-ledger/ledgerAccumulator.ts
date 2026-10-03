import { format, startOfDay, endOfDay } from "date-fns";
import { LedgerTransaction, DetailedPartyLedgerResult, parseSafeDate } from "./types";

export function sortAndFilterLedgerTransactions(
  rawTransactions: Omit<LedgerTransaction, "runningBalance">[],
  dateRange: { from?: Date; to?: Date }
): {
  filteredRaw: Omit<LedgerTransaction, "runningBalance">[];
  initialBroughtForward: number;
  hasBF: boolean;
} {
  // Chronological sorting
  rawTransactions.sort((a, b) => {
    const timeA = parseSafeDate(a.date).getTime();
    const timeB = parseSafeDate(b.date).getTime();
    if (timeA !== timeB) return timeA - timeB;

    const priority = (t: string) => {
      if (t === "opening_balance") return 0;
      if (t === "sale" || t === "purchase") return 1;
      if (t === "debit_note" || t === "credit_note") return 2;
      return 3;
    };
    return priority(a.type) - priority(b.type);
  });

  // Date range filter with balance brought forward (b/f)
  let initialBroughtForward = 0;
  let filteredRaw: Omit<LedgerTransaction, "runningBalance">[] = [];
  let hasBF = false;

  if (dateRange.from) {
    hasBF = true;
    const startPeriod = startOfDay(dateRange.from).getTime();
    const endPeriod = dateRange.to
      ? endOfDay(dateRange.to).getTime()
      : Infinity;

    rawTransactions.forEach((tx) => {
      const txTime = parseSafeDate(tx.date).getTime();
      if (txTime < startPeriod) {
        initialBroughtForward += tx.debit - tx.credit;
      } else if (txTime <= endPeriod) {
        filteredRaw.push(tx);
      }
    });
  } else if (dateRange.to) {
    const endPeriod = endOfDay(dateRange.to).getTime();
    rawTransactions.forEach((tx) => {
      const txTime = parseSafeDate(tx.date).getTime();
      if (txTime <= endPeriod) {
        filteredRaw.push(tx);
      }
    });
  } else {
    filteredRaw = [...rawTransactions];
  }

  return { filteredRaw, initialBroughtForward, hasBF };
}

export function accumulateLedgerBalances(
  filteredRaw: Omit<LedgerTransaction, "runningBalance">[],
  initialBroughtForward: number,
  hasBF: boolean,
  dateRange: { from?: Date; to?: Date }
): DetailedPartyLedgerResult {
  const ledgerList: LedgerTransaction[] = [];
  let currentBalance = 0;
  let periodDr = 0;
  let periodCr = 0;

  if (dateRange.from) {
    currentBalance = initialBroughtForward;
    ledgerList.push({
      id: "opening-balance-bfwd",
      date: format(dateRange.from, "yyyy-MM-dd"),
      type: "opening_balance",
      amount: Math.abs(initialBroughtForward),
      ref: "Opening Balance b/f (Prior Period)",
      debit: initialBroughtForward > 0 ? initialBroughtForward : 0,
      credit: initialBroughtForward < 0 ? Math.abs(initialBroughtForward) : 0,
      runningBalance: initialBroughtForward,
      status: "cleared",
      voucher_number: "B/FWD",
    });
  }

  filteredRaw.forEach((tx) => {
    currentBalance += tx.debit - tx.credit;
    periodDr += tx.debit;
    periodCr += tx.credit;
    ledgerList.push({
      ...tx,
      runningBalance: currentBalance,
    });
  });

  return {
    fullLedger: ledgerList,
    closingBalance: currentBalance,
    totalPeriodDebit: periodDr,
    totalPeriodCredit: periodCr,
    hasBroughtForward: hasBF,
    initialBroughtForward,
  };
}
