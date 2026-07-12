import { format, parseISO, startOfMonth } from "date-fns";

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

/**
 * ----------------------------------------------------
 * LOCAL EXPENSE CATEGORY CLASSIFIER (Naive Bayes)
 * ----------------------------------------------------
 * Learns vocabulary patterns from the user's past transactions
 * and predicts the most likely category for new inputs.
 */
export class LocalExpenseClassifier {
  private wordCounts: Record<string, Record<string, number>> = {}; // word -> categoryId -> count
  private categoryCounts: Record<string, number> = {}; // categoryId -> count
  private totalDocs = 0;
  private vocabulary = new Set<string>();
  private trained = false;

  constructor(expenses: Expense[] = []) {
    if (Array.isArray(expenses) && expenses.length > 0) {
      this.train(expenses);
    }
  }

  private tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/)
      .filter(w => w.length > 2); // Filter out short filler words
  }

  public train(expenses: Expense[]) {
    this.wordCounts = {};
    this.categoryCounts = {};
    this.totalDocs = 0;
    this.vocabulary.clear();

    if (!Array.isArray(expenses)) {
      this.trained = false;
      return;
    }

    expenses.forEach(e => {
      if (!e) return;
      const desc = e.description;
      // Handle both backend naming (category_id) and frontend UI representation (categoryId)
      const catId = e.category_id || e.categoryId || (e.categories && e.categories.id);
      if (!desc || !catId) return;

      this.categoryCounts[catId] = (this.categoryCounts[catId] || 0) + 1;
      this.totalDocs++;

      const tokens = this.tokenize(desc);
      tokens.forEach(token => {
        this.vocabulary.add(token);
        if (!this.wordCounts[token]) {
          this.wordCounts[token] = {};
        }
        this.wordCounts[token][catId] = (this.wordCounts[token][catId] || 0) + 1;
      });
    });

    this.trained = this.totalDocs > 0;
  }

  public predictCategory(description: string, categories: Category[]): string | null {
    if (!this.trained || this.totalDocs === 0 || !description || !description.trim() || !Array.isArray(categories) || categories.length === 0) {
      return null;
    }

    const tokens = this.tokenize(description);
    if (tokens.length === 0) return null;

    let bestCategoryId: string | null = null;
    let maxLogProb = -Infinity;
    const validCategoryIds = new Set(categories.map(c => c.id));

    // Calculate probability for each category
    for (const catId of Object.keys(this.categoryCounts)) {
      if (!validCategoryIds.has(catId)) continue;

      const categoryCount = this.categoryCounts[catId] || 0;
      if (categoryCount === 0) continue;

      // Prior probability: P(C) = count(C) / totalDocs
      let logProb = Math.log(categoryCount / this.totalDocs);

      // P(W|C) with Laplace smoothing
      // Total words associated with category C
      let totalWordsInCat = 0;
      for (const token of Object.keys(this.wordCounts)) {
        totalWordsInCat += (this.wordCounts[token][catId] || 0);
      }

      const vocabSize = this.vocabulary.size;

      tokens.forEach(token => {
        const wordCountInCat = this.wordCounts[token] ? (this.wordCounts[token][catId] || 0) : 0;
        // Laplace smoothing: (count + 1) / (total words in cat + vocab size + 1)
        const denominator = totalWordsInCat + vocabSize + 1;
        const wordProb = denominator > 0 ? (wordCountInCat + 1) / denominator : 1 / (vocabSize + 1);
        logProb += Math.log(wordProb);
      });

      if (logProb > maxLogProb) {
        maxLogProb = logProb;
        bestCategoryId = catId;
      }
    }

    // Verify if we actually matched any known words to avoid arbitrary guesses
    const hasKnownWord = tokens.some(t => this.wordCounts[t] !== undefined);
    if (!hasKnownWord) return null; // Fallback to synonyms if description contains entirely new words

    return bestCategoryId;
  }

  /**
   * Returns a list of learned rules for transparency and UI presentation
   */
  public getLearnedConcepts(categories: Category[]): { word: string; categoryName: string; confidence: number }[] {
    if (!Array.isArray(categories) || categories.length === 0) {
      return [];
    }
    const concepts: { word: string; categoryName: string; confidence: number }[] = [];
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    for (const [word, counts] of Object.entries(this.wordCounts)) {
      let maxCount = 0;
      let totalWordCount = 0;
      let topCatId = "";

      for (const [catId, count] of Object.entries(counts)) {
        totalWordCount += count;
        if (count > maxCount) {
          maxCount = count;
          topCatId = catId;
        }
      }

      const categoryName = catMap.get(topCatId);
      if (categoryName && maxCount > 0 && totalWordCount > 0) {
        const confidence = maxCount / totalWordCount;
        // Only include concepts with 2+ occurrences or high confidence
        if (maxCount >= 2 || confidence > 0.8) {
          concepts.push({
            word,
            categoryName,
            confidence: Math.round(confidence * 100)
          });
        }
      }
    }

    return concepts.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }
}

