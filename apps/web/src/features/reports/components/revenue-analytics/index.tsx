import React, { useState } from "react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { RevenueAnalyticsProps, FilterMode, ChartMode } from "./types";
import { useRevenueAnalyticsData } from "./useRevenueAnalyticsData";
import { RevenueHeaderControls } from "./RevenueHeaderControls";
import { RevenueKpiGrid } from "./RevenueKpiGrid";
import { RevenueChartCard } from "./RevenueChartCard";
import { TopPeriodsBreakdownCard } from "./TopPeriodsBreakdownCard";

export const RevenueAnalytics: React.FC<RevenueAnalyticsProps> = ({
  sales,
  expenses,
  purchases,
}) => {
  const { formatCurrency } = useCurrency();
  const [filter, setFilter] = useState<FilterMode>("monthly");
  const [chartType, setChartType] = useState<ChartMode>("area");

  const filterLabel = {
    daily: "Last 30 Days",
    monthly: "Last 12 Months",
    yearly: "Last 5 Years",
  }[filter];

  const {
    chartData,
    currentRevenue,
    currentExpenses,
    netProfit,
    avgRevenue,
    revTrend,
    expTrend,
    profitTrend,
    topPeriods,
    maxRev,
  } = useRevenueAnalyticsData(sales, expenses, purchases, filter);

  return (
    <div className="space-y-6">
      <RevenueHeaderControls
        filter={filter}
        onFilterChange={setFilter}
        chartType={chartType}
        onChartTypeChange={setChartType}
        filterLabel={filterLabel}
      />

      <RevenueKpiGrid
        currentRevenue={currentRevenue}
        currentExpenses={currentExpenses}
        netProfit={netProfit}
        avgRevenue={avgRevenue}
        revTrend={revTrend}
        expTrend={expTrend}
        profitTrend={profitTrend}
        formatCurrency={formatCurrency}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <RevenueChartCard
          chartData={chartData}
          chartType={chartType}
          filter={filter}
          filterLabel={filterLabel}
          formatCurrency={formatCurrency}
        />

        <TopPeriodsBreakdownCard
          topPeriods={topPeriods}
          maxRev={maxRev}
          currentRevenue={currentRevenue}
          netProfit={netProfit}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
};

export default RevenueAnalytics;
export * from "./types";
export * from "./useRevenueAnalyticsData";
