export type FilterMode = "daily" | "monthly" | "yearly";
export type ChartMode = "area" | "bar";

export interface Sale {
  date: string;
  total_amount?: number | string;
}

export interface Expense {
  date: string;
  amount?: number | string;
}

export interface Purchase {
  date?: string;
  total_amount?: number | string;
  [key: string]: any;
}

export interface RevenueAnalyticsProps {
  sales: Sale[];
  expenses: Expense[];
  purchases?: any[];
}

export type Props = RevenueAnalyticsProps;

export interface ChartDataPoint {
  name: string;
  revenue: number;
  purchases: number;
  expenses: number;
}
