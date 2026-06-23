import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  generateLocalPredictions,
  LocalExpenseClassifier,
  Expense,
  Category
} from "@/core/integrations/ai/localClassifier";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  Cpu,
  BrainCircuit,
  Percent,
  TrendingDown as TrendDownIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface LocalAIPredictionsPanelProps {
  expenses: Expense[];
  categories: Category[];
}

export function LocalAIPredictionsPanel({ expenses, categories }: LocalAIPredictionsPanelProps) {
  // 1. Run local AI training & forecasting model
  const predictionReport = useMemo(() => {
    return generateLocalPredictions(expenses, categories);
  }, [expenses, categories]);

  // 2. Fetch classifier learned rules
  const learnedConcepts = useMemo(() => {
    const classifier = new LocalExpenseClassifier(expenses);
    return classifier.getLearnedConcepts(categories);
  }, [expenses, categories]);

  // 3. Prepare chart data by combining history and next-month projection
  const chartData = useMemo(() => {
    if (predictionReport.monthlyHistory.length === 0) return [];

    const data: { name: string; Amount: number; type: "Historical" | "Forecast" }[] = predictionReport.monthlyHistory.map(h => ({
      name: h.month,
      Amount: h.amount,
      type: "Historical"
    }));

    // Add forecast point if we have history
    if (predictionReport.predictedTotal > 0) {
      // Get next month string
      const lastMonth = data[data.length - 1].name;
      const lastYearNum = parseInt(lastMonth.substring(0, 4));
      const lastMonthNum = parseInt(lastMonth.substring(5, 7));

      let nextMonthNum = lastMonthNum + 1;
      let nextYearNum = lastYearNum;
      if (nextMonthNum > 12) {
        nextMonthNum = 1;
        nextYearNum += 1;
      }
      const nextMonthStr = `${nextYearNum}-${String(nextMonthNum).padStart(2, "0")}`;

      data.push({
        name: `${nextMonthStr} (AI)`,
        Amount: predictionReport.predictedTotal,
        type: "Forecast" as const
      });
    }

    return data;
  }, [predictionReport]);

  const currentMonthStr = useMemo(() => {
    return new Date().toISOString().substring(0, 7);
  }, []);

  const currentMonthSpent = useMemo(() => {
    const currentHist = predictionReport.monthlyHistory.find(h => h.month === currentMonthStr);
    return currentHist ? currentHist.amount : 0;
  }, [predictionReport, currentMonthStr]);

  if (expenses.length < 5) {
    return (
      <Card className="border-dashed border-violet-300 bg-violet-50/20 dark:bg-violet-950/5">
        <CardContent className="flex flex-col items-center justify-center text-center p-8 sm:p-12 space-y-4">
          <div className="p-4 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400 animate-pulse">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-xl text-foreground">Local AI Model is Training</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            To generate reliable predictions, the local AI requires at least **5 transactions** across your history. Please record a few more expenses to unlock budget forecasts and automated category learning.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Dashboard Header */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Forecast Card */}
        <Card className="relative overflow-hidden border-violet-200 shadow-sm bg-gradient-to-br from-violet-500/10 to-indigo-500/5 dark:from-violet-950/20 dark:to-indigo-950/10">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Cpu className="w-24 h-24 text-violet-500" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5" /> Next Month Forecast
              </span>
              <Badge variant="outline" className="text-[10px] bg-background border-violet-200 text-violet-700 dark:text-violet-300">
                Confidence: {predictionReport.confidence}
              </Badge>
            </div>
            <CardTitle className="text-3xl font-extrabold pt-2">
              ₹{predictionReport.predictedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This prediction is computed locally using a Least-Squares Linear Regression model based on your historical cash flow.
            </p>
          </CardContent>
        </Card>

        {/* Current Month Standing */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Current Month Total
            </span>
            <CardTitle className="text-3xl font-extrabold pt-2">
              ₹{currentMonthSpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {predictionReport.predictedTotal > 0 && (
                <div className="w-full space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Progress vs Forecast Budget</span>
                    <span>{Math.min(100, Math.round((currentMonthSpent / predictionReport.predictedTotal) * 100))}%</span>
                  </div>
                  <Progress value={Math.min(100, (currentMonthSpent / predictionReport.predictedTotal) * 100)} className="h-1.5 bg-muted" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Model Architecture Status */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              AI Engine Diagnostics
            </span>
            <CardTitle className="text-lg font-bold pt-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-500" /> Model: 100% Offline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Local Dataset Size:</span>
              <span className="font-semibold">{expenses.length} records</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Learned Concepts:</span>
              <span className="font-semibold">{learnedConcepts.length} associations</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Future Trend Chart */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" /> AI Cash Flow Projection Chart
          </CardTitle>
          <CardDescription>
            Historical spending trends plotted alongside the AI prediction line.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2.5 shadow-sm text-xs space-y-1">
                          <p className="font-bold text-muted-foreground">{data.name}</p>
                          <p className="font-semibold text-violet-600 dark:text-violet-400">
                            Amount: ₹{data.Amount.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-muted-foreground italic">
                            {data.type} Data Point
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Amount"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Category Budgets and Anomalies/Learning */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Budget Forecast */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Percent className="w-4 h-4 text-violet-500" /> Category-wise Budget Forecast
            </CardTitle>
            <CardDescription>
              Predicted category allocations calculated from monthly momentum.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {predictionReport.categoryPredictions.map(pred => {
              const maxAmount = Math.max(...predictionReport.categoryPredictions.map(p => p.predictedAmount), 1);
              const percentageOfMax = (pred.predictedAmount / maxAmount) * 100;

              return (
                <div key={pred.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pred.categoryName}</span>
                      {pred.trendDirection === "up" && (
                        <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 gap-0.5 border-0 font-medium text-[10px] py-0 h-4 shrink-0">
                          <TrendingUp className="w-2.5 h-2.5" /> +{pred.growthRate}%
                        </Badge>
                      )}
                      {pred.trendDirection === "down" && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 gap-0.5 border-0 font-medium text-[10px] py-0 h-4 shrink-0">
                          <TrendingDown className="w-2.5 h-2.5" /> {pred.growthRate}%
                        </Badge>
                      )}
                      {pred.trendDirection === "flat" && (
                        <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 gap-0.5 border-0 font-medium text-[10px] py-0 h-4 shrink-0">
                          <Minus className="w-2.5 h-2.5" /> stable
                        </Badge>
                      )}
                    </div>
                    <span className="font-bold text-foreground">₹{pred.predictedAmount.toFixed(0)}</span>
                  </div>
                  <Progress value={percentageOfMax} className="h-1.5 bg-muted" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* AI Recommendations and Machine Learning concepts */}
        <div className="space-y-6">
          {/* Anomalies & Alerts */}
          {predictionReport.anomalies.length > 0 && (
            <Card className="border-rose-200 bg-rose-50/10 dark:bg-rose-950/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> AI Overspend Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {predictionReport.anomalies.map((anomaly, idx) => (
                  <Alert key={idx} variant="destructive" className="bg-background border-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <AlertTitle className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                      High spending velocity in {anomaly.categoryName}
                    </AlertTitle>
                    <AlertDescription className="text-xs mt-1 text-muted-foreground">
                      {anomaly.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Recommendations */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" /> AI Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {predictionReport.recommendations.map((rec, idx) => (
                <div key={idx} className="flex gap-2.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="p-1 rounded-md bg-amber-500/10 text-amber-600 h-6 w-6 flex items-center justify-center shrink-0">
                    💡
                  </span>
                  <span>{rec}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Local Learned Concepts */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-violet-500" /> Trained Vocabulary Associations
              </CardTitle>
              <CardDescription className="text-xs">
                Keywords the local AI has trained on based on your daily data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {learnedConcepts.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Local AI is observing your expense descriptions to learn associations...
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {learnedConcepts.map((concept, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-[10px] py-1 px-2.5 font-medium border border-border bg-muted/40 hover:bg-muted/65 cursor-default transition-all flex gap-1 items-center"
                    >
                      <span className="font-semibold text-foreground">"{concept.word}"</span>
                      <span className="opacity-50">→</span>
                      <span className="text-violet-600 dark:text-violet-400 font-semibold">{concept.categoryName}</span>
                      <span className="text-[9px] opacity-40 ml-0.5">({concept.confidence}%)</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
