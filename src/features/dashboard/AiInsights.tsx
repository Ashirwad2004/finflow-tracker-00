import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Target, Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useCurrency } from "@/core/contexts/CurrencyContext";
import { generateFinanceInsight } from "@/core/integrations/ai/gemini";

interface AiInsightsProps {
    expenses: any[];
    categories: any[];
}

export const AiInsights = ({ expenses, categories }: AiInsightsProps) => {
    const { formatCurrency } = useCurrency();

    const { data: geminiInsight, isFetching } = useQuery({
        queryKey: ["gemini-dashboard-insights", expenses.length, expenses[0]?.id, categories.length],
        queryFn: () => generateFinanceInsight({ mode: "dashboard", expenses, categories }),
        enabled: expenses.length > 0,
        staleTime: 1000 * 60 * 20,
        retry: 1,
    });

    const generateInsights = () => {
        if (geminiInsight) {
            return [
                {
                    title: geminiInsight.headline,
                    desc: `${geminiInsight.summary} Suggested action: ${geminiInsight.suggestedAction}`,
                    icon: Sparkles,
                    color: "text-violet-500",
                    bg: "bg-violet-500/10"
                },
                ...(geminiInsight.topCategories?.slice(0, 1).map((category) => ({
                    title: `Top Spending: ${category.name}`,
                    desc: `${formatCurrency(category.amount)}. ${category.reason}`,
                    icon: Lightbulb,
                    color: "text-amber-500",
                    bg: "bg-amber-500/10"
                })) || []),
            ];
        }

        if (!expenses.length) return [];

        const insights = [];
        const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const thisMonthExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Insight 1: Spending Trend
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

        // Insight 2: Top Category
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

    if (insights.length === 0 && !isFetching) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {isFetching && !geminiInsight && (
                <Card className="shadow-sm border-l-4 border-l-violet-500">
                    <CardContent className="p-4 flex gap-4 items-start">
                        <div className="p-2 rounded-full shrink-0 bg-violet-500/10">
                            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-1 text-violet-500">Gemini is analyzing your dashboard</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">Checking spending trends, top categories, predictions, and cost optimization ideas.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
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
    );
};
