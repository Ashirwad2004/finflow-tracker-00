import { Category, Expense, LocalPredictionReport } from "./types";

/**
 * ----------------------------------------------------
 * LOCAL TIME SERIES FORECASTER & TREND ANALYZER
 * ----------------------------------------------------
 * Groups transactions by month, computes linear least-squares regression,
 * and forecasts future monthly spending and category trends.
 */
export function generateLocalPredictions(
  expenses: Expense[],
  categories: Category[]
): LocalPredictionReport {
  if (!Array.isArray(expenses)) expenses = [];
  if (!Array.isArray(categories)) categories = [];

  // 1. Group expenses by month (YYYY-MM)
  const monthlyAmounts: Record<string, number> = {};
  const catMonthlyAmounts: Record<string, Record<string, number>> = {}; // catId -> month -> amount

  expenses.forEach((e) => {
    if (!e || !e.date) return;

    // Support string/number amount types safely
    const amount = Number(e.amount);
    if (isNaN(amount) || amount < 0) return;

    const month = typeof e.date === "string" && e.date.length >= 7 ? e.date.substring(0, 7) : "";
    if (!month) return;

    const catId = e.category_id || e.categoryId || (e.categories && e.categories.id);

    monthlyAmounts[month] = (monthlyAmounts[month] || 0) + amount;

    if (catId) {
      if (!catMonthlyAmounts[catId]) {
        catMonthlyAmounts[catId] = {};
      }
      catMonthlyAmounts[catId][month] = (catMonthlyAmounts[catId][month] || 0) + amount;
    }
  });

  // Get sorted list of months
  const sortedMonths = Object.keys(monthlyAmounts).sort();
  const N = sortedMonths.length;

  const monthlyHistory = sortedMonths.map((m) => ({
    month: m,
    amount: monthlyAmounts[m],
  }));

  // 2. Perform Linear Regression for overall spending trend
  let predictedTotal = 0;
  let slope = 0;

  if (N >= 2) {
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < N; i++) {
      sumX += i;
      const val = monthlyAmounts[sortedMonths[i]] || 0;
      sumY += val;
      sumXY += i * val;
      sumXX += i * i;
    }

    const meanX = sumX / N;
    const meanY = sumY / N;

    const num = sumXY - N * meanX * meanY;
    const den = sumXX - N * meanX * meanX;

    slope = Math.abs(den) > 1e-9 ? num / den : 0;
    const intercept = meanY - slope * meanX;

    // Forecast next month (index N)
    predictedTotal = slope * N + intercept;
    if (isNaN(predictedTotal) || predictedTotal < 0) {
      predictedTotal = meanY; // Fallback to average if linear projection goes negative or NaN
    }
  } else if (N === 1) {
    predictedTotal = monthlyAmounts[sortedMonths[0]] || 0;
  } else {
    predictedTotal = 0;
  }

  const confidence = N >= 6 ? "High" : N >= 3 ? "Medium" : "Low";

  // 3. Category Predictions
  const categoryPredictions: LocalPredictionReport["categoryPredictions"] = [];
  const anomalies: LocalPredictionReport["anomalies"] = [];
  const recommendations: string[] = [];

  const currentMonthStr = new Date().toISOString().substring(0, 7);

  categories.forEach((cat) => {
    if (!cat || !cat.id) return;

    const catHistory = catMonthlyAmounts[cat.id] || {};
    const catAmounts = sortedMonths.map((m) => catHistory[m] || 0);
    const catTotal = catAmounts.reduce((sum, a) => sum + a, 0);

    if (catTotal === 0) return;

    let catPredicted = 0;
    let catSlope = 0;

    if (N >= 2) {
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;

      for (let i = 0; i < N; i++) {
        sumX += i;
        const amount = catHistory[sortedMonths[i]] || 0;
        sumY += amount;
        sumXY += i * amount;
        sumXX += i * i;
      }

      const meanX = sumX / N;
      const meanY = sumY / N;

      const num = sumXY - N * meanX * meanY;
      const den = sumXX - N * meanX * meanX;

      catSlope = Math.abs(den) > 1e-9 ? num / den : 0;
      const catIntercept = meanY - catSlope * meanX;

      catPredicted = catSlope * N + catIntercept;
      if (isNaN(catPredicted) || catPredicted < 0) catPredicted = meanY;
    } else if (N === 1) {
      catPredicted = catHistory[sortedMonths[0]] || 0;
    }

    const catAverage = catTotal / (N || 1);
    const growthRate = catAverage > 0 && !isNaN(catSlope) ? (catSlope / catAverage) * 100 : 0;
    const growthRateSafe = isFinite(growthRate) ? growthRate : 0;
    const trendDirection =
      catSlope > 0.05 * catAverage ? "up" : catSlope < -0.05 * catAverage ? "down" : "flat";

    categoryPredictions.push({
      categoryId: cat.id,
      categoryName: cat.name,
      predictedAmount: Number(catPredicted.toFixed(2)),
      trendDirection,
      growthRate: Number(growthRateSafe.toFixed(1)),
    });

    // Anomaly Detection: Check if current month spending has already overshot predicted budget
    const currentMonthSpent = catHistory[currentMonthStr] || 0;
    if (currentMonthSpent > catPredicted && catPredicted > 0) {
      const overspend = currentMonthSpent - catPredicted;
      const percent = (overspend / catPredicted) * 100;

      anomalies.push({
        categoryName: cat.name,
        severity: percent > 30 ? "critical" : "warning",
        message: `Current spending on "${cat.name}" is ₹${currentMonthSpent.toFixed(
          0
        )}, which is ${percent.toFixed(0)}% higher than the predicted budget of ₹${catPredicted.toFixed(0)}.`,
      });
    }
  });

  // 4. Generate recommendations
  if (N >= 2) {
    if (slope > 0) {
      recommendations.push(
        `Your monthly expenses are trending upwards by ₹${slope.toFixed(
          0
        )} month-over-month. We recommend setting a savings goal in your top categories.`
      );
    } else if (slope < 0) {
      recommendations.push(
        `Great job! Your spending is trending downwards by ₹${Math.abs(
          slope
        ).toFixed(0)} per month. Continue maintaining this healthy budget pace.`
      );
    }

    // Category recommendations
    categoryPredictions.forEach((pred) => {
      if (pred.trendDirection === "up" && pred.growthRate > 10) {
        const target = pred.predictedAmount * 0.9;
        recommendations.push(
          `Your "${pred.categoryName}" spending is rising at ${pred.growthRate}% MoM. Try setting a cap of ₹${target.toFixed(
            0
          )} for next month to curb growth.`
        );
      }
    });
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Track your expenses for another month to unlock personalized spending trends and AI recommendations."
    );
  }

  return {
    predictedTotal: Number(predictedTotal.toFixed(2)),
    confidence,
    monthlyHistory,
    categoryPredictions: categoryPredictions.sort((a, b) => b.predictedAmount - a.predictedAmount),
    anomalies,
    recommendations,
  };
}
