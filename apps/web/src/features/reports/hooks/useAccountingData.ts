import { useState, useMemo } from "react";
import {
  DatePeriodPreset,
  DateRange,
  getDateRangeFromPreset,
  computeProfitAndLoss,
  computeBillWiseProfit,
  computeReceivablesAging,
  computeDaybook,
  computeAllTransactions,
  computeCashFlow,
  computeTrialBalance,
  computeBalanceSheet,
  computeGstSlabReport,
  computeStockSummary,
  computeItemWiseProfit,
  computeFinancialHealth,
} from "../lib/accounting";
import { useAccountingRawData } from "./useAccountingRawData";

export type { DatePeriodPreset, DateRange };
export { getDateRangeFromPreset };

export function useAccountingData() {
  // Selected date range state
  const [periodPreset, setPeriodPreset] = useState<DatePeriodPreset>("this_month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPreset(periodPreset, customRange.from, customRange.to);
  }, [periodPreset, customRange]);

  // Specific Daybook date selection
  const [daybookDate, setDaybookDate] = useState<Date>(new Date());

  const {
    profile,
    allSales,
    allPurchases,
    allExpenses,
    allProducts,
    allParties,
    allLent,
    allBorrowed,
    serverPnl,
    filteredSales,
    filteredPurchases,
    filteredExpenses,
    productCostMap,
    isLoading,
    refetchAll,
  } = useAccountingRawData(periodPreset, activeDateRange);

  // =========================================================================
  // 1. PROFIT AND LOSS STATEMENT (Schedule III / Ind AS Compliant)
  // =========================================================================
  const profitAndLoss = useMemo(() => {
    return computeProfitAndLoss(filteredSales, filteredPurchases, filteredExpenses, serverPnl);
  }, [filteredSales, filteredPurchases, filteredExpenses, serverPnl]);

  // =========================================================================
  // 2. BILL-WISE PROFIT REPORT
  // =========================================================================
  const billWiseProfit = useMemo(() => {
    return computeBillWiseProfit(filteredSales, productCostMap);
  }, [filteredSales, productCostMap]);

  // =========================================================================
  // 3. RECEIVABLES AGING REPORT (0-30, 31-60, 61-90, 90+ days & MSME 45-day)
  // =========================================================================
  const receivablesAging = useMemo(() => {
    return computeReceivablesAging(allSales);
  }, [allSales]);

  // =========================================================================
  // 4. DAYBOOK (Daily Journal for a Selected Day)
  // =========================================================================
  const daybook = useMemo(() => {
    return computeDaybook(allSales, allPurchases, allExpenses, daybookDate);
  }, [allSales, allPurchases, allExpenses, daybookDate]);

  // =========================================================================
  // 5. ALL TRANSACTIONS (Master Audit Journal)
  // =========================================================================
  const allTransactions = useMemo(() => {
    return computeAllTransactions(filteredSales, filteredPurchases, filteredExpenses);
  }, [filteredSales, filteredPurchases, filteredExpenses]);

  // =========================================================================
  // 6. CASH FLOW STATEMENT (Direct Method AS-3)
  // =========================================================================
  const cashFlow = useMemo(() => {
    return computeCashFlow(
      filteredSales,
      filteredPurchases,
      filteredExpenses,
      allBorrowed,
      allLent
    );
  }, [filteredSales, filteredPurchases, filteredExpenses, allBorrowed, allLent]);

  // =========================================================================
  // 7. TRIAL BALANCE (Self-Balancing Double Entry)
  // =========================================================================
  const trialBalance = useMemo(() => {
    return computeTrialBalance(
      filteredSales,
      filteredPurchases,
      filteredExpenses,
      receivablesAging.totalOutstanding,
      allPurchases,
      allProducts,
      allSales,
      allBorrowed,
      allLent,
      allExpenses
    );
  }, [
    filteredSales,
    filteredPurchases,
    filteredExpenses,
    receivablesAging,
    allPurchases,
    allProducts,
    allSales,
    allBorrowed,
    allLent,
    allExpenses,
  ]);

  // =========================================================================
  // 8. BALANCE SHEET (Schedule III)
  // =========================================================================
  const balanceSheet = useMemo(() => {
    return computeBalanceSheet(
      receivablesAging.totalOutstanding,
      allProducts,
      allSales,
      allPurchases,
      allExpenses,
      allLent,
      allBorrowed,
      profitAndLoss.netProfitBeforeTax
    );
  }, [
    receivablesAging,
    allProducts,
    allSales,
    allPurchases,
    allExpenses,
    allLent,
    allBorrowed,
    profitAndLoss,
  ]);

  // =========================================================================
  // 9. GST SLAB-WISE REPORT (0%, 5%, 12%, 18%, 28%)
  // =========================================================================
  const gstSlabReport = useMemo(() => {
    return computeGstSlabReport(filteredSales);
  }, [filteredSales]);

  // =========================================================================
  // 10. STOCK VALUATION & ITEM P&L SUMMARY
  // =========================================================================
  const stockSummary = useMemo(() => {
    return computeStockSummary(allProducts);
  }, [allProducts]);

  const itemWiseProfit = useMemo(() => {
    return computeItemWiseProfit(filteredSales, productCostMap);
  }, [filteredSales, productCostMap]);

  // =========================================================================
  // 11. FINANCIAL HEALTH & SOLVENCY RATIOS
  // =========================================================================
  const financialHealth = useMemo(() => {
    const cashAvailable = Object.values(balanceSheet.currentAssets)[0] || 0;
    return computeFinancialHealth(
      balanceSheet.totalCurrentAssets,
      balanceSheet.totalCurrentLiabilities,
      stockSummary.totalCostValuation,
      balanceSheet.totalLiabilities,
      balanceSheet.totalEquity,
      profitAndLoss.indirectExpensesTotal,
      cashAvailable
    );
  }, [balanceSheet, stockSummary, profitAndLoss]);

  return {
    // State
    periodPreset,
    setPeriodPreset,
    customRange,
    setCustomRange,
    activeDateRange,
    daybookDate,
    setDaybookDate,
    isLoading,
    refetchAll,

    // Raw datasets
    profile,
    allSales,
    allPurchases,
    allExpenses,
    allProducts,
    allParties,
    filteredSales,
    filteredPurchases,
    filteredExpenses,

    // CA Reports
    profitAndLoss,
    billWiseProfit,
    receivablesAging,
    daybook,
    allTransactions,
    cashFlow,
    trialBalance,
    balanceSheet,
    gstSlabReport,
    stockSummary,
    itemWiseProfit,
    financialHealth,
  };
}
