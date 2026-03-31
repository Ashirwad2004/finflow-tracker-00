import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Filter, PieChart, TrendingDown } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
}

interface Expense {
    id: string;
    amount: number;
    description: string;
    date: string;
    category_id: string | null;
    categories?: Category;
}

interface MonthlyExpenseReportProps {
    expenses: Expense[];
}

export const MonthlyExpenseReport = ({ expenses }: MonthlyExpenseReportProps) => {
    const { formatCurrency } = useCurrency();

    // Group expenses by Month-Year (e.g., "January 2026")
    const monthlyData = useMemo(() => {
        const groups: Record<string, { total: number; expenses: Expense[]; categories: Record<string, { total: number; detail: Category }> }> = {};

        expenses.forEach((expense) => {
            const date = parseISO(expense.date);
            const monthKey = format(date, "MMMM yyyy"); // "January 2026"
            const sortKey = format(date, "yyyy-MM"); // "2026-01" for sorting later

            if (!groups[sortKey]) {
                groups[sortKey] = {
                    total: 0,
                    expenses: [],
                    categories: {},
                };
            }

            groups[sortKey].total += expense.amount;
            groups[sortKey].expenses.push(expense);

            // Track sub-totals per category for this month
            if (expense.categories) {
                const catId = expense.categories.id;
                if (!groups[sortKey].categories[catId]) {
                    groups[sortKey].categories[catId] = {
                        total: 0,
                        detail: expense.categories,
                    };
                }
                groups[sortKey].categories[catId].total += expense.amount;
            }
        });

        // Convert object to array and sort chronologically (newest first)
        return Object.entries(groups)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([sortKey, data]) => ({
                sortKey,
                label: format(parseISO(`${sortKey}-01`), "MMMM yyyy"),
                total: data.total,
                expensesCount: data.expenses.length,
                topCategories: Object.values(data.categories)
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 3), // Top 3 categories per month
            }));
    }, [expenses]);

    if (monthlyData.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <PieChart className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No Monthly Data</h3>
                <p className="text-muted-foreground">Add expenses to generate reports.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-4">
            {/* Top Level Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthlyData.map((month) => (
                    <Card key={month.sortKey} className="overflow-hidden bg-card hover:bg-accent/10 transition-colors border-2 hover:border-primary/50">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="flex justify-between items-center text-lg">
                                <span className="flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-primary" />
                                    {month.label}
                                </span>
                                <Badge variant="secondary" className="font-normal">
                                    {month.expensesCount} item{month.expensesCount !== 1 ? 's' : ''}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="mb-4">
                                <p className="text-sm font-medium text-muted-foreground mb-1">Total Spent</p>
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="w-6 h-6 text-destructive" />
                                    <p className="text-3xl font-bold tracking-tight text-foreground">
                                        {formatCurrency(month.total)}
                                    </p>
                                </div>
                            </div>

                            {month.topCategories.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-dashed">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Filter className="w-3 h-3" /> Top Categories
                                    </p>
                                    <div className="space-y-2">
                                        {month.topCategories.map((cat) => (
                                            <div key={cat.detail.id} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div
                                                        className="w-6 h-6 rounded flex items-center justify-center text-xs shadow-sm flex-shrink-0"
                                                        style={{ backgroundColor: `${cat.detail.color}20`, color: cat.detail.color }}
                                                    >
                                                        {cat.detail.icon}
                                                    </div>
                                                    <span className="truncate max-w-[120px]" title={cat.detail.name}>{cat.detail.name}</span>
                                                </div>
                                                <span className="font-medium">
                                                    {formatCurrency(cat.total)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
