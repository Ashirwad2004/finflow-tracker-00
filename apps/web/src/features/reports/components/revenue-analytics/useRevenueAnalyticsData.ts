import { useMemo } from "react";
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
import { FilterMode, Sale, Expense, ChartDataPoint } from "./types";

export function useRevenueAnalyticsData(
  sales: Sale[],
  expenses: Expense[],
  purchases?: any[],
  filter: FilterMode = "monthly"
) {
  const now = new Date();

  const {
    chartData,
    currentRevenue,
    currentPurchases,
    currentExpenses,
    prevRevenue,
    prevPurchases,
    prevExpenses,
  } = useMemo(() => {
    const getSaleAmt = (s: Sale) => Number(s.total_amount || 0);
    const getExpAmt = (e: Expense) => Number(e.amount || 0);

    const safeParseDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return new Date(0);
      try {
        const d = parseISO(dateStr);
        return isNaN(d.getTime()) ? new Date(0) : d;
      } catch {
        return new Date(0);
      }
    };

    const parseSaleDate = (s: Sale) => safeParseDate(s.date);
    const parseExpDate = (e: Expense) => safeParseDate(e.date);
    const parsePurDate = (p: any) => safeParseDate(p?.date);

    if (filter === "daily") {
      const start = startOfDay(subDays(now, 29));
      const end = startOfDay(now);
      const days = eachDayOfInterval({ start, end });

      const data: ChartDataPoint[] = days.map((day) => {
        const rev = sales
          .filter((s) => isSameDay(parseSaleDate(s), day))
          .reduce((sum, s) => sum + getSaleAmt(s), 0);
        const pur = (purchases || [])
          .filter((p) => isSameDay(parsePurDate(p), day))
          .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        const exp = expenses
          .filter((e) => isSameDay(parseExpDate(e), day))
          .reduce((sum, e) => sum + getExpAmt(e), 0);
        return { name: format(day, "dd MMM"), revenue: rev, purchases: pur, expenses: exp };
      });

      const prevStart = startOfDay(subDays(now, 59));
      const prevEnd = startOfDay(subDays(now, 30));

      const curRev = sales
        .filter((s) => {
          const d = parseSaleDate(s);
          return d >= start && d <= end;
        })
        .reduce((sum, s) => sum + getSaleAmt(s), 0);

      const curPur = (purchases || [])
        .filter((p) => {
          const d = parsePurDate(p);
          return d >= start && d <= end;
        })
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

      const curExp = expenses
        .filter((e) => {
          const d = parseExpDate(e);
          return d >= start && d <= end;
        })
        .reduce((sum, e) => sum + getExpAmt(e), 0);

      const pRev = sales
        .filter((s) => {
          const d = parseSaleDate(s);
          return d >= prevStart && d <= prevEnd;
        })
        .reduce((sum, s) => sum + getSaleAmt(s), 0);

      const pPur = (purchases || [])
        .filter((p) => {
          const d = parsePurDate(p);
          return d >= prevStart && d <= prevEnd;
        })
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

      const pExp = expenses
        .filter((e) => {
          const d = parseExpDate(e);
          return d >= prevStart && d <= prevEnd;
        })
        .reduce((sum, e) => sum + getExpAmt(e), 0);

      return {
        chartData: data,
        currentRevenue: curRev,
        currentPurchases: curPur,
        currentExpenses: curExp,
        prevRevenue: pRev,
        prevPurchases: pPur,
        prevExpenses: pExp,
      };
    }

    if (filter === "monthly") {
      const months = eachMonthOfInterval({
        start: startOfMonth(subMonths(now, 11)),
        end: startOfMonth(now),
      });

      const data: ChartDataPoint[] = months.map((month) => {
        const rev = sales
          .filter((s) => isSameMonth(parseSaleDate(s), month))
          .reduce((sum, s) => sum + getSaleAmt(s), 0);
        const pur = (purchases || [])
          .filter((p) => isSameMonth(parsePurDate(p), month))
          .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        const exp = expenses
          .filter((e) => isSameMonth(parseExpDate(e), month))
          .reduce((sum, e) => sum + getExpAmt(e), 0);
        return { name: format(month, "MMM yy"), revenue: rev, purchases: pur, expenses: exp };
      });

      const winStart = startOfMonth(subMonths(now, 11));
      const prevWinStart = startOfMonth(subMonths(now, 23));
      const prevWinEnd = startOfMonth(subMonths(now, 12));

      const curRev = sales
        .filter((s) => parseSaleDate(s) >= winStart)
        .reduce((sum, s) => sum + getSaleAmt(s), 0);

      const curPur = (purchases || [])
        .filter((p) => parsePurDate(p) >= winStart)
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

      const curExp = expenses
        .filter((e) => parseExpDate(e) >= winStart)
        .reduce((sum, e) => sum + getExpAmt(e), 0);

      const pRev = sales
        .filter((s) => {
          const d = parseSaleDate(s);
          return d >= prevWinStart && d <= prevWinEnd;
        })
        .reduce((sum, s) => sum + getSaleAmt(s), 0);

      const pPur = (purchases || [])
        .filter((p) => {
          const d = parsePurDate(p);
          return d >= prevWinStart && d <= prevWinEnd;
        })
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

      const pExp = expenses
        .filter((e) => {
          const d = parseExpDate(e);
          return d >= prevWinStart && d <= prevWinEnd;
        })
        .reduce((sum, e) => sum + getExpAmt(e), 0);

      return {
        chartData: data,
        currentRevenue: curRev,
        currentPurchases: curPur,
        currentExpenses: curExp,
        prevRevenue: pRev,
        prevPurchases: pPur,
        prevExpenses: pExp,
      };
    }

    // Yearly
    const years = eachYearOfInterval({
      start: startOfYear(subYears(now, 4)),
      end: startOfYear(now),
    });

    const data: ChartDataPoint[] = years.map((year) => {
      const rev = sales
        .filter((s) => isSameYear(parseSaleDate(s), year))
        .reduce((sum, s) => sum + getSaleAmt(s), 0);
      const pur = (purchases || [])
        .filter((p) => isSameYear(parsePurDate(p), year))
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      const exp = expenses
        .filter((e) => isSameYear(parseExpDate(e), year))
        .reduce((sum, e) => sum + getExpAmt(e), 0);
      return { name: format(year, "yyyy"), revenue: rev, purchases: pur, expenses: exp };
    });

    const curYear = startOfYear(now);
    const prevYear = startOfYear(subYears(now, 1));

    const curRev = sales
      .filter((s) => isSameYear(parseSaleDate(s), curYear))
      .reduce((sum, s) => sum + getSaleAmt(s), 0);

    const curPur = (purchases || [])
      .filter((p) => isSameYear(parsePurDate(p), curYear))
      .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    const curExp = expenses
      .filter((e) => isSameYear(parseExpDate(e), curYear))
      .reduce((sum, e) => sum + getExpAmt(e), 0);

    const pRev = sales
      .filter((s) => isSameYear(parseSaleDate(s), prevYear))
      .reduce((sum, s) => sum + getSaleAmt(s), 0);

    const pPur = (purchases || [])
      .filter((p) => isSameYear(parsePurDate(p), prevYear))
      .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    const pExp = expenses
      .filter((e) => isSameYear(parseExpDate(e), prevYear))
      .reduce((sum, e) => sum + getExpAmt(e), 0);

    return {
      chartData: data,
      currentRevenue: curRev,
      currentPurchases: curPur,
      currentExpenses: curExp,
      prevRevenue: pRev,
      prevPurchases: pPur,
      prevExpenses: pExp,
    };
  }, [filter, sales, expenses, purchases, now]);

  const netProfit = currentRevenue - currentPurchases - currentExpenses;
  const avgRevenue =
    chartData.length > 0
      ? chartData.reduce((s, d) => s + d.revenue, 0) /
          (chartData.filter((d) => d.revenue > 0).length || 1) || currentRevenue
      : 0;

  const pct = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

  const revTrend = pct(currentRevenue, prevRevenue);
  const expTrend = pct(currentExpenses, prevExpenses);
  const profitTrend = pct(netProfit, prevRevenue - prevExpenses);

  const topPeriods = useMemo(
    () => [...chartData].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    [chartData]
  );
  const maxRev = topPeriods[0]?.revenue || 1;

  return {
    chartData,
    currentRevenue,
    currentPurchases,
    currentExpenses,
    prevRevenue,
    prevPurchases,
    prevExpenses,
    netProfit,
    avgRevenue,
    revTrend,
    expTrend,
    profitTrend,
    topPeriods,
    maxRev,
  };
}