/**
 * ----------------------------------------------------
 * LOCAL TIME SERIES FORECASTER & TREND ANALYZER
 * ----------------------------------------------------
 * Groups transactions by month, computes linear least-squares regression,
 * and forecasts future monthly spending and category trends.
 */
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

export function generateLocalPredictions(expenses: Expense[], categories: Category[]): LocalPredictionReport {
  if (!Array.isArray(expenses)) expenses = [];
  if (!Array.isArray(categories)) categories = [];

  const catMap = new Map(categories.map(c => [c.id, c.name]));

  // 1. Group expenses by month (YYYY-MM)
  const monthlyAmounts: Record<string, number> = {};
  const catMonthlyAmounts: Record<string, Record<string, number>> = {}; // catId -> month -> amount

  expenses.forEach(e => {
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

  const monthlyHistory = sortedMonths.map(m => ({
    month: m,
    amount: monthlyAmounts[m]
  }));

  // 2. Perform Linear Regression for overall spending trend
  let predictedTotal = 0;
  let slope = 0;
  let intercept = 0;

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

    slope = (Math.abs(den) > 1e-9) ? num / den : 0;
    intercept = meanY - slope * meanX;

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

  categories.forEach(cat => {
    if (!cat || !cat.id) return;

    const catHistory = catMonthlyAmounts[cat.id] || {};
    const catAmounts = sortedMonths.map(m => catHistory[m] || 0);
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

      catSlope = (Math.abs(den) > 1e-9) ? num / den : 0;
      const catIntercept = meanY - catSlope * meanX;

      catPredicted = catSlope * N + catIntercept;
      if (isNaN(catPredicted) || catPredicted < 0) catPredicted = meanY;
    } else if (N === 1) {
      catPredicted = catHistory[sortedMonths[0]] || 0;
    }

    const catAverage = catTotal / (N || 1);
    const growthRate = (catAverage > 0 && !isNaN(catSlope)) ? (catSlope / catAverage) * 100 : 0;
    const growthRateSafe = isFinite(growthRate) ? growthRate : 0;
    const trendDirection = catSlope > 0.05 * catAverage ? "up" : catSlope < -0.05 * catAverage ? "down" : "flat";

    categoryPredictions.push({
      categoryId: cat.id,
      categoryName: cat.name,
      predictedAmount: Number(catPredicted.toFixed(2)),
      trendDirection,
      growthRate: Number(growthRateSafe.toFixed(1))
    });

    // Anomaly Detection: Check if current month spending has already overshot predicted budget
    const currentMonthSpent = catHistory[currentMonthStr] || 0;
    if (currentMonthSpent > catPredicted && catPredicted > 0) {
      const overspend = currentMonthSpent - catPredicted;
      const percent = (overspend / catPredicted) * 100;

      anomalies.push({
        categoryName: cat.name,
        severity: percent > 30 ? "critical" : "warning",
        message: `Current spending on "${cat.name}" is ₹${currentMonthSpent.toFixed(0)}, which is ${percent.toFixed(0)}% higher than the predicted budget of ₹${catPredicted.toFixed(0)}.`
      });
    }
  });

  // 4. Generate recommendations
  if (N >= 2) {
    if (slope > 0) {
      recommendations.push(
        `Your monthly expenses are trending upwards by ₹${slope.toFixed(0)} month-over-month. We recommend setting a savings goal in your top categories.`
      );
    } else if (slope < 0) {
      recommendations.push(
        `Great job! Your spending is trending downwards by ₹${Math.abs(slope).toFixed(0)} per month. Continue maintaining this healthy budget pace.`
      );
    }

    // Category recommendations
    categoryPredictions.forEach(pred => {
      if (pred.trendDirection === "up" && pred.growthRate > 10) {
        const target = pred.predictedAmount * 0.9;
        recommendations.push(
          `Your "${pred.categoryName}" spending is rising at ${pred.growthRate}% MoM. Try setting a cap of ₹${target.toFixed(0)} for next month to curb growth.`
        );
      }
    });
  }

  if (recommendations.length === 0) {
    recommendations.push("Track your expenses for another month to unlock personalized spending trends and AI recommendations.");
  }

  return {
    predictedTotal: Number(predictedTotal.toFixed(2)),
    confidence,
    monthlyHistory,
    categoryPredictions: categoryPredictions.sort((a, b) => b.predictedAmount - a.predictedAmount),
    anomalies,
    recommendations
  };
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

export function generateLocalBusinessPredictions(sales: Sale[], expenses: Expense[]): LocalBusinessPredictionReport {
  if (!Array.isArray(sales)) sales = [];
  if (!Array.isArray(expenses)) expenses = [];

  // Group sales by month (YYYY-MM)
  const salesByMonth: Record<string, number> = {};
  sales.forEach(s => {
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
  expenses.forEach(e => {
    if (!e || !e.date) return;
    const amount = Number(e.amount);
    if (isNaN(amount) || amount < 0) return;
    const month = typeof e.date === "string" && e.date.length >= 7 ? e.date.substring(0, 7) : "";
    if (month) {
      expensesByMonth[month] = (expensesByMonth[month] || 0) + amount;
    }
  });

  // Collect all unique months
  const allMonths = Array.from(new Set([
    ...Object.keys(salesByMonth),
    ...Object.keys(expensesByMonth)
  ])).sort();

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

      slope = (Math.abs(den) > 1e-9) ? num / den : 0;
      intercept = meanY - slope * meanX;
      predicted = slope * N + intercept;
      if (isNaN(predicted) || predicted < 0) predicted = 0;
    } else if (N === 1) {
      predicted = monthlyData[allMonths[0]] || 0;
    }

    const total = allMonths.reduce((sum, m) => sum + (monthlyData[m] || 0), 0);
    const average = total / (N || 1);
    const growthRate = (average > 0 && !isNaN(slope)) ? (slope / average) * 100 : 0;
    const growthRateSafe = isFinite(growthRate) ? growthRate : 0;
    const trend: "up" | "down" | "flat" = slope > 0.05 * average ? "up" : slope < -0.05 * average ? "down" : "flat";

    return { predicted, slope, growthRate: growthRateSafe, trend };
  };

  const revReg = runRegression(salesByMonth);
  const expReg = runRegression(expensesByMonth);

  // Group profits by month
  const profitsByMonth: Record<string, number> = {};
  allMonths.forEach(m => {
    profitsByMonth[m] = (salesByMonth[m] || 0) - (expensesByMonth[m] || 0);
  });
  const profReg = runRegression(profitsByMonth);

  // Insights builder
  const insights: string[] = [];

  if (N >= 2) {
    if (revReg.trend === "up") {
      insights.push(`Your sales revenue is projected to grow by ${revReg.growthRate.toFixed(1)}% MoM. Keep driving customer outreach!`);
    } else if (revReg.trend === "down") {
      insights.push(`Sales revenue is trending downwards by ${Math.abs(revReg.growthRate).toFixed(1)}% MoM. Consider offering storefront discounts or product bundles.`);
    }

    if (expReg.slope > revReg.slope && expReg.slope > 0) {
      insights.push(`Caution: Business operating expenses (slope: ₹${expReg.slope.toFixed(0)}) are growing faster than sales revenue (slope: ₹${revReg.slope.toFixed(0)}). Profit margins may shrink.`);
    }

    if (profReg.predicted < 0) {
      insights.push(`Warning: AI models predict a net operating loss of ₹${Math.abs(profReg.predicted).toFixed(0)} next month. Review and cap high spending categories.`);
    } else if (profReg.trend === "up") {
      insights.push(`Excellent: Overall monthly net profit is trending upwards by ₹${profReg.slope.toFixed(0)}.`);
    }
  }

  if (insights.length === 0) {
    insights.push("Continue recording sales and purchases to populate local AI business forecasts and suggestions.");
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
    insights
  };
}
