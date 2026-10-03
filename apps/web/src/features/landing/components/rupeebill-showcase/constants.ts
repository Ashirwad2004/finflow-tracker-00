export type AnalyticsPeriod = "daily" | "monthly" | "yearly";

export interface PeriodMetricData {
  revenue: string;
  profit: string;
  purchases: string;
  cashflow: string;
  analyticsRev: string;
  expenses: string;
  netProfit: string;
  avgPeriod: string;
  topPeriod1: string;
  topAmount1: string;
  topPeriod2: string;
  topAmount2: string;
}

export const PERIOD_METRICS: Record<AnalyticsPeriod, PeriodMetricData> = {
  daily: {
    revenue: "₹18,450.00",
    profit: "₹4,312.00",
    purchases: "₹9,230.00",
    cashflow: "₹4,312.00",
    analyticsRev: "₹18,450.00",
    expenses: "₹450.00",
    netProfit: "₹4,312.00",
    avgPeriod: "₹18,450.00",
    topPeriod1: "Today, 05:42 PM",
    topAmount1: "₹18,450.00",
    topPeriod2: "Yesterday",
    topAmount2: "₹16,210.00",
  },
  monthly: {
    revenue: "₹473,383,953.67",
    profit: "₹421,804,151.67",
    purchases: "₹52,278,832.60",
    cashflow: "₹421,805,448.93",
    analyticsRev: "₹473,383,953.67",
    expenses: "₹1,297,717.26",
    netProfit: "₹472,086,236.41",
    avgPeriod: "₹59,172,994.21",
    topPeriod1: "Sep 26",
    topAmount1: "₹467,390,968.16",
    topPeriod2: "May 26",
    topAmount2: "₹3,136,284.81",
  },
  yearly: {
    revenue: "₹1,842,910,240.00",
    profit: "₹1,410,250,890.00",
    purchases: "₹382,910,400.00",
    cashflow: "₹1,410,250,890.00",
    analyticsRev: "₹1,842,910,240.00",
    expenses: "₹14,290,110.00",
    netProfit: "₹1,395,960,780.00",
    avgPeriod: "₹153,575,853.00",
    topPeriod1: "FY 2025-26",
    topAmount1: "₹1,842,910,240.00",
    topPeriod2: "FY 2024-25",
    topAmount2: "₹1,204,500,100.00",
  },
};
