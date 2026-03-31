import { useState, useMemo } from "react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  format,
  subDays,
  subMonths,
  subYears,
  startOfDay,
  startOfMonth,
  startOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  isSameDay,
  isSameMonth,
  isSameYear,
  parseISO,
} from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Layers,
  Minus,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type FilterMode = "daily" | "monthly" | "yearly";
type ChartMode = "area" | "bar";

interface Sale {
  date: string;
  total_amount?: number | string;
}
interface Expense {
  date: string;
  amount?: number | string;
}
interface Props {
  sales: Sale[];
  expenses: Expense[];
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl px-4 py-3 min-w-[160px]">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-600 dark:text-slate-300 capitalize">{p.dataKey}</span>
          </span>
          <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({
  label,
  value,
  trend,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  trend: number;
  icon: any;
  color: string;
}) => {
  const isPositive = trend >= 0;
  const TrendIcon = trend === 0 ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend === 0
    ? "text-slate-400"
    : isPositive
    ? "text-emerald-500"
    : "text-rose-500";

  return (
    <div className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className={`flex items-center gap-0.5 text-xs font-bold ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          {trend !== 0 && <span>{Math.abs(trend).toFixed(1)}%</span>}
          {trend === 0 && <span>—</span>}
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{value}</p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function RevenueAnalytics({ sales, expenses }: Props) {
  const { formatCurrency } = useCurrency();
  const [filter, setFilter] = useState<FilterMode>("monthly");
  const [chartType, setChartType] = useState<ChartMode>("area");

  const now = new Date();

  // ── Build chart data based on active filter ──────────────────────────────
  const { chartData, currentRevenue, currentExpenses, prevRevenue, prevExpenses } = useMemo(() => {
    const getSaleAmt = (s: Sale) => Number(s.total_amount || 0);
    const getExpAmt = (e: Expense) => Number(e.amount || 0);
    const parseSaleDate = (s: Sale) => parseISO(s.date);
    const parseExpDate = (e: Expense) => parseISO(e.date);

    if (filter === "daily") {
      // Last 30 days
      const start = startOfDay(subDays(now, 29));
      const end = startOfDay(now);
      const days = eachDayOfInterval({ start, end });

      const data = days.map((day) => {
        const rev = sales
          .filter((s) => isSameDay(parseSaleDate(s), day))
          .reduce((sum, s) => sum + getSaleAmt(s), 0);
        const exp = expenses
          .filter((e) => isSameDay(parseExpDate(e), day))
          .reduce((sum, e) => sum + getExpAmt(e), 0);
        return { name: format(day, "dd MMM"), revenue: rev, expenses: exp };
      });

      // Current window = last 30 days, previous window = 30 days before that
      const prevStart = startOfDay(subDays(now, 59));
      const prevEnd = startOfDay(subDays(now, 30));
      const curRev = sales.filter((s) => {
        const d = parseSaleDate(s);
        return d >= start && d <= end;
      }).reduce((sum, s) => sum + getSaleAmt(s), 0);
      const curExp = expenses.filter((e) => {
        const d = parseExpDate(e);
        return d >= start && d <= end;
      }).reduce((sum, e) => sum + getExpAmt(e), 0);
      const pRev = sales.filter((s) => {
        const d = parseSaleDate(s);
        return d >= prevStart && d <= prevEnd;
      }).reduce((sum, s) => sum + getSaleAmt(s), 0);
      const pExp = expenses.filter((e) => {
        const d = parseExpDate(e);
        return d >= prevStart && d <= prevEnd;
      }).reduce((sum, e) => sum + getExpAmt(e), 0);

      return { chartData: data, currentRevenue: curRev, currentExpenses: curExp, prevRevenue: pRev, prevExpenses: pExp };
    }

    if (filter === "monthly") {
      // Last 12 months
      const months = eachMonthOfInterval({
        start: startOfMonth(subMonths(now, 11)),
        end: startOfMonth(now),
      });

      const data = months.map((month) => {
        const rev = sales
          .filter((s) => isSameMonth(parseSaleDate(s), month))
          .reduce((sum, s) => sum + getSaleAmt(s), 0);
        const exp = expenses
          .filter((e) => isSameMonth(parseExpDate(e), month))
          .reduce((sum, e) => sum + getExpAmt(e), 0);
        return { name: format(month, "MMM yy"), revenue: rev, expenses: exp };
      });

      // Current = last 12 months, previous = 12 months before
      const winStart = startOfMonth(subMonths(now, 11));
      const prevWinStart = startOfMonth(subMonths(now, 23));
      const prevWinEnd = startOfMonth(subMonths(now, 12));

      const curRev = sales.filter((s) => parseSaleDate(s) >= winStart).reduce((sum, s) => sum + getSaleAmt(s), 0);
      const curExp = expenses.filter((e) => parseExpDate(e) >= winStart).reduce((sum, e) => sum + getExpAmt(e), 0);
      const pRev = sales.filter((s) => {
        const d = parseSaleDate(s);
        return d >= prevWinStart && d <= prevWinEnd;
      }).reduce((sum, s) => sum + getSaleAmt(s), 0);
      const pExp = expenses.filter((e) => {
        const d = parseExpDate(e);
        return d >= prevWinStart && d <= prevWinEnd;
      }).reduce((sum, e) => sum + getExpAmt(e), 0);

      return { chartData: data, currentRevenue: curRev, currentExpenses: curExp, prevRevenue: pRev, prevExpenses: pExp };
    }

    // Yearly — last 5 years
    const years = eachYearOfInterval({
      start: startOfYear(subYears(now, 4)),
      end: startOfYear(now),
    });

    const data = years.map((year) => {
      const rev = sales
        .filter((s) => isSameYear(parseSaleDate(s), year))
        .reduce((sum, s) => sum + getSaleAmt(s), 0);
      const exp = expenses
        .filter((e) => isSameYear(parseExpDate(e), year))
        .reduce((sum, e) => sum + getExpAmt(e), 0);
      return { name: format(year, "yyyy"), revenue: rev, expenses: exp };
    });

    const curYear = startOfYear(now);
    const prevYear = startOfYear(subYears(now, 1));
    const curRev = sales.filter((s) => isSameYear(parseSaleDate(s), curYear)).reduce((sum, s) => sum + getSaleAmt(s), 0);
    const curExp = expenses.filter((e) => isSameYear(parseExpDate(e), curYear)).reduce((sum, e) => sum + getExpAmt(e), 0);
    const pRev = sales.filter((s) => isSameYear(parseSaleDate(s), prevYear)).reduce((sum, s) => sum + getSaleAmt(s), 0);
    const pExp = expenses.filter((e) => isSameYear(parseExpDate(e), prevYear)).reduce((sum, e) => sum + getExpAmt(e), 0);

    return { chartData: data, currentRevenue: curRev, currentExpenses: curExp, prevRevenue: pRev, prevExpenses: pExp };
  }, [filter, sales, expenses]);

  // ── KPI Derived Values ────────────────────────────────────────────────────
  const netProfit = currentRevenue - currentExpenses;
  const avgRevenue =
    chartData.length > 0
      ? chartData.reduce((s, d) => s + d.revenue, 0) / chartData.filter((d) => d.revenue > 0).length || currentRevenue
      : 0;

  const pct = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

  const revTrend = pct(currentRevenue, prevRevenue);
  const expTrend = pct(currentExpenses, prevExpenses);
  const profitTrend = pct(netProfit, prevRevenue - prevExpenses);

  // ── Top Periods Table ─────────────────────────────────────────────────────
  const topPeriods = [...chartData]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxRev = topPeriods[0]?.revenue || 1;

  // ── Filter Tabs ───────────────────────────────────────────────────────────
  const filters: { id: FilterMode; label: string }[] = [
    { id: "daily", label: "Daily" },
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly" },
  ];

  const filterLabel = {
    daily: "Last 30 Days",
    monthly: "Last 12 Months",
    yearly: "Last 5 Years",
  }[filter];

  const ChartComponent = chartType === "area" ? AreaChart : BarChart;

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-violet-500 inline-block" />
            Revenue Analytics
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {filterLabel} — revenue, expenses &amp; profitability at a glance
          </p>
        </div>

        {/* Filter + Chart type controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period filter tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  filter === f.id
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
            <button
              onClick={() => setChartType("area")}
              title="Area Chart"
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                chartType === "area"
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType("bar")}
              title="Bar Chart"
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                chartType === "bar"
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={formatCurrency(currentRevenue)}
          trend={revTrend}
          icon={IndianRupee}
          color="text-primary bg-primary/10"
        />
        <KpiCard
          label="Expenses"
          value={formatCurrency(currentExpenses)}
          trend={expTrend}
          icon={Layers}
          color="text-rose-600 bg-rose-100 dark:bg-rose-900/30"
        />
        <KpiCard
          label="Net Profit"
          value={formatCurrency(netProfit)}
          trend={profitTrend}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          color={
            netProfit >= 0
              ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30"
              : "text-rose-600 bg-rose-100 dark:bg-rose-900/30"
          }
        />
        <KpiCard
          label="Avg per Period"
          value={formatCurrency(isFinite(avgRevenue) ? avgRevenue : 0)}
          trend={0}
          icon={Activity}
          color="text-violet-600 bg-violet-100 dark:bg-violet-900/30"
        />
      </div>

      {/* ── Chart + Breakdown ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Main Chart */}
        <div className="xl:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Revenue vs Expenses</h4>
              <p className="text-xs text-slate-500 mt-0.5">{filterLabel}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Expenses
              </span>
            </div>
          </div>
          <div className="w-full h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#137fec" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    interval={filter === "daily" ? 4 : 0}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                  <Area type="monotone" dataKey="revenue" stroke="#137fec" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} fill="url(#expGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    interval={filter === "daily" ? 4 : 0}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                  <Bar dataKey="revenue" fill="#137fec" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} fillOpacity={0.75} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Periods Breakdown */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col">
          <h4 className="font-bold text-slate-900 dark:text-white mb-1">Top Periods</h4>
          <p className="text-xs text-slate-500 mb-5">Ranked by revenue</p>

          {topPeriods.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              No data available
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {topPeriods.map((period, i) => {
                const pct = maxRev > 0 ? (period.revenue / maxRev) * 100 : 0;
                const profit = period.revenue - period.expenses;
                return (
                  <div key={period.name} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 ${
                            i === 0
                              ? "bg-amber-400"
                              : i === 1
                              ? "bg-slate-400"
                              : i === 2
                              ? "bg-orange-400"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {period.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(period.revenue)}
                        </div>
                        <div
                          className={`text-[10px] font-semibold ${
                            profit >= 0 ? "text-emerald-500" : "text-rose-500"
                          }`}
                        >
                          {profit >= 0 ? "+" : ""}
                          {formatCurrency(profit)}
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary footer */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Rev.</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(currentRevenue)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Net Profit</p>
              <p
                className={`text-sm font-extrabold mt-0.5 ${
                  netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {formatCurrency(netProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
