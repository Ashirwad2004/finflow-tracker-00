import { apiClient } from "./apiClient";
import type {
  ProfitAndLossResponse,
  TrialBalanceResponse,
  BalanceSheetResponse,
  ReceivablesAgingResponse,
  CashFlowStatementResponse,
  GSTR1ReportResponse,
  GSTR2BReportResponse,
  GSTR3BSummaryResponse,
  GSTR9AnnualReportResponse,
  ProfitAndLossRequest,
  TrialBalanceRequest,
  BalanceSheetRequest,
  ReceivablesAgingRequest,
  CashFlowStatementRequest,
  GSTR1ReportRequest,
  GSTR2BReportRequest,
  GSTR3BReportRequest,
  GSTR9ReportRequest,
} from "@rupaybill/api-types";

// Backward-compatible type aliases
export type ProfitAndLossReport = ProfitAndLossResponse;
export type TrialBalanceReport = TrialBalanceResponse;
export type BalanceSheetReport = BalanceSheetResponse;
export type ReceivablesAgingReport = ReceivablesAgingResponse & {
  ref_date?: string;
  total_receivable?: number;
  customer_breakdown?: Array<{
    customer_id?: string;
    customer_name: string;
    phone?: string;
    total_due: number;
    bucket: string;
  }>;
};

export interface TrialBalanceItem {
  account_name: string;
  account_type: string;
  debit_amount: number;
  credit_amount: number;
}

export interface SalesSummaryReport {
  period_start?: string;
  period_end?: string;
  total_invoices: number;
  total_revenue: number;
  total_collected: number;
  total_outstanding: number;
  total_tax_collected: number;
  paid_invoices_count: number;
  partial_invoices_count: number;
  pending_invoices_count: number;
  invoices: any[];
}

export interface PurchasesSummaryReport {
  period_start?: string;
  period_end?: string;
  total_bills: number;
  total_purchases_cost: number;
  total_paid: number;
  total_outstanding_payable: number;
  total_input_tax: number;
  bills: any[];
}

export interface PartyLedgerReport {
  party: any;
  opening_balance: number;
  closing_balance: number;
  total_transactions: number;
  transactions: Array<{
    id: string;
    date: string;
    voucher_type: string;
    voucher_no: string;
    debit: number;
    credit: number;
    balance: number;
    notes?: string;
  }>;
}

export const reportsApi = {
  // Authoritative Server-Side Reports
  getProfitAndLoss: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ProfitAndLossReport> => {
    const res = await apiClient.get<ProfitAndLossReport>("/api/v1/reports/profit-loss", { params });
    return res.data;
  },

  getTrialBalance: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<TrialBalanceReport> => {
    const res = await apiClient.get<TrialBalanceReport>("/api/v1/reports/trial-balance", { params });
    return res.data;
  },

  getBalanceSheet: async (): Promise<BalanceSheetReport> => {
    const res = await apiClient.get<BalanceSheetReport>("/api/v1/reports/balance-sheet");
    return res.data;
  },

  getReceivablesAging: async (ref_date?: string): Promise<ReceivablesAgingReport> => {
    const res = await apiClient.get<ReceivablesAgingReport>("/api/v1/reports/receivables-aging", {
      params: { ref_date },
    });
    return res.data;
  },

  getSalesReport: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<SalesSummaryReport> => {
    const res = await apiClient.get<SalesSummaryReport>("/api/v1/reports/sales", { params });
    return res.data;
  },

  getPurchasesReport: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<PurchasesSummaryReport> => {
    const res = await apiClient.get<PurchasesSummaryReport>("/api/v1/reports/purchases", { params });
    return res.data;
  },

  getPartyLedger: async (
    partyId: string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<PartyLedgerReport> => {
    const res = await apiClient.get<PartyLedgerReport>(`/api/v1/reports/ledger/${partyId}`, {
      params,
    });
    return res.data;
  },

  // Client-Supplied Report Calculation Engines
  calculateProfitAndLoss: async (payload: ProfitAndLossRequest): Promise<ProfitAndLossResponse> => {
    const res = await apiClient.post<ProfitAndLossResponse>("/api/v1/reports/profit-loss", payload);
    return res.data;
  },

  calculateTrialBalance: async (payload: TrialBalanceRequest): Promise<TrialBalanceResponse> => {
    const res = await apiClient.post<TrialBalanceResponse>("/api/v1/reports/trial-balance", payload);
    return res.data;
  },

  calculateBalanceSheet: async (payload: BalanceSheetRequest): Promise<BalanceSheetResponse> => {
    const res = await apiClient.post<BalanceSheetResponse>("/api/v1/reports/balance-sheet", payload);
    return res.data;
  },

  calculateReceivablesAging: async (payload: ReceivablesAgingRequest): Promise<ReceivablesAgingResponse> => {
    const res = await apiClient.post<ReceivablesAgingResponse>("/api/v1/reports/receivables-aging", payload);
    return res.data;
  },

  calculateCashFlow: async (payload: CashFlowStatementRequest): Promise<CashFlowStatementResponse> => {
    const res = await apiClient.post<CashFlowStatementResponse>("/api/v1/reports/cash-flow", payload);
    return res.data;
  },

  generateGSTR1: async (payload: GSTR1ReportRequest): Promise<GSTR1ReportResponse> => {
    const res = await apiClient.post<GSTR1ReportResponse>("/api/v1/reports/gstr1", payload);
    return res.data;
  },

  generateGSTR2B: async (payload: GSTR2BReportRequest): Promise<GSTR2BReportResponse> => {
    const res = await apiClient.post<GSTR2BReportResponse>("/api/v1/reports/gstr2b", payload);
    return res.data;
  },

  generateGSTR3B: async (payload: GSTR3BReportRequest): Promise<GSTR3BSummaryResponse> => {
    const res = await apiClient.post<GSTR3BSummaryResponse>("/api/v1/reports/gstr3b", payload);
    return res.data;
  },

  generateGSTR9: async (payload: GSTR9ReportRequest): Promise<GSTR9AnnualReportResponse> => {
    const res = await apiClient.post<GSTR9AnnualReportResponse>("/api/v1/reports/gstr9", payload);
    return res.data;
  },
};
