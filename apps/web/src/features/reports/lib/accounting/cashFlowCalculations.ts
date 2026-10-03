export interface CashFlowResult {
  cashFromCustomers: number;
  cashPaidToSuppliers: number;
  cashPaidForExpenses: number;
  netOperatingCashFlow: number;
  borrowingsReceived: number;
  loansDisbursed: number;
  netFinancingCashFlow: number;
  netCashChange: number;
}

export function computeCashFlow(
  filteredSales: any[],
  filteredPurchases: any[],
  filteredExpenses: any[],
  allBorrowed: any[],
  allLent: any[]
): CashFlowResult {
  // 1. Operating Activities
  let cashFromCustomers = 0;
  filteredSales.forEach((s: any) => {
    cashFromCustomers += Number(s.amount_paid || 0);
  });

  let cashPaidToSuppliers = 0;
  filteredPurchases.forEach((p: any) => {
    cashPaidToSuppliers += Number(p.amount_paid || 0);
  });

  let cashPaidForExpenses = 0;
  filteredExpenses.forEach((e: any) => {
    cashPaidForExpenses += Number(e.amount || 0);
  });

  const netOperatingCashFlow = cashFromCustomers - (cashPaidToSuppliers + cashPaidForExpenses);

  // 2. Financing Activities
  let borrowingsReceived = 0;
  allBorrowed.forEach((b: any) => {
    borrowingsReceived += Number(b.amount || 0);
  });

  let loansDisbursed = 0;
  allLent.forEach((l: any) => {
    loansDisbursed += Number(l.amount || 0);
  });

  const netFinancingCashFlow = borrowingsReceived - loansDisbursed;
  const netCashChange = netOperatingCashFlow + netFinancingCashFlow;

  return {
    cashFromCustomers,
    cashPaidToSuppliers,
    cashPaidForExpenses,
    netOperatingCashFlow,
    borrowingsReceived,
    loansDisbursed,
    netFinancingCashFlow,
    netCashChange,
  };
}
