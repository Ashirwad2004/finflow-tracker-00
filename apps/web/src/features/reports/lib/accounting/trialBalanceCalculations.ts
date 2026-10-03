export interface TrialBalanceItem {
  accountName: string;
  accountType: "Asset" | "Liability" | "Income" | "Expense" | "Equity";
  debit: number;
  credit: number;
}

export interface TrialBalanceResult {
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export function computeTrialBalance(
  filteredSales: any[],
  filteredPurchases: any[],
  filteredExpenses: any[],
  receivablesTotalOutstanding: number,
  allPurchases: any[],
  allProducts: any[],
  allSales: any[],
  allBorrowed: any[],
  allLent: any[]
): TrialBalanceResult {
  const items: TrialBalanceItem[] = [];

  // Revenue from Sales (Credit)
  const salesRev = filteredSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
  if (salesRev > 0) {
    items.push({ accountName: "Sales Revenue Account", accountType: "Income", debit: 0, credit: salesRev });
  }

  // Purchases (Debit)
  const purCost = filteredPurchases.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);
  if (purCost > 0) {
    items.push({ accountName: "Purchases Account", accountType: "Expense", debit: purCost, credit: 0 });
  }

  // Direct & Operating Expenses (Debit)
  const expTotal = filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  if (expTotal > 0) {
    items.push({ accountName: "Operating Expenses Account", accountType: "Expense", debit: expTotal, credit: 0 });
  }

  // Sundry Debtors (Receivables from Customers) -> Debit
  const sundryDebtors = receivablesTotalOutstanding;
  if (sundryDebtors > 0) {
    items.push({ accountName: "Sundry Debtors (Receivables)", accountType: "Asset", debit: sundryDebtors, credit: 0 });
  }

  // Sundry Creditors (Payables to Suppliers) -> Credit
  let sundryCreditors = 0;
  allPurchases.forEach((p: any) => {
    const bal =
      p.balance_due !== undefined && p.balance_due !== null
        ? Number(p.balance_due)
        : Number(p.total_amount || 0) - Number(p.amount_paid || 0);
    if (bal > 0) sundryCreditors += bal;
  });
  if (sundryCreditors > 0) {
    items.push({ accountName: "Sundry Creditors (Payables)", accountType: "Liability", debit: 0, credit: sundryCreditors });
  }

  // Closing Stock Valuation -> Asset (Debit)
  let closingStockVal = 0;
  allProducts.forEach((prod: any) => {
    const qty = Math.max(0, Number(prod.current_stock || prod.stock_quantity || 0));
    const cost = Number(prod.cost_price || prod.purchase_price || 0);
    closingStockVal += qty * cost;
  });
  if (closingStockVal > 0) {
    items.push({ accountName: "Stock in Hand (Inventory)", accountType: "Asset", debit: closingStockVal, credit: 0 });
  }

  // Estimated Cash & Bank Balance -> Asset (Debit)
  const cashIn = allSales.reduce((acc, s) => acc + Number(s.amount_paid || 0), 0);
  const cashOut =
    allPurchases.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0) +
    allExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const cashBalance = Math.max(0, cashIn - cashOut);
  if (cashBalance > 0) {
    items.push({ accountName: "Cash & Bank Balances", accountType: "Asset", debit: cashBalance, credit: 0 });
  }

  // Loans Borrowed (Credit) & Loans Lent (Debit)
  const totBorrowed = allBorrowed.reduce((acc, b) => acc + Number(b.amount || 0), 0);
  if (totBorrowed > 0) {
    items.push({ accountName: "Loans & Borrowings", accountType: "Liability", debit: 0, credit: totBorrowed });
  }

  const totLent = allLent.reduce((acc, l) => acc + Number(l.amount || 0), 0);
  if (totLent > 0) {
    items.push({ accountName: "Loans & Advances Given", accountType: "Asset", debit: totLent, credit: 0 });
  }

  // Balancing Capital Account
  let totalDebit = items.reduce((acc, it) => acc + it.debit, 0);
  let totalCredit = items.reduce((acc, it) => acc + it.credit, 0);
  const diff = totalDebit - totalCredit;

  if (diff > 0) {
    items.push({ accountName: "Proprietor's Capital Account", accountType: "Equity", debit: 0, credit: diff });
    totalCredit += diff;
  } else if (diff < 0) {
    items.push({ accountName: "Proprietor's Capital Drawings", accountType: "Equity", debit: Math.abs(diff), credit: 0 });
    totalDebit += Math.abs(diff);
  }

  return {
    items,
    totalDebit,
    totalCredit,
    isBalanced: Math.round(totalDebit) === Math.round(totalCredit),
  };
}
