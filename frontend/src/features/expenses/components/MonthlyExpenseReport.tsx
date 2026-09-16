import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  PieChart,
  FileDown,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Receipt,
  Wallet,
  Download,
  Calendar,
  X,
  Layers,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
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
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [periodPreset, setPeriodPreset] = useState<"all" | "3m" | "6m" | "year">("all");

  const formatDateForCSV = (d?: string | Date | null) => {
    if (!d) return "";
    if (d instanceof Date && !isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    if (typeof d === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
    }
    return String(d);
  };

  // Filter expenses by presets or custom date range
  const filteredExpenses = useMemo(() => {
    const today = new Date();

    if (startDate || endDate) {
      return expenses.filter((exp) => {
        const expDateStr = formatDateForCSV(exp.date);
        if (startDate && expDateStr < startDate) return false;
        if (endDate && expDateStr > endDate) return false;
        return true;
      });
    }

    if (periodPreset === "3m") {
      const cutoff = new Date(today);
      cutoff.setMonth(cutoff.getMonth() - 3);
      const cutoffStr = formatDateForCSV(cutoff);
      return expenses.filter((exp) => formatDateForCSV(exp.date) >= cutoffStr);
    }

    if (periodPreset === "6m") {
      const cutoff = new Date(today);
      cutoff.setMonth(cutoff.getMonth() - 6);
      const cutoffStr = formatDateForCSV(cutoff);
      return expenses.filter((exp) => formatDateForCSV(exp.date) >= cutoffStr);
    }

    if (periodPreset === "year") {
      const startOfYear = `${today.getFullYear()}-01-01`;
      return expenses.filter((exp) => formatDateForCSV(exp.date) >= startOfYear);
    }

    return expenses;
  }, [expenses, startDate, endDate, periodPreset]);

  // Group expenses by Month-Year (sorted newest first)
  const monthlyData = useMemo(() => {
    const groups: Record<
      string,
      {
        total: number;
        expenses: Expense[];
        categories: Record<string, { total: number; detail: Category }>;
      }
    > = {};

    filteredExpenses.forEach((expense) => {
      const date = parseISO(expense.date);
      if (isNaN(date.getTime())) return;
      const sortKey = format(date, "yyyy-MM");

      if (!groups[sortKey]) {
        groups[sortKey] = {
          total: 0,
          expenses: [],
          categories: {},
        };
      }

      const amt = Number(expense.amount) || 0;
      groups[sortKey].total += amt;
      groups[sortKey].expenses.push(expense);

      if (expense.categories) {
        const catId = expense.categories.id;
        if (!groups[sortKey].categories[catId]) {
          groups[sortKey].categories[catId] = {
            total: 0,
            detail: expense.categories,
          };
        }
        groups[sortKey].categories[catId].total += amt;
      }
    });

    const sortedEntries = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));

    return sortedEntries.map(([sortKey, data], index) => {
      const parsedDate = parseISO(`${sortKey}-01`);
      const prevMonthData = sortedEntries[index + 1]?.[1];
      const prevTotal = prevMonthData?.total || 0;

      let momChangePercent: number | null = null;
      if (prevMonthData && prevTotal > 0) {
        momChangePercent = ((data.total - prevTotal) / prevTotal) * 100;
      }

      const topCategories = Object.values(data.categories)
        .sort((a, b) => b.total - a.total)
        .map((cat) => ({
          ...cat,
          percentage: data.total > 0 ? (cat.total / data.total) * 100 : 0,
        }));

      const isCurrentMonth = format(new Date(), "yyyy-MM") === sortKey;

      return {
        sortKey,
        label: format(parsedDate, "MMMM yyyy"),
        shortLabel: format(parsedDate, "MMM yy"),
        total: data.total,
        expensesCount: data.expenses.length,
        avgTicket: data.expenses.length > 0 ? data.total / data.expenses.length : 0,
        expenses: data.expenses.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        topCategories,
        momChangePercent,
        isCurrentMonth,
      };
    });
  }, [filteredExpenses]);

  // Overall Financial KPIs for the viewed range
  const stats = useMemo(() => {
    const totalSpend = monthlyData.reduce((acc, m) => acc + m.total, 0);
    const totalTransactions = monthlyData.reduce((acc, m) => acc + m.expensesCount, 0);
    const monthsCount = monthlyData.length || 1;
    const avgMonthlySpend = totalSpend / monthsCount;

    // Overall top category across the filtered range
    const categoryAgg: Record<string, { total: number; detail?: Category }> = {};
    filteredExpenses.forEach((e) => {
      const catName = e.categories?.name || "General";
      if (!categoryAgg[catName]) {
        categoryAgg[catName] = { total: 0, detail: e.categories };
      }
      categoryAgg[catName].total += Number(e.amount) || 0;
    });

    let topCatName = "None";
    let topCatAmount = 0;
    let topCatDetail: Category | undefined;
    Object.entries(categoryAgg).forEach(([name, val]) => {
      if (val.total > topCatAmount) {
        topCatAmount = val.total;
        topCatName = name;
        topCatDetail = val.detail;
      }
    });

    const latestMonth = monthlyData[0];
    const latestMom = latestMonth?.momChangePercent ?? null;

    return {
      totalSpend,
      totalTransactions,
      avgMonthlySpend,
      monthsCount,
      topCatName,
      topCatAmount,
      topCatDetail,
      latestMom,
    };
  }, [monthlyData, filteredExpenses]);

  // Chart dataset formatted chronologically (oldest to newest)
  const chartData = useMemo(() => {
    return [...monthlyData].reverse().map((m) => ({
      name: m.shortLabel,
      fullName: m.label,
      total: m.total,
      count: m.expensesCount,
    }));
  }, [monthlyData]);

  // Export handlers
  const downloadCSV = (data: Expense[], titleSuffix: string) => {
    if (!data || data.length === 0) return;

    const header = ["ID", "Description", "Amount", "Date", "Category"];
    const rows = data.map((e) => {
      const amount = typeof e.amount === "number" ? e.amount : parseFloat(String(e.amount) || "0");
      return [
        e.id,
        (e.description ?? "").replace(/"/g, '""'),
        amount.toFixed(2),
        formatDateForCSV(e.date),
        (e.categories?.name ?? "").replace(/"/g, '""'),
      ];
    });

    const csv = [header, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rupeebill_expenses_${titleSuffix.toLowerCase().replace(/\s+/g, "_")}_${formatDateForCSV(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPDF = (data: Expense[], titleSuffix: string) => {
    if (!data || data.length === 0) return;
    const doc = new jsPDF();
    const title = `RupeeBill Expense Statement - ${titleSuffix}`;

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")} IST`, 14, 27);

    const totalAmt = data.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    doc.text(
      `Total Spend: ${currency.code} ${totalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })} | Transactions: ${data.length}`,
      14,
      33
    );

    const tableColumn = ["Date", "Description", "Category", "Amount"];
    const tableRows = data.map((expense) => {
      const amount = Number(expense.amount) || 0;
      return [
        formatDateForCSV(expense.date),
        expense.description || "—",
        expense.categories?.name || "General",
        `${currency.code} ${amount.toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 38,
      theme: "striped",
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: { 3: { halign: "right" } },
    });

    doc.save(
      `rupeebill_expenses_${titleSuffix.toLowerCase().replace(/\s+/g, "_")}_${formatDateForCSV(new Date())}.pdf`
    );
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setPeriodPreset("all");
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 bg-card border border-border/60 rounded-xl">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <PieChart className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-base text-foreground mb-1">No Monthly Data Available</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Record your company or business expenses to automatically generate monthly statements and burn analyses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1 animate-fade-in font-sans">
      {/* SaaS Compact Toolbar & Filter Strip */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline">
            Range:
          </span>
          <Button
            size="sm"
            variant={periodPreset === "all" && !startDate && !endDate ? "default" : "outline"}
            onClick={() => {
              setPeriodPreset("all");
              setStartDate("");
              setEndDate("");
            }}
            className="h-7 text-xs px-2.5 rounded-lg"
          >
            All Time
          </Button>
          <Button
            size="sm"
            variant={periodPreset === "year" && !startDate && !endDate ? "default" : "outline"}
            onClick={() => {
              setPeriodPreset("year");
              setStartDate("");
              setEndDate("");
            }}
            className="h-7 text-xs px-2.5 rounded-lg"
          >
            This Year
          </Button>
          <Button
            size="sm"
            variant={periodPreset === "6m" && !startDate && !endDate ? "default" : "outline"}
            onClick={() => {
              setPeriodPreset("6m");
              setStartDate("");
              setEndDate("");
            }}
            className="h-7 text-xs px-2.5 rounded-lg"
          >
            Last 6 Mo
          </Button>
          <Button
            size="sm"
            variant={periodPreset === "3m" && !startDate && !endDate ? "default" : "outline"}
            onClick={() => {
              setPeriodPreset("3m");
              setStartDate("");
              setEndDate("");
            }}
            className="h-7 text-xs px-2.5 rounded-lg"
          >
            Last 3 Mo
          </Button>
        </div>

        {/* Custom Date Pickers & Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/60">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset("all");
              }}
              className="h-7 text-xs w-32 border-0 bg-transparent focus-visible:ring-0 p-1"
              placeholder="Start"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset("all");
              }}
              className="h-7 text-xs w-32 border-0 bg-transparent focus-visible:ring-0 p-1"
              placeholder="End"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearFilter}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Clear Dates"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadCSV(filteredExpenses, "filtered_statement")}
              className="h-8 text-xs px-2.5 gap-1.5 border-border"
              title="Download full CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => downloadPDF(filteredExpenses, "filtered_statement")}
              className="h-8 text-xs px-2.5 gap-1.5 font-medium shadow-2xs"
              title="Download executive PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF Statement
            </Button>
          </div>
        </div>
      </div>

      {/* Executive KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Filtered Spend</span>
            <Receipt className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground tracking-tight">
            {formatCurrency(stats.totalSpend)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stats.totalTransactions} transactions in {stats.monthsCount} month{stats.monthsCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg. Monthly Burn</span>
            <Wallet className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-foreground tracking-tight">
            {formatCurrency(stats.avgMonthlySpend)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Normalized monthly burn
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Latest MoM Trend</span>
            <TrendingDown className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {stats.latestMom !== null ? (
              <>
                <span
                  className={`text-xl font-bold tracking-tight ${
                    stats.latestMom > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {stats.latestMom > 0 ? "+" : ""}
                  {stats.latestMom.toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted-foreground">vs prev month</span>
              </>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">Baseline month</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {monthlyData[0]?.label || "Current"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Top Cost Driver</span>
            <PieChart className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <p className="text-xl font-bold text-foreground tracking-tight truncate" title={stats.topCatName}>
            {stats.topCatName}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatCurrency(stats.topCatAmount)} (
            {stats.totalSpend > 0 ? ((stats.topCatAmount / stats.totalSpend) * 100).toFixed(0) : 0}%)
          </p>
        </div>
      </div>

      {/* Visual Burn Trend Chart (Compact Height) */}
      {chartData.length > 1 && (
        <Card className="border-border shadow-2xs">
          <CardHeader className="py-2.5 px-4 border-b border-border/70 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Monthly Spend Progression (MoM)
            </CardTitle>
            <span className="text-[11px] text-muted-foreground">
              {chartData.length} statements recorded
            </span>
          </CardHeader>
          <CardContent className="pt-3 pb-2 px-2 sm:px-4">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md p-2.5 text-xs space-y-1">
                          <p className="font-semibold text-foreground">{item.fullName}</p>
                          <div className="flex items-center justify-between gap-3 text-muted-foreground">
                            <span>Total Spend:</span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(item.total)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-muted-foreground">
                            <span>Transactions:</span>
                            <span className="font-medium text-foreground">{item.count}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Standard Monthly Statements Ledger Table */}
      <Card className="border-border shadow-2xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/70 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Monthly Statements Ledger
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any month to inspect detailed category distribution and top ticket items.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {monthlyData.length} Statement{monthlyData.length !== 1 ? "s" : ""}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-10 text-center"></TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Statement Period
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gross Spend
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  Transactions
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Avg Ticket
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                  Top Cost Centers
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((month) => {
                const isExpanded = expandedMonth === month.sortKey;

                return (
                  <TableRow
                    key={month.sortKey}
                    className={`cursor-pointer transition-colors border-b border-border/70 ${
                      isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
                    }`}
                    onClick={() => setExpandedMonth(isExpanded ? null : month.sortKey)}
                  >
                    {/* Expand Toggle */}
                    <TableCell className="text-center py-2.5 pl-3 pr-0 w-8">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>

                    {/* Period Label */}
                    <TableCell className="py-2.5 font-medium text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{month.label}</span>
                        {month.isCurrentMonth && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] px-1.5 py-0 h-4 font-normal"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Gross Spend & MoM Badge */}
                    <TableCell className="py-2.5 font-semibold text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-bold">{formatCurrency(month.total)}</span>
                        {month.momChangePercent !== null && (
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${
                              month.momChangePercent > 0
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {month.momChangePercent > 0 ? (
                              <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                            ) : (
                              <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />
                            )}
                            {Math.abs(month.momChangePercent).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Transactions Count */}
                    <TableCell className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                      {month.expensesCount} record{month.expensesCount !== 1 ? "s" : ""}
                    </TableCell>

                    {/* Avg Ticket Size */}
                    <TableCell className="py-2.5 text-xs text-muted-foreground hidden md:table-cell tabular-nums">
                      {formatCurrency(month.avgTicket)}
                    </TableCell>

                    {/* Top Cost Centers Pills */}
                    <TableCell className="py-2.5 text-xs hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {month.topCategories.slice(0, 2).map((cat) => (
                          <span
                            key={cat.detail.id}
                            className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-[11px] text-muted-foreground border border-border/50"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.detail.color || "#6366f1" }}
                            />
                            <span className="truncate max-w-[85px]">{cat.detail.name}</span>
                            <span className="font-semibold text-foreground">
                              {cat.percentage.toFixed(0)}%
                            </span>
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    {/* Scoped Actions */}
                    <TableCell className="py-2.5 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadCSV(month.expenses, month.label)}
                          className="h-7 text-xs px-2 hover:bg-muted text-muted-foreground hover:text-foreground"
                          title={`Export ${month.label} CSV`}
                        >
                          CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadPDF(month.expenses, month.label)}
                          className="h-7 text-xs px-2.5 gap-1 border-border/70 hover:bg-muted font-medium"
                          title={`Export ${month.label} PDF`}
                        >
                          <FileDown className="w-3.5 h-3.5 text-primary" />
                          PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Expanded Drawer Details (Drilldown) */}
          {expandedMonth && (() => {
            const activeMonth = monthlyData.find((m) => m.sortKey === expandedMonth);
            if (!activeMonth) return null;

            return (
              <div className="bg-muted/15 border-t border-b border-border p-4 sm:p-6 space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Detailed Breakdown: {activeMonth.label}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Total Period Spend: <span className="font-bold text-foreground">{formatCurrency(activeMonth.total)}</span> across {activeMonth.expensesCount} transactions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadCSV(activeMonth.expenses, activeMonth.label)}
                      className="h-7 text-xs px-2.5 gap-1 border-border"
                    >
                      <Download className="w-3 h-3" />
                      Month CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => downloadPDF(activeMonth.expenses, activeMonth.label)}
                      className="h-7 text-xs px-2.5 gap-1 font-medium"
                    >
                      <FileDown className="w-3 h-3" />
                      Month PDF
                    </Button>
                  </div>
                </div>

                {/* Category Share Distribution */}
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Category Allocations ({activeMonth.topCategories.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {activeMonth.topCategories.map((cat) => (
                      <div
                        key={cat.detail.id}
                        className="bg-card border border-border/80 rounded-lg p-2.5 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${cat.detail.color}15` }}
                            >
                              <CategoryIcon
                                name={cat.detail.icon}
                                className="w-3 h-3"
                                color={cat.detail.color}
                              />
                            </div>
                            <span className="font-medium text-foreground truncate max-w-[120px]" title={cat.detail.name}>
                              {cat.detail.name}
                            </span>
                          </div>
                          <span className="font-bold tabular-nums text-foreground">
                            {formatCurrency(cat.total)}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${cat.percentage}%`,
                                backgroundColor: cat.detail.color || "#6366f1",
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Share</span>
                            <span className="font-semibold">{cat.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 5 Transactions Preview in this Month */}
                {activeMonth.expenses.length > 0 && (
                  <div className="pt-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Recent Activity in {activeMonth.label} (Top {Math.min(5, activeMonth.expenses.length)})
                    </h5>
                    <div className="border border-border/70 rounded-lg overflow-hidden bg-card">
                      <Table>
                        <TableBody>
                          {activeMonth.expenses.slice(0, 5).map((tx) => (
                            <TableRow key={tx.id} className="text-xs border-b border-border/50 last:border-0 hover:bg-muted/20">
                              <TableCell className="py-2 pl-3 text-muted-foreground w-24">
                                {formatDateForCSV(tx.date)}
                              </TableCell>
                              <TableCell className="py-2 font-medium text-foreground">
                                {tx.description || "General Operational Expense"}
                              </TableCell>
                              <TableCell className="py-2 text-muted-foreground hidden sm:table-cell">
                                <span className="inline-flex items-center gap-1">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: tx.categories?.color || "#94a3b8" }}
                                  />
                                  {tx.categories?.name || "Uncategorized"}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-right pr-3 font-semibold text-foreground tabular-nums">
                                {formatCurrency(tx.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};
