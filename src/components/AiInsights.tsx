import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, TrendingDown, Target } from "lucide-react";

import { useCurrency } from "@/contexts/CurrencyContext";

interface AiInsightsProps {
    expenses: any[];
    categories: any[];
}

export const AiInsights = ({ expenses, categories }: AiInsightsProps) => {
    const { formatCurrency } = useCurrency();
    // Simple "AI" logic to generate insights
    const generateInsights = () => {
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

    if (insights.length === 0) return null;

    return (
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
    );
};
