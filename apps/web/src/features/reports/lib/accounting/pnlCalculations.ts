export interface ProfitAndLossResult {
  grossSalesRevenue: number;
  salesReturns: number;
  netRevenue: number;
  purchasesCost: number;
  directExpensesTotal: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMarginPct: number;
  indirectCategories: Record<string, number>;
  indirectExpensesTotal: number;
  netProfitBeforeTax: number;
  netProfitMarginPct: number;
}

export function computeProfitAndLoss(
  filteredSales: any[],
  filteredPurchases: any[],
  filteredExpenses: any[],
  serverPnl: any
): ProfitAndLossResult {
  if (serverPnl) {
    return {
      grossSalesRevenue: serverPnl.revenue_from_operations,
      salesReturns: serverPnl.sales_returns,
      netRevenue: serverPnl.net_revenue,
      purchasesCost: serverPnl.purchases_cost,
      directExpensesTotal: serverPnl.direct_expenses,
      costOfGoodsSold: serverPnl.cost_of_goods_sold,
      grossProfit: serverPnl.gross_profit,
      grossProfitMarginPct: serverPnl.gross_profit_margin_pct,
      indirectCategories: serverPnl.indirect_expenses || {},
      indirectExpensesTotal: serverPnl.total_indirect_expenses,
      netProfitBeforeTax: serverPnl.net_profit_before_tax,
      netProfitMarginPct: serverPnl.net_profit_margin_pct,
    };
  }

  let grossSalesRevenue = 0;
  let salesReturns = 0;
  let directExpensesTotal = 0;
  let purchasesCost = 0;

  filteredSales.forEach((s: any) => {
    const tot = Number(s.total_amount || 0);
    if (s.status === "cancelled" || s.document_type === "credit_note") {
      salesReturns += tot;
    } else {
      grossSalesRevenue += tot;
    }
  });

  const netRevenue = grossSalesRevenue - salesReturns;

  filteredPurchases.forEach((p: any) => {
    purchasesCost += Number(p.total_amount || 0);
  });

  // Indirect vs Direct Expense Classification
  const directCategories = ["freight", "packaging", "raw materials", "labor", "carriage inward", "production"];
  const indirectCategories: Record<string, number> = {};
  let indirectExpensesTotal = 0;

  filteredExpenses.forEach((e: any) => {
    const amt = Number(e.amount || 0);
    const catName = (e.categories?.name || e.category || "General / Miscellaneous").toLowerCase().trim();

    const isDirect = directCategories.some((dc) => catName.includes(dc));
    if (isDirect) {
      directExpensesTotal += amt;
    } else {
      const displayCat = e.categories?.name || e.category || "General / Miscellaneous";
      indirectCategories[displayCat] = (indirectCategories[displayCat] || 0) + amt;
      indirectExpensesTotal += amt;
    }
  });

  // Cost of Goods Sold = Total Purchases + Direct Expenses
  const costOfGoodsSold = purchasesCost + directExpensesTotal;
  const grossProfit = netRevenue - costOfGoodsSold;
  const grossProfitMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  const netProfitBeforeTax = grossProfit - indirectExpensesTotal;
  const netProfitMarginPct = netRevenue > 0 ? (netProfitBeforeTax / netRevenue) * 100 : 0;

  return {
    grossSalesRevenue,
    salesReturns,
    netRevenue,
    purchasesCost,
    directExpensesTotal,
    costOfGoodsSold,
    grossProfit,
    grossProfitMarginPct,
    indirectCategories,
    indirectExpensesTotal,
    netProfitBeforeTax,
    netProfitMarginPct,
  };
}
