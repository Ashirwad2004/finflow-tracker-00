import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { sqliteService } from "@/core/offline/sqliteService";
import { reportsApi } from "@/core/api/reports";
import { parseISO, isWithinInterval } from "date-fns";
import { DatePeriodPreset, DateRange } from "../lib/accounting/datePresets";

export function useAccountingRawData(
  periodPreset: DatePeriodPreset,
  activeDateRange: DateRange
) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // 1. Fetch Profile
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn("[AccountingData] Profile offline fetch:", e);
      }
      return null;
    },
    initialData: () => queryClient.getQueryData(["profile", userId]) || undefined,
    enabled: !!userId,
  });

  // 2. Fetch Sales
  const {
    data: allSales = [],
    isLoading: salesLoading,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ["sales", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("sales")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[AccountingData] Sales offline fallback:", e);
      }
      return (await sqliteService.getAll<any>("sales", userId)) || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["sales", userId]) || undefined,
    enabled: !!userId,
  });

  // 3. Fetch Purchases
  const {
    data: allPurchases = [],
    isLoading: purchasesLoading,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: ["purchases", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("purchases")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[AccountingData] Purchases offline fallback:", e);
      }
      return (await sqliteService.getAll<any>("purchases", userId)) || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["purchases", userId]) || undefined,
    enabled: !!userId,
  });

  // 4. Fetch Expenses
  const {
    data: allExpenses = [],
    isLoading: expensesLoading,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["expenses", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("expenses")
          .select("*, categories(id, name, color, icon)")
          .eq("user_id", userId)
          .order("date", { ascending: false });
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[AccountingData] Expenses offline fallback:", e);
      }
      return (await sqliteService.getAll<any>("expenses", userId)) || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["expenses", userId]) || undefined,
    enabled: !!userId,
  });

  // 5. Fetch Products
  const {
    data: allProducts = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["products", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("user_id", userId);
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[AccountingData] Products offline fallback:", e);
      }
      return (await sqliteService.getAll<any>("products", userId)) || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["products", userId]) || undefined,
    enabled: !!userId,
  });

  // 6. Fetch Parties
  const {
    data: allParties = [],
    isLoading: partiesLoading,
    refetch: refetchParties,
  } = useQuery({
    queryKey: ["parties", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("parties")
          .select("*")
          .eq("user_id", userId);
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[AccountingData] Parties offline fallback:", e);
      }
      return (await sqliteService.getAll<any>("parties", userId)) || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["parties", userId]) || undefined,
    enabled: !!userId,
  });

  // 7. Fetch Lent Money
  const { data: allLent = [], isLoading: lentLoading } = useQuery({
    queryKey: ["lent_money", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("lent_money")
          .select("*")
          .eq("user_id", userId);
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[AccountingData] Lent money offline fallback:", e);
      }
      return (await sqliteService.getAll<any>("lent_money", userId)) || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["lent_money", userId]) || undefined,
    enabled: !!userId,
  });

  // 8. Fetch Borrowed Money
  const { data: allBorrowed = [], isLoading: borrowedLoading } = useQuery({
    queryKey: ["borrowed_money", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("borrowed_money")
          .select("*")
          .eq("user_id", userId);
        if (!error && data) return data as any[];
      } catch (e) {
        console.warn("[AccountingData] Borrowed money offline fallback:", e);
      }
      return (await sqliteService.getAll<any>("borrowed_money", userId)) || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["borrowed_money", userId]) || undefined,
    enabled: !!userId,
  });

  // 9. Authoritative Server-side P&L Query
  const { data: serverPnl } = useQuery({
    queryKey: [
      "server-pnl",
      userId,
      activeDateRange.from?.toISOString(),
      activeDateRange.to?.toISOString(),
    ],
    queryFn: async () => {
      if (!userId || !navigator.onLine) return null;
      try {
        return await reportsApi.getProfitAndLoss({
          start_date: activeDateRange.from ? activeDateRange.from.toISOString().split("T")[0] : undefined,
          end_date: activeDateRange.to ? activeDateRange.to.toISOString().split("T")[0] : undefined,
        });
      } catch {
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  // Refetch all function
  const refetchAll = () => {
    refetchSales();
    refetchPurchases();
    refetchExpenses();
    refetchProducts();
    refetchParties();
  };

  const isLoading =
    salesLoading ||
    purchasesLoading ||
    expensesLoading ||
    productsLoading ||
    partiesLoading ||
    lentLoading ||
    borrowedLoading;

  // Filter helper: checks if an item's date falls within active range
  const isItemInRange = (dateStr?: string | null) => {
    if (periodPreset === "all") return true;
    if (!dateStr) return false;
    try {
      const d = parseISO(dateStr.slice(0, 10));
      return isWithinInterval(d, { start: activeDateRange.from, end: activeDateRange.to });
    } catch {
      return false;
    }
  };

  // Filtered lists by selected Date Range
  const filteredSales = useMemo(() => {
    return allSales.filter(
      (s: any) =>
        s.status !== "draft" &&
        isItemInRange(s.date || s.sale_date || s.invoice_date || s.created_at)
    );
  }, [allSales, activeDateRange, periodPreset]);

  const filteredPurchases = useMemo(() => {
    return allPurchases.filter((p: any) =>
      isItemInRange(p.date || p.purchase_date || p.bill_date || p.created_at)
    );
  }, [allPurchases, activeDateRange, periodPreset]);

  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((e: any) =>
      isItemInRange(e.date || e.expense_date || e.created_at)
    );
  }, [allExpenses, activeDateRange, periodPreset]);

  // Product cost map for quick cost calculation
  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    allProducts.forEach((p: any) => {
      const cost = Number(p.cost_price || p.purchase_price || 0);
      if (p.id) map.set(p.id, cost);
      if (p.name) map.set(p.name.toLowerCase().trim(), cost);
    });
    return map;
  }, [allProducts]);

  return {
    profile,
    allSales,
    allPurchases,
    allExpenses,
    allProducts,
    allParties,
    allLent,
    allBorrowed,
    serverPnl,
    filteredSales,
    filteredPurchases,
    filteredExpenses,
    productCostMap,
    isLoading,
    refetchAll,
  };
}
