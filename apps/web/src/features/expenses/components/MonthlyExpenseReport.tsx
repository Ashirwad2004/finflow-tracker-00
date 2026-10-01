import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, Filter, PieChart, TrendingDown, Calendar, FileDown } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    const { formatCurrency, currency } = useCurrency();
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const formatDateForCSV = (d?: string | Date | null) => {
        if (!d) return '';
        if (d instanceof Date && !isNaN(d.getTime())) {
            return d.toISOString().slice(0, 10);
        }
        if (typeof d === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

            const parsed = new Date(d);
            if (!isNaN(parsed.getTime())) {
                const y = parsed.getFullYear();
                const m = String(parsed.getMonth() + 1).padStart(2, '0');
                const day = String(parsed.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            }
        }
        return String(d);
    };

    // Filter expenses by the selected custom date range
    const filteredByRange = useMemo(() => {
        if (!startDate && !endDate) return [];
        return expenses.filter(exp => {
            const expDateStr = formatDateForCSV(exp.date);
            if (startDate && expDateStr < startDate) return false;
            if (endDate && expDateStr > endDate) return false;
            return true;
        });
    }, [expenses, startDate, endDate]);

    const downloadCSV = (data: Expense[], titleSuffix: string) => {
        if (!data || data.length === 0) return;

        const header = ['ID', 'Description', 'Amount', 'Date', 'Category'];

        const rows = data.map((e) => {
            const amount = typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount) || '0');
            const dateStr = formatDateForCSV(e.date);

            return [
                e.id,
                (e.description ?? '').replace(/"/g, '""'),
                amount.toFixed(2),
                dateStr,
                (e.categories?.name ?? '').replace(/"/g, '""'),
            ];
        });

        const csv = [header, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${titleSuffix.toLowerCase().replace(/\s+/g, '_')}_${formatDateForCSV(new Date())}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const downloadPDF = (data: Expense[], titleSuffix: string) => {
        if (!data || data.length === 0) return;
        const doc = new jsPDF();
        const title = `Expense Report - ${titleSuffix}`;

        doc.setFontSize(18);
        doc.text(title, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = ["Description", "Category", "Date", "Amount"];

        const tableRows = data.map(expense => {
            const amount = typeof expense.amount === 'number'
                ? expense.amount
                : parseFloat(String(expense.amount) || '0');

            return [
                expense.description,
                expense.categories?.name || 'Uncategorized',
                new Date(expense.date).toLocaleDateString(),
                `${currency.code} ${amount.toFixed(2)}`
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [79, 70, 229], // Premium Indigo color
                textColor: 255,
                fontStyle: 'bold',
            },
            columnStyles: { 3: { halign: 'right' } }
        });

        doc.save(`expenses_${titleSuffix.toLowerCase().replace(/\s+/g, '_')}_${formatDateForCSV(new Date())}.pdf`);
    };

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
                expenses: data.expenses, // Expose full monthly list of expenses
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
        <div className="space-y-6 pt-4 animate-in fade-in duration-500">
            {/* Custom Export Card */}
            <Card className="border-indigo-100 dark:border-indigo-950 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-indigo-950/10 dark:via-slate-900 dark:to-purple-950/10 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-indigo-100/50 dark:border-indigo-950/50">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                        <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Custom Date Range Export
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="flex-1 space-y-1.5 w-full">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-background border-border/80 text-foreground"
                            />
                        </div>
                        <div className="flex-1 space-y-1.5 w-full">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-background border-border/80 text-foreground"
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            {(startDate || endDate) && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    className="flex-1 sm:flex-none border border-border"
                                >
                                    Clear
                                </Button>
                            )}
                            <Button
                                disabled={filteredByRange.length === 0}
                                onClick={() => downloadCSV(filteredByRange, "custom_range")}
                                variant="outline"
                                className="flex-1 sm:flex-none gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                            >
                                CSV
                            </Button>
                            <Button
                                disabled={filteredByRange.length === 0}
                                onClick={() => downloadPDF(filteredByRange, "custom_range")}
                                className="flex-1 sm:flex-none gap-2 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 font-semibold"
                            >
                                <FileDown className="w-4 h-4" />
                                Export PDF
                            </Button>
                        </div>
                    </div>
                    {startDate || endDate ? (
                        <p className="text-xs text-muted-foreground font-medium">
                            {filteredByRange.length === 0 
                                ? "No expenses found in this date range." 
                                : `Found ${filteredByRange.length} expense${filteredByRange.length !== 1 ? 's' : ''} in the selected range.`}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground font-medium">
                            Select a start and/or end date to filter and export your expenses.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Top Level Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthlyData.map((month) => (
                    <Card key={month.sortKey} className="overflow-hidden bg-card hover:bg-accent/10 transition-colors border-2 hover:border-primary/50 flex flex-col justify-between">
                        <div>
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
                                                            className="w-6 h-6 rounded flex items-center justify-center shadow-sm flex-shrink-0"
                                                            style={{ backgroundColor: `${cat.detail.color}20` }}
                                                        >
                                                            <CategoryIcon
                                                                name={cat.detail.icon}
                                                                className="w-3.5 h-3.5"
                                                                color={cat.detail.color}
                                                            />
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
                        </div>
                        <div className="p-4 pt-0">
                            <div className="flex gap-2 pt-4 border-t border-border/50">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadCSV(month.expenses, month.label)}
                                    className="flex-1 text-xs gap-1.5 h-8 font-medium"
                                >
                                    CSV
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadPDF(month.expenses, month.label)}
                                    className="flex-1 text-xs gap-1.5 h-8 font-medium"
                                >
                                    <FileDown className="w-3.5 h-3.5" />
                                    PDF
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
