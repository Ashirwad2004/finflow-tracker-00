export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  receivables: number;
  payables: number;
  salesCount: number;
  purchasesCount: number;
  lowStockItemsCount: number;
}

export interface RevenueTrendItem {
  date: string;
  revenue: number;
  expense: number;
}

export interface RecentActivityItem {
  id: string;
  type: "sale" | "purchase" | "payment" | "expense";
  description: string;
  amount: number;
  date: string;
  partyName?: string;
}

export interface DashboardFilterPeriod {
  period: "today" | "week" | "month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
}
