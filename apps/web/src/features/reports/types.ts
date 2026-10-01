export type { FinFlowReportId, ReportMenuItem } from "./components/FinFlowReportsStudio";
export type { DatePeriodPreset, DateRange } from "./hooks/useAccountingData";
export type {
  ProfitAndLossReport,
  TrialBalanceItem,
  TrialBalanceReport,
  BalanceSheetReport,
  ReceivablesAgingReport,
} from "@/core/api/reports";

export interface ReportFilterOptions {
  period?: import("./hooks/useAccountingData").DatePeriodPreset;
  fromDate?: string;
  toDate?: string;
  partyId?: string;
  searchQuery?: string;
}

export interface CashFlowSummary {
  netOperatingCash: number;
  netInvestingCash: number;
  netFinancingCash: number;
  netChangeInCash: number;
  openingCash: number;
  closingCash: number;
}
