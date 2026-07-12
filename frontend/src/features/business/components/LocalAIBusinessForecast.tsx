import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateLocalBusinessPredictions, Sale, Expense } from "@/core/integrations/ai/localClassifier";
import { Sparkles, TrendingUp, TrendingDown, Minus, BrainCircuit, AlertTriangle, Lightbulb } from "lucide-react";

interface LocalAIBusinessForecastProps {
  sales: Sale[];
  expenses: Expense[];
}

export function LocalAIBusinessForecast({ sales, expenses }: LocalAIBusinessForecastProps) {
  // 1. Run local AI regression models on business data
  const forecast = useMemo(() => {
    return generateLocalBusinessPredictions(sales, expenses);
  }, [sales, expenses]);

  const totalDataPoints = sales.length + expenses.length;

  if (totalDataPoints < 5) {
    return null; // Don't show the dashboard forecast if data is minimal
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <Card className="border-violet-200 bg-violet-50/20 dark:bg-violet-950/5 overflow-hidden shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            AI Business Co-pilot
          </CardTitle>
          <Badge variant="outline" className="bg-background text-[10px] text-violet-700 dark:text-violet-300 border-violet-200">
            Local Predictor Model Active
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Linear regression monthly trend forecast trained on your local transactions database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Projections Metric Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Revenue */}
          <div className="p-4 rounded-xl bg-background border border-border space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Projected Sales</p>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold">{formatCurrency(forecast.predictedRevenue)}</span>
              {forecast.revenueTrend === "up" && (
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 gap-0.5 border-0 font-medium text-[10px] h-5">
                  <TrendingUp className="w-3 h-3" /> +{forecast.revenueGrowthRate}%
                </Badge>
              )}
              {forecast.revenueTrend === "down" && (
                <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 gap-0.5 border-0 font-medium text-[10px] h-5">
                  <TrendingDown className="w-3 h-3" /> {forecast.revenueGrowthRate}%
                </Badge>
              )}
              {forecast.revenueTrend === "flat" && (
                <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 gap-0.5 border-0 font-medium text-[10px] h-5">
                  <Minus className="w-3 h-3" /> stable
                </Badge>
              )}
            </div>
          </div>

          {/* Expenses */}
          <div className="p-4 rounded-xl bg-background border border-border space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Projected Expenses</p>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold">{formatCurrency(forecast.predictedExpenses)}</span>
              {forecast.expensesTrend === "up" && (
                <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 gap-0.5 border-0 font-medium text-[10px] h-5">
                  <TrendingUp className="w-3 h-3" /> +{forecast.expensesGrowthRate}%
                </Badge>
              )}
              {forecast.expensesTrend === "down" && (
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 gap-0.5 border-0 font-medium text-[10px] h-5">
                  <TrendingDown className="w-3 h-3" /> {forecast.expensesGrowthRate}%
                </Badge>
              )}
              {forecast.expensesTrend === "flat" && (
                <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 gap-0.5 border-0 font-medium text-[10px] h-5">
                  <Minus className="w-3 h-3" /> stable
                </Badge>
              )}
            </div>
          </div>

          {/* Net Profit */}
          <div className="p-4 rounded-xl bg-background border border-border space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Projected Net Profit</p>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold">{formatCurrency(forecast.predictedProfit)}</span>
              {forecast.profitTrend === "up" && (
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 gap-0.5 border-0 font-medium text-[10px] h-5">
                  <TrendingUp className="w-3 h-3" /> +{forecast.profitGrowthRate}%
                </Badge>
              )}
              {forecast.profitTrend === "down" && (
                <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 gap-0.5 border-0 font-medium text-[10px] h-5">
                  <TrendingDown className="w-3 h-3" /> {forecast.profitGrowthRate}%
                </Badge>
              )}
              {forecast.profitTrend === "flat" && (
                <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 gap-0.5 border-0 font-medium text-[10px] h-5">
                  <Minus className="w-3 h-3" /> stable
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Co-pilot Insights</h4>
          <div className="space-y-2">
            {forecast.insights.map((insight, idx) => {
              const isWarning = insight.startsWith("Caution") || insight.startsWith("Warning");
              return (
                <div key={idx} className="flex gap-2.5 text-xs text-muted-foreground leading-relaxed p-2.5 rounded-lg bg-background/50 border border-border/50">
                  {isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  ) : (
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <span>{insight}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}