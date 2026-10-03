import { printAccountingReport } from "./exportReportUtils";
import { ReportBusinessInfo, ReportExportParams } from "./export-handlers/types";
import {
  exportGstr1,
  exportGstr2b,
  exportGstr3b,
  exportGstr9,
  exportGstSlabs,
} from "./export-handlers/gstExports";
import {
  exportCashFlow,
  exportProfitAndLoss,
  exportBalanceSheet,
  exportBusinessHealth,
  exportTrialBalance,
} from "./export-handlers/financialExports";
import {
  exportSaleRegister,
  exportPurchaseRegister,
  exportDayBook,
  exportBillProfit,
  exportSaleAging,
  exportStockSummary,
  exportExpenseRegister,
  exportAllTransactions,
  exportItemProfit,
  exportExpenseCategory,
} from "./export-handlers/operationalExports";

export type { ReportBusinessInfo, ReportExportParams };

export function handleReportExcelExport(params: ReportExportParams): void {
  const {
    activeReportId,
    activeReportMeta,
    filteredSales,
    filteredPurchases,
    filteredExpenses,
    daybook,
    billWiseProfit,
    receivablesAging,
    stockSummary,
    trialBalance,
    allTransactions,
    cashFlow,
    profitAndLoss,
    balanceSheet,
    gstSlabReport,
    itemWiseProfit,
    financialHealth,
    businessInfo,
  } = params;

  switch (activeReportId) {
    case "sale_register":
      exportSaleRegister(filteredSales, businessInfo);
      break;

    case "purchase_register":
      exportPurchaseRegister(filteredPurchases, businessInfo);
      break;

    case "day_book":
      exportDayBook(daybook, businessInfo);
      break;

    case "bill_profit":
      exportBillProfit(billWiseProfit, businessInfo);
      break;

    case "sale_aging":
      exportSaleAging(receivablesAging, businessInfo);
      break;

    case "stock_summary":
      exportStockSummary(stockSummary, businessInfo);
      break;

    case "trial_balance":
      exportTrialBalance(trialBalance, businessInfo);
      break;

    case "expense_register":
      exportExpenseRegister(filteredExpenses, businessInfo);
      break;

    case "all_transactions":
      exportAllTransactions(allTransactions, businessInfo);
      break;

    case "cash_flow":
      exportCashFlow(cashFlow, businessInfo);
      break;

    case "pnl":
      exportProfitAndLoss(profitAndLoss, businessInfo);
      break;

    case "balance_sheet":
      exportBalanceSheet(balanceSheet, businessInfo);
      break;

    case "gstr1":
      exportGstr1(filteredSales, businessInfo);
      break;

    case "gstr2b":
      exportGstr2b(filteredPurchases, businessInfo);
      break;

    case "gstr3b":
      exportGstr3b(filteredSales, filteredPurchases, businessInfo);
      break;

    case "gstr9":
      exportGstr9(filteredSales, filteredPurchases, businessInfo);
      break;

    case "gst_slabs":
      exportGstSlabs(gstSlabReport, businessInfo);
      break;

    case "item_pnl":
      exportItemProfit(itemWiseProfit, businessInfo);
      break;

    case "expense_category":
      exportExpenseCategory(filteredExpenses, businessInfo);
      break;

    case "business_health":
      exportBusinessHealth(financialHealth, balanceSheet, stockSummary, businessInfo);
      break;

    default:
      printAccountingReport(activeReportMeta.label.toUpperCase());
      break;
  }
}
