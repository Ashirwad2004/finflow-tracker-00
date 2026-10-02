export interface FinancialHealthResult {
  workingCapital: number;
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  cashRunwayMonths: number;
  cashAvailable: number;
}

export function computeFinancialHealth(
  totalCurrentAssets: number,
  totalCurrentLiabilities: number,
  totalCostValuation: number,
  totalDebt: number,
  totalEquity: number,
  indirectExpensesTotal: number,
  cashAvailable: number
): FinancialHealthResult {
  const workingCapital = totalCurrentAssets - totalCurrentLiabilities;
  const currentRatio =
    totalCurrentLiabilities > 0
      ? totalCurrentAssets / totalCurrentLiabilities
      : totalCurrentAssets > 0
      ? 99
      : 0;
  const quickRatio =
    totalCurrentLiabilities > 0
      ? (totalCurrentAssets - totalCostValuation) / totalCurrentLiabilities
      : 0;

  const safeEquity = Math.max(1, totalEquity);
  const debtToEquity = totalDebt / safeEquity;

  // Monthly burn rate based on indirect expenses
  const monthlyBurn = Math.max(1, indirectExpensesTotal);
  const cashRunwayMonths = cashAvailable > 0 ? cashAvailable / monthlyBurn : 0;

  return {
    workingCapital,
    currentRatio,
    quickRatio,
    debtToEquity,
    cashRunwayMonths,
    cashAvailable,
  };
}
