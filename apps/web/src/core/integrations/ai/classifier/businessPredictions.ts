import { Expense, LocalBusinessPredictionReport, Sale } from "./types";

export function generateLocalBusinessPredictions(
  sales: Sale[],
  expenses: Expense[]
): LocalBusinessPredictionReport {
  if (!Array.isArray(sales)) sales = [];
  if (!Array.isArray(expenses)) expenses = [];

  // Group sales by month (YYYY-MM)
  const salesByMonth: Record<string, number> = {};
  sales.forEach((s) => {
    if (!s || !s.date) return;
    const amount = Number(s.total_amount);
    if (isNaN(amount) || amount < 0) return;
    const month = typeof s.date === "string" && s.date.length >= 7 ? s.date.substring(0, 7) : "";
    if (month) {
      salesByMonth[month] = (salesByMonth[month] || 0) + amount;
    }
  });

  // Group expenses by month (YYYY-MM)
  const expensesByMonth: Record<string, number> = {};
  expenses.forEach((e) => {
    if (!e || !e.date) return;
    const amount = Number(e.amount);
    if (isNaN(amount) || amount < 0) return;
    const month = typeof e.date === "string" && e.date.length >= 7 ? e.date.substring(0, 7) : "";
    if (month) {
      expensesByMonth[month] = (expensesByMonth[month] || 0) + amount;
    }
  });

  // Collect all unique months
  const allMonths = Array.from(
    new Set([...Object.keys(salesByMonth), ...Object.keys(expensesByMonth)])
  ).sort();

  const N = allMonths.length;

  // Perform linear regressions helper
  const runRegression = (monthlyData: Record<string, number>) => {
    let slope = 0;
    let intercept = 0;
    let predicted = 0;

    if (N >= 2) {
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;

      for (let i = 0; i < N; i++) {
        sumX += i;
        const val = monthlyData[allMonths[i]] || 0;
        sumY += val;
        sumXY += i * val;
        sumXX += i * i;
      }

      const meanX = sumX / N;
      const meanY = sumY / N;

      const num = sumXY - N * meanX * meanY;
      const den = sumXX - N * meanX * meanX;

      slope = Math.abs(den) > 1e-9 ? num / den : 0;
      intercept = meanY - slope * meanX;
      predicted = slope * N + intercept;
      if (isNaN(predicted) || predicted < 0) predicted = 0;
    } else if (N === 1) {
      predicted = monthlyData[allMonths[0]] || 0;
    }

    const total = allMonths.reduce((sum, m) => sum + (monthlyData[m] || 0), 0);
    const average = total / (N || 1);
    const growthRate = average > 0 && !isNaN(slope) ? (slope / average) * 100 : 0;
    const growthRateSafe = isFinite(growthRate) ? growthRate : 0;
    const trend: "up" | "down" | "flat" =
      slope > 0.05 * average ? "up" : slope < -0.05 * average ? "down" : "flat";

    return { predicted, slope, growthRate: growthRateSafe, trend };
  };

  const revReg = runRegression(salesByMonth);
  const expReg = runRegression(expensesByMonth);

  // Group profits by month
  const profitsByMonth: Record<string, number> = {};
  allMonths.forEach((m) => {
    profitsByMonth[m] = (salesByMonth[m] || 0) - (expensesByMonth[m] || 0);
  });
  const profReg = runRegression(profitsByMonth);

  // Insights builder
  const insights: string[] = [];

  if (N >= 2) {
    if (revReg.trend === "up") {
      insights.push(
        `Your sales revenue is projected to grow by ${revReg.growthRate.toFixed(
          1
        )}% MoM. Keep driving customer outreach!`
      );
    } else if (revReg.trend === "down") {
      insights.push(
        `Sales revenue is trending downwards by ${Math.abs(
          revReg.growthRate
        ).toFixed(1)}% MoM. Consider offering storefront discounts or product bundles.`
      );
    }

    if (expReg.slope > revReg.slope && expReg.slope > 0) {
      insights.push(
        `Caution: Business operating expenses (slope: ₹${expReg.slope.toFixed(
          0
        )}) are growing faster than sales revenue (slope: ₹${revReg.slope.toFixed(
          0
        )}). Profit margins may shrink.`
      );
    }

    if (profReg.predicted < 0) {
      insights.push(
        `Warning: AI models predict a net operating loss of ₹${Math.abs(
          profReg.predicted
        ).toFixed(0)} next month. Review and cap high spending categories.`
      );
    } else if (profReg.trend === "up") {
      insights.push(
        `Excellent: Overall monthly net profit is trending upwards by ₹${profReg.slope.toFixed(0)}.`
      );
    }
  }

  if (insights.length === 0) {
    insights.push(
      "Continue recording sales and purchases to populate local AI business forecasts and suggestions."
    );
  }

  return {
    predictedRevenue: Number(revReg.predicted.toFixed(2)),
    predictedExpenses: Number(expReg.predicted.toFixed(2)),
    predictedProfit: Number(profReg.predicted.toFixed(2)),
    revenueTrend: revReg.trend,
    expensesTrend: expReg.trend,
    profitTrend: profReg.trend,
    revenueGrowthRate: Number(revReg.growthRate.toFixed(1)),
    expensesGrowthRate: Number(expReg.growthRate.toFixed(1)),
    profitGrowthRate: Number(profReg.growthRate.toFixed(1)),
    insights,
  };
}
