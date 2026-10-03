export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number | string;
  date: string;
  category_id?: string;
  categoryId?: string;
  categories?: {
    id: string;
    name: string;
  };
}

export interface Sale {
  id: string;
  total_amount: number | string;
  date: string;
}

export interface LocalPredictionReport {
  predictedTotal: number;
  confidence: "Low" | "Medium" | "High";
  monthlyHistory: { month: string; amount: number }[];
  categoryPredictions: {
    categoryId: string;
    categoryName: string;
    predictedAmount: number;
    trendDirection: "up" | "down" | "flat";
    growthRate: number;
  }[];
  anomalies: {
    categoryName: string;
    message: string;
    severity: "warning" | "info" | "critical";
  }[];
  recommendations: string[];
}

export interface LocalBusinessPredictionReport {
  predictedRevenue: number;
  predictedExpenses: number;
  predictedProfit: number;
  revenueTrend: "up" | "down" | "flat";
  expensesTrend: "up" | "down" | "flat";
  profitTrend: "up" | "down" | "flat";
  revenueGrowthRate: number;
  expensesGrowthRate: number;
  profitGrowthRate: number;
  insights: string[];
}
