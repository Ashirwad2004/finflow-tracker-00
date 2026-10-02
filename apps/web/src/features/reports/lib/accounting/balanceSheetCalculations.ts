export interface BalanceSheetResult {
  currentAssets: Record<string, number>;
  totalCurrentAssets: number;
  nonCurrentAssets: Record<string, number>;
  totalNonCurrentAssets: number;
  totalAssets: number;
  currentLiabilities: Record<string, number>;
  totalCurrentLiabilities: number;
  nonCurrentLiabilities: Record<string, number>;
  totalNonCurrentLiabilities: number;
  totalLiabilities: number;
  proprietorCapital: number;
  periodProfit: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export function computeBalanceSheet(
  receivablesTotalOutstanding: number,
  allProducts: any[],
  allSales: any[],
  allPurchases: any[],
  allExpenses: any[],
  allLent: any[],
  allBorrowed: any[],
  netProfitBeforeTax: number
): BalanceSheetResult {
  // Current Assets
  const debtors = receivablesTotalOutstanding;
  let inventoryCost = 0;
  allProducts.forEach((p: any) => {
    const q = Math.max(0, Number(p.current_stock || p.stock_quantity || 0));
    const c = Number(p.cost_price || p.purchase_price || 0);
    inventoryCost += q * c;
  });

  const cashIn = allSales.reduce((acc, s) => acc + Number(s.amount_paid || 0), 0);
  const cashOut =
    allPurchases.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0) +
    allExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const cashAndBank = Math.max(0, cashIn - cashOut);

  const loansGiven = allLent.reduce((acc, l) => acc + Number(l.amount || 0), 0);

  const currentAssets = {
    "Cash and Bank Balance": cashAndBank,
    "Trade Receivables (Sundry Debtors)": debtors,
    "Inventories (Stock at Cost)": inventoryCost,
    "Short-term Loans & Advances": loansGiven,
  };
  const totalCurrentAssets = Object.values(currentAssets).reduce((a, b) => a + b, 0);

  const nonCurrentAssets = {
    "Fixed Assets & Equipment": 0,
  };
  const totalNonCurrentAssets = Object.values(nonCurrentAssets).reduce((a, b) => a + b, 0);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  // Current Liabilities
  let creditors = 0;
  allPurchases.forEach((p: any) => {
    const bal =
      p.balance_due !== undefined && p.balance_due !== null
        ? Number(p.balance_due)
        : Number(p.total_amount || 0) - Number(p.amount_paid || 0);
    if (bal > 0) creditors += bal;
  });

  // GST Payable
  const outputGst = allSales.reduce((acc, s) => acc + Number(s.tax_amount || s.gst_amount || 0), 0);
  const inputGst = allPurchases.reduce(
    (acc, p) => acc + Number(p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0),
    0
  );
  const gstPayable = Math.max(0, outputGst - inputGst);

  const currentLiabilities = {
    "Trade Payables (Sundry Creditors)": creditors,
    "Statutory GST Liability": gstPayable,
  };
  const totalCurrentLiabilities = Object.values(currentLiabilities).reduce((a, b) => a + b, 0);

  const loansPayable = allBorrowed.reduce((acc, b) => acc + Number(b.amount || 0), 0);
  const nonCurrentLiabilities = {
    "Secured & Unsecured Loans": loansPayable,
  };
  const totalNonCurrentLiabilities = Object.values(nonCurrentLiabilities).reduce((a, b) => a + b, 0);
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  // Equity
  const periodProfit = netProfitBeforeTax;
  const proprietorCapital = Math.max(0, totalAssets - totalLiabilities - periodProfit);
  const totalEquity = proprietorCapital + periodProfit;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    currentAssets,
    totalCurrentAssets,
    nonCurrentAssets,
    totalNonCurrentAssets,
    totalAssets,
    currentLiabilities,
    totalCurrentLiabilities,
    nonCurrentLiabilities,
    totalNonCurrentLiabilities,
    totalLiabilities,
    proprietorCapital,
    periodProfit,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced: Math.round(totalAssets) === Math.round(totalLiabilitiesAndEquity),
  };
}
