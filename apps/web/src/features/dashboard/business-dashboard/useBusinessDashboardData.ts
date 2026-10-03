import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { sqliteService } from "@/core/offline/sqliteService";
import { format, subMonths, isSameMonth } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";

export const COLORS = ["#137fec", "#2dd4bf", "#64748b", "#cbd5e1"];

export const parseValidDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function useBusinessDashboardData() {
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Fetch Sales with Offline Fallback
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("sales" as any)
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[BusinessDashboard] Sales fetch failed offline, falling back to cache:", e);
      }
      const cached = queryClient.getQueryData<any[]>(["sales", user.id]);
      if (cached && cached.length > 0) return cached;
      const localData = await sqliteService.getAll<any>("sales", user.id);
      return localData || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["sales", user?.id]) || undefined,
    enabled: !!user,
  });

  // Fetch Expenses with Offline Fallback
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("expenses")
          .select(`
            *,
            categories (
              id,
              name,
              color,
              icon
            )
          `)
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[BusinessDashboard] Expenses fetch failed offline, falling back to cache:", e);
      }
      const cached = queryClient.getQueryData<any[]>(["expenses", user.id]);
      if (cached && cached.length > 0) return cached;
      const localData = await sqliteService.getAll<any>("expenses", user.id);
      return localData || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["expenses", user?.id]) || undefined,
    enabled: !!user,
  });

  // Fetch Purchases (COGS) with Offline Fallback
  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("purchases")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[BusinessDashboard] Purchases fetch failed offline, falling back to cache:", e);
      }
      const cached = queryClient.getQueryData<any[]>(["purchases", user.id]);
      if (cached && cached.length > 0) return cached;
      const localData = await sqliteService.getAll<any>("purchases", user.id);
      return localData || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["purchases", user?.id]) || undefined,
    enabled: !!user,
  });

  // --- Data Aggregation (Memoized for zero re-computation on dialog/layout triggers) ---
  const { totalRevenue, totalPurchases, totalExpenses, grossProfit, netProfit, cashFlow } = useMemo(() => {
    let rev = 0;
    let pur = 0;
    let exp = 0;

    for (let i = 0; i < sales.length; i++) rev += Number(sales[i].total_amount || 0);
    for (let i = 0; i < purchases.length; i++) pur += Number(purchases[i].total_amount || 0);
    for (let i = 0; i < expenses.length; i++) exp += Number(expenses[i].amount || 0);

    const gross = rev - pur;
    const net = gross - exp;
    return {
      totalRevenue: rev,
      totalPurchases: pur,
      totalExpenses: exp,
      grossProfit: gross,
      netProfit: net,
      cashFlow: net,
    };
  }, [sales, purchases, expenses]);

  // Line Chart: P&L over last 6 months
  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));

    return last6Months.map((month) => {
      let rev = 0;
      let pur = 0;
      let exp = 0;

      for (let i = 0; i < sales.length; i++) {
        const date = parseValidDate(sales[i].date);
        if (date && isSameMonth(date, month)) rev += Number(sales[i].total_amount || 0);
      }
      for (let i = 0; i < purchases.length; i++) {
        const date = parseValidDate(purchases[i].date);
        if (date && isSameMonth(date, month)) pur += Number(purchases[i].total_amount || 0);
      }
      for (let i = 0; i < expenses.length; i++) {
        const date = parseValidDate(expenses[i].date);
        if (date && isSameMonth(date, month)) exp += Number(expenses[i].amount || 0);
      }

      return {
        name: format(month, "MMM"),
        revenue: rev,
        purchases: pur,
        expenses: exp,
      };
    });
  }, [sales, purchases, expenses]);

  // Top Customers & Doughnut Chart Data
  const { topCustomers, pieData } = useMemo(() => {
    const customerMap = new Map<string, number>();
    for (let i = 0; i < sales.length; i++) {
      const s = sales[i];
      if (s.customer_name) {
        customerMap.set(
          s.customer_name,
          (customerMap.get(s.customer_name) || 0) + Number(s.total_amount || 0)
        );
      }
    }

    const top = Array.from(customerMap.entries())
      .map(([name, total]) => ({ name, revenue: total }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3); // Top 3

    let pData = top.map((c) => ({ name: c.name, value: c.revenue }));
    const topRevenueSum = top.reduce((s, c) => s + c.revenue, 0);
    const otherRevenue = totalRevenue - topRevenueSum;
    if (otherRevenue > 0) {
      pData.push({ name: "Other", value: otherRevenue });
    }
    if (pData.length === 0) {
      pData = [{ name: "No Data", value: 1 }];
    }

    return { topCustomers: top, pieData: pData };
  }, [sales, totalRevenue]);

  const combinedHistory = useMemo(() => {
    return [
      ...sales.flatMap((s: any) => {
        const date = parseValidDate(s.date);
        return date
          ? [
              {
                id: s.id,
                type: "sale" as const,
                title: `Invoice - ${s.customer_name}`,
                ref: s.invoice_number,
                amount: Number(s.total_amount),
                date,
              },
            ]
          : [];
      }),
      ...purchases.flatMap((p: any) => {
        const date = parseValidDate(p.date);
        return date
          ? [
              {
                id: p.id,
                type: "purchase" as const,
                title: `Purchase - ${p.vendor_name || "Vendor"}`,
                ref: p.bill_number || "Bill",
                amount: Number(p.total_amount),
                date,
              },
            ]
          : [];
      }),
      ...expenses.flatMap((e: any) => {
        const date = parseValidDate(e.date);
        return date
          ? [
              {
                id: e.id,
                type: "expense" as const,
                title: e.description || "Expense",
                ref: "Receipt",
                amount: Number(e.amount),
                date,
              },
            ]
          : [];
      }),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [sales, purchases, expenses]);

  return {
    formatCurrency,
    navigate,
    isEditProfileOpen,
    setIsEditProfileOpen,
    sales,
    purchases,
    expenses,
    totalRevenue,
    totalPurchases,
    totalExpenses,
    grossProfit,
    netProfit,
    cashFlow,
    chartData,
    topCustomers,
    pieData,
    combinedHistory,
  };
}
