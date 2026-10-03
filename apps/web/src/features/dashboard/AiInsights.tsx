import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, TrendingUp, Target, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrency } from "@/core/contexts/CurrencyContext";
import { generateFinanceInsight } from "@/core/integrations/ai/gemini";

interface AiInsightsProps {
    expenses: any[];
    categories: any[];
}

export const AiInsights = ({ expenses, categories }: AiInsightsProps) => {
    const { formatCurrency } = useCurrency();
    const [isAiRequested, setIsAiRequested] = useState(false);
    const queryClient = useQueryClient();

    const { data: geminiInsight, isFetching } = useQuery({
        queryKey: ["gemini-dashboard-insights", expenses.length, expenses[0]?.id, categories.length],
        queryFn: () => {
            const userId = expenses[0]?.user_id;
            const sales = queryClient.getQueryData<any[]>(["sales", userId]) || [];
            const lent = queryClient.getQueryData<any[]>(["lent-money", userId]) || [];
            const borrowed = queryClient.getQueryData<any[]>(["borrowed-money", userId]) || [];
            const products = queryClient.getQueryData<any[]>(["products", userId]) || queryClient.getQueryData<any[]>(["products"]) || [];
            
            const lowStockCount = products.filter(p => Number(p.stock_quantity ?? p.stock ?? 0) <= 5).length;

            return generateFinanceInsight({
                mode: "dashboard",
                expenses,
                categories,
                sales,
                lent,
                borrowed,
                lowStockCount
            });
        },
        enabled: expenses.length > 0 && isAiRequested,
        staleTime: 1000 * 60 * 20,
        retry: 1,
    });

    const generateInsights = () => {
        if (geminiInsight) {
            // Unused when rendering the dedicated CFO view, but kept for full backward-compatibility
            return [
                {
                    title: geminiInsight.headline,
                    desc: `${geminiInsight.summary} Suggested action: ${geminiInsight.suggestedAction}`,
                    icon: Sparkles,
                    color: "text-violet-500",
                    bg: "bg-violet-500/10"
                }
            ];
        }

        if (!expenses.length) return [];

        const insights: any[] = [];
        const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const thisMonthExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        if (thisMonthTotal > 10000) {
            insights.push({
                title: "High Spending Alert",
                desc: `You've spent ${formatCurrency(thisMonthTotal)} this month. Consider reviewing your "Wants" vs "Needs".`,
                icon: TrendingUp,
                color: "text-red-500",
                bg: "bg-red-500/10"
            });
        } else if (thisMonthTotal > 0) {
            insights.push({
                title: "On Track",
                desc: `Your spending is within a healthy range this month (${formatCurrency(thisMonthTotal)}). Keep it up!`,
                icon: Target,
                color: "text-green-500",
                bg: "bg-green-500/10"
            });
        }

        const categoryTotals: Record<string, number> = {};
        thisMonthExpenses.forEach(e => {
            categoryTotals[e.category_id] = (categoryTotals[e.category_id] || 0) + Number(e.amount);
        });

        let topCatId = "";
        let topCatAmount = 0;

        Object.entries(categoryTotals).forEach(([id, amount]) => {
            if (amount > topCatAmount) {
                topCatAmount = amount;
                topCatId = id;
            }
        });

        if (topCatId) {
            const catName = categories.find(c => c.id === topCatId)?.name || "Unknown";
            insights.push({
                title: `Top Category: ${catName}`,
                desc: `You spent ${formatCurrency(topCatAmount)} on ${catName}. Try finding cheaper alternatives?`,
                icon: Lightbulb,
                color: "text-amber-500",
                bg: "bg-amber-500/10"
            });
        }

        return insights;
    };

    const insights = generateInsights();

    return (
        <div className="space-y-4 w-full">
            {/* AI Call-to-action Card */}
            {!geminiInsight && !isFetching && expenses.length > 0 && (
                <Card className="shadow-sm border-l-4 border-l-violet-500 bg-violet-50/50 dark:bg-violet-950/10 animate-fade-in">
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex gap-3 items-start">
                            <div className="p-2 rounded-full shrink-0 bg-violet-500/10">
                                <Sparkles className="w-5 h-5 text-violet-500" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-0.5 text-violet-600 dark:text-violet-400">Gemini AI Financial Insights</h4>
                                <p className="text-xs text-muted-foreground">Get advanced predictions, category analytics, and recommendations from Gemini AI.</p>
                            </div>
                        </div>
                        <Button 
                            size="sm" 
                            onClick={() => setIsAiRequested(true)} 
                            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 font-medium shrink-0"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate AI Analysis
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* AI Processing / Loading state */}
            {isFetching && !geminiInsight && (
                <Card className="shadow-sm border-l-4 border-l-violet-500 animate-pulse">
                    <CardContent className="p-4 flex gap-4 items-start">
                        <div className="p-2 rounded-full shrink-0 bg-violet-500/10">
                            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-1 text-violet-500">Gemini is analyzing your transactions...</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">Checking spending trends, top categories, and cost optimization ideas.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Custom CFO Insights Display */}
            {geminiInsight && (
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex gap-3 items-center">
                            <Sparkles className="w-7 h-7 bg-white/20 p-1.5 rounded-lg backdrop-blur-sm shrink-0" />
                            <div>
                                <span className="text-[9px] uppercase tracking-widest text-violet-200 font-bold block mb-0.5">CFO Audit Summary</span>
                                <h3 className="text-sm sm:text-base font-extrabold leading-snug">{geminiInsight.headline}</h3>
                            </div>
                        </div>
                        {geminiInsight.confidenceScore && (
                            <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10 shrink-0">
                                Confidence: {geminiInsight.confidenceScore}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="shadow-sm border border-muted">
                            <CardContent className="p-4 space-y-2">
                                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <Lightbulb className="w-4 h-4" /> CFO Executive Summary
                                </span>
                                <p className="text-xs text-muted-foreground leading-relaxed">{geminiInsight.summary}</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border border-muted">
                            <CardContent className="p-4 space-y-2">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4" /> Financial Impact
                                </span>
                                <p className="text-xs text-muted-foreground leading-relaxed">{geminiInsight.financialImpact || "Calculated based on spending rules."}</p>
                                {geminiInsight.predictedOutcome && (
                                    <div className="pt-2 border-t text-[10px] text-muted-foreground leading-snug">
                                        <strong className="text-foreground">Forecast Outcome:</strong> {geminiInsight.predictedOutcome}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border border-muted">
                            <CardContent className="p-4 space-y-2">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <Target className="w-4 h-4" /> Recommended Action
                                </span>
                                <p className="text-xs text-muted-foreground leading-relaxed">{geminiInsight.suggestedAction}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="shadow-sm border border-muted">
                        <CardContent className="p-4 space-y-3">
                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                <Target className="w-4 h-4 text-violet-500" /> Expense Velocity Breakdown
                            </h4>
                            <div className="overflow-x-auto border rounded-xl bg-muted/10">
                                <table className="min-w-full divide-y divide-border text-[11px]">
                                    <thead className="bg-muted/40 font-semibold text-muted-foreground">
                                        <tr>
                                            <th className="px-3.5 py-2 text-left">Category</th>
                                            <th className="px-3.5 py-2 text-left">Amount</th>
                                            <th className="px-3.5 py-2 text-left">CFO Diagnostic Rationale</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-background">
                                        {geminiInsight.topCategories?.map((category, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30">
                                                <td className="px-3.5 py-2 font-medium text-foreground">{category.name}</td>
                                                <td className="px-3.5 py-2 font-bold text-violet-600">{formatCurrency(category.amount)}</td>
                                                <td className="px-3.5 py-2 text-muted-foreground leading-normal">{category.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {geminiInsight.risks && geminiInsight.risks.length > 0 && (
                            <Card className="border-rose-100 bg-rose-500/5 shadow-sm">
                                <CardContent className="p-4 space-y-2">
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4" /> Spending Risk Audit
                                    </span>
                                    <ul className="space-y-1.5">
                                        {geminiInsight.risks.map((risk, idx) => (
                                            <li key={idx} className="text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 leading-relaxed">
                                                <span className="mt-0.5 font-bold text-[9px] bg-rose-500/10 px-1.5 py-0.5 rounded shrink-0">!</span>
                                                <span>{risk}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}

                        {geminiInsight.predictions && geminiInsight.predictions.length > 0 && (
                            <Card className="border-indigo-100 bg-indigo-500/5 shadow-sm">
                                <CardContent className="p-4 space-y-2">
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <TrendingUp className="w-4 h-4" /> 6-Month Cash Projections
                                    </span>
                                    <ul className="space-y-1.5">
                                        {geminiInsight.predictions.map((pred, idx) => (
                                            <li key={idx} className="text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2 leading-relaxed">
                                                <span className="mt-0.5 font-semibold text-[9px] bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0">→</span>
                                                <span>{pred}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* Basic Local Heuristic Insights Display */}
            {!geminiInsight && insights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    {insights.map((insight, idx) => (
                        <Card key={idx} className="shadow-sm border-l-4" style={{ borderLeftColor: 'currentColor' }}>
                            <CardContent className="p-4 flex gap-4 items-start">
                                <div className={`p-2 rounded-full shrink-0 ${insight.bg}`}>
                                    <insight.icon className={`w-5 h-5 ${insight.color}`} />
                                </div>
                                <div>
                                    <h4 className={`font-semibold text-sm mb-1 ${insight.color}`}>{insight.title}</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.desc}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
