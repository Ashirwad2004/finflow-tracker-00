import { FinFlowReportId, ReportMenuItem } from "../reportMenu";

export interface ReportBusinessInfo {
  name: string;
  gstin: string;
  period: string;
}

export interface ReportExportParams {
  activeReportId: FinFlowReportId;
  activeReportMeta: ReportMenuItem;
  filteredSales: any[];
  filteredPurchases: any[];
  filteredExpenses: any[];
  daybook: any;
  billWiseProfit: any[];
  receivablesAging: any;
  stockSummary: any;
  trialBalance: any;
  allTransactions: any[];
  cashFlow: any;
  profitAndLoss: any;
  balanceSheet: any;
  gstSlabReport: any[];
  itemWiseProfit: any[];
  financialHealth: any;
  businessInfo: ReportBusinessInfo;
}
