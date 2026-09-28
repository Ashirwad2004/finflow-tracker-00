import { apiClient } from "./apiClient";

export interface ProfitAndLossReport {
  revenue_from_operations: number;
  sales_returns: number;
  net_revenue: number;
  opening_stock_value: number;
  purchases_cost: number;
  direct_expenses: number;
  closing_stock_value: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_profit_margin_pct: number;
  indirect_expenses: Record<string, number>;
  total_indirect_expenses: number;
  net_profit_before_tax: number;
  net_profit_margin_pct: number;
}

export interface TrialBalanceItem {
  account_name: string;
  account_type: string;
  debit_amount: number;
  credit_amount: number;
}

export interface TrialBalanceReport {
  items: TrialBalanceItem[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  difference: number;
}

export interface BalanceSheetReport {
  current_assets: Record<string, number>;
  total_current_assets: number;
  non_current_assets: Record<string, number>;
  total_non_current_assets: number;
  total_assets: number;
  current_liabilities: Record<string, number>;
  total_current_liabilities: number;
  non_current_liabilities: Record<string, number>;
  total_non_current_liabilities: number;
  total_liabilities: number;
  proprietor_capital: number;
  current_period_profit: number;
  total_equity: number;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
}

export interface ReceivablesAgingReport {
  ref_date: string;
  total_receivable: number;
  buckets: Record<string, number>;
  customer_breakdown: Array<{
    customer_id?: string;
    customer_name: string;
    phone?: string;
    total_due: number;
    bucket: string;
  }>;
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
};
