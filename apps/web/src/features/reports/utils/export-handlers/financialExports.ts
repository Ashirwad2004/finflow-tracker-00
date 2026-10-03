import { downloadReportCSV } from "../exportReportUtils";
import { ReportBusinessInfo } from "./types";

export function exportTrialBalance(trialBalance: any, businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    trialBalance.items,
    [
      { header: "Account Particulars", accessor: (i) => i.accountName },
      { header: "Account Type", accessor: (i) => i.accountType },
      { header: "Debit Amount (₹)", accessor: (i) => i.debit || "" },
      { header: "Credit Amount (₹)", accessor: (i) => i.credit || "" },
    ],
    "Trial_Balance",
    businessInfo
  );
}

export function exportCashFlow(cashFlow: any, businessInfo: ReportBusinessInfo): void {
  const cfRows = [
    { particulars: "Cash Receipts from Customers", section: "Operating", amount: cashFlow.cashFromCustomers },
    { particulars: "Cash Paid to Suppliers", section: "Operating", amount: -cashFlow.cashPaidToSuppliers },
    { particulars: "Cash Paid for Operating Expenses", section: "Operating", amount: -cashFlow.cashPaidForExpenses },
    {
      particulars: "Net Cash from Operating Activities (A)",
      section: "Operating",
      amount: cashFlow.netOperatingCashFlow,
    },
    { particulars: "Proceeds from Loans & Borrowings", section: "Financing", amount: cashFlow.borrowingsReceived },
    { particulars: "Loans Given / Advances Repaid", section: "Financing", amount: -cashFlow.loansDisbursed },
    {
      particulars: "Net Cash from Financing Activities (B)",
      section: "Financing",
      amount: cashFlow.netFinancingCashFlow,
    },
    {
      particulars: "NET INCREASE / (DECREASE) IN CASH & BANK (A + B)",
      section: "Net Cash Flow",
      amount: cashFlow.netCashChange,
    },
  ];
  downloadReportCSV(
    cfRows,
    [
      { header: "Activity Particulars", accessor: (r) => r.particulars },
      { header: "Classification", accessor: (r) => r.section },
      { header: "Amount (₹)", accessor: (r) => r.amount },
    ],
    "Cash_Flow_Statement_AS3",
    businessInfo
  );
}

export function exportProfitAndLoss(profitAndLoss: any, businessInfo: ReportBusinessInfo): void {
  const pnlRows = [
    { particulars: "Gross Sales / Turnover", section: "Revenue", amount: profitAndLoss.grossSalesRevenue },
    {
      particulars: "Less: Sales Returns & Credit Notes",
      section: "Revenue",
      amount: -profitAndLoss.salesReturns,
    },
    { particulars: "Net Revenue from Operations", section: "Revenue", amount: profitAndLoss.netRevenue },
    { particulars: "Purchases of Stock-in-Trade", section: "COGS", amount: profitAndLoss.purchasesCost },
    {
      particulars: "Direct Production / Packaging Expenses",
      section: "COGS",
      amount: profitAndLoss.directExpensesTotal,
    },
    { particulars: "Cost of Goods Sold (COGS)", section: "COGS", amount: profitAndLoss.costOfGoodsSold },
    { particulars: "GROSS PROFIT", section: "Profitability", amount: profitAndLoss.grossProfit },
    ...Object.entries(profitAndLoss.indirectCategories).map(([cat, amt]) => ({
      particulars: `Indirect Overhead: ${cat}`,
      section: "Indirect Expenses",
      amount: amt,
    })),
    {
      particulars: "Total Indirect Expenses",
      section: "Indirect Expenses",
      amount: profitAndLoss.indirectExpensesTotal,
    },
    { particulars: "NET PROFIT BEFORE TAX", section: "Net Result", amount: profitAndLoss.netProfitBeforeTax },
  ];
  downloadReportCSV(
    pnlRows,
    [
      { header: "Particulars", accessor: (r) => r.particulars },
      { header: "Statement Classification", accessor: (r) => r.section },
      { header: "Amount (₹)", accessor: (r) => r.amount },
    ],
    "Profit_And_Loss_Statement_Schedule_III",
    businessInfo
  );
}

export function exportBalanceSheet(balanceSheet: any, businessInfo: ReportBusinessInfo): void {
  const bsRows = [
    ...Object.entries(balanceSheet.currentAssets).map(([name, val]) => ({
      particulars: name,
      side: "Current Assets",
      amount: val,
    })),
    { particulars: "Total Current Assets", side: "Current Assets", amount: balanceSheet.totalCurrentAssets },
    { particulars: "TOTAL ASSETS", side: "Application of Funds", amount: balanceSheet.totalAssets },
    ...Object.entries(balanceSheet.currentLiabilities).map(([name, val]) => ({
      particulars: name,
      side: "Current Liabilities",
      amount: val,
    })),
    {
      particulars: "Total Current Liabilities",
      side: "Current Liabilities",
      amount: balanceSheet.totalCurrentLiabilities,
    },
    {
      particulars: "Proprietor's Capital Account",
      side: "Owner's Equity",
      amount: balanceSheet.proprietorCapital,
    },
    { particulars: "Current Period Profit / Loss", side: "Owner's Equity", amount: balanceSheet.periodProfit },
    {
      particulars: "TOTAL LIABILITIES & EQUITY",
      side: "Sources of Funds",
      amount: balanceSheet.totalLiabilitiesAndEquity,
    },
  ];
  downloadReportCSV(
    bsRows,
    [
      { header: "Account Particulars", accessor: (r) => r.particulars },
      { header: "Balance Sheet Side", accessor: (r) => r.side },
      { header: "Amount (₹)", accessor: (r) => r.amount },
    ],
    "Balance_Sheet_Schedule_III",
    businessInfo
  );
}

export function exportBusinessHealth(
  financialHealth: any,
  balanceSheet: any,
  stockSummary: any,
  businessInfo: ReportBusinessInfo
): void {
  const healthRows = [
    {
      metric: "Working Capital (Current Assets - Current Liabilities)",
      value: `${financialHealth.workingCapital}`,
    },
    {
      metric: "Current Ratio (Ideal: > 1.33)",
      value: `${financialHealth.currentRatio.toFixed(2)} : 1`,
    },
    {
      metric: "Quick / Acid Test Ratio (Ideal: > 1.0)",
      value: `${financialHealth.quickRatio.toFixed(2)} : 1`,
    },
    { metric: "Debt-to-Equity Ratio", value: `${financialHealth.debtToEquity.toFixed(2)}` },
    { metric: "Cash Runway", value: `${financialHealth.cashRunwayMonths.toFixed(1)} months` },
    { metric: "Total Current Assets", value: `${balanceSheet.totalCurrentAssets}` },
    { metric: "Total Current Liabilities", value: `${balanceSheet.totalCurrentLiabilities}` },
    { metric: "Total Stock Cost Valuation", value: `${stockSummary.totalCostValuation}` },
  ];
  downloadReportCSV(
    healthRows,
    [
      { header: "Financial Diagnostic Metric", accessor: (r) => r.metric },
      { header: "Value / Status", accessor: (r) => r.value },
    ],
    "Business_Health_Solvency_Diagnostic",
    businessInfo
  );
}
