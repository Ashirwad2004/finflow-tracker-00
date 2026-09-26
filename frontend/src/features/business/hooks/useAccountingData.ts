import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { sqliteService } from "@/core/offline/sqliteService";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  differenceInDays,
  isWithinInterval,
  parseISO,
} from "date-fns";

export type DatePeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "this_fy"
  | "last_fy"
  | "all"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePeriodPreset;
}

export function getDateRangeFromPreset(preset: DatePeriodPreset, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr

  // Indian Financial Year calculation (1st April to 31st March)
  const fyStartYear = month >= 3 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_month": {
      const prevMonth = subMonths(now, 1);
      return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
    }
    case "q1":
      return { from: startOfDay(new Date(fyStartYear, 3, 1)), to: endOfDay(new Date(fyStartYear, 5, 30)) };
    case "q2":
      return { from: startOfDay(new Date(fyStartYear, 6, 1)), to: endOfDay(new Date(fyStartYear, 8, 30)) };
    case "q3":
      return { from: startOfDay(new Date(fyStartYear, 9, 1)), to: endOfDay(new Date(fyStartYear, 11, 31)) };
    case "q4":
      return { from: startOfDay(new Date(fyEndYear, 0, 1)), to: endOfDay(new Date(fyEndYear, 2, 31)) };
    case "this_fy":
      return { from: startOfDay(new Date(fyStartYear, 3, 1)), to: endOfDay(new Date(fyEndYear, 2, 31)) };
    case "last_fy":
      return { from: startOfDay(new Date(fyStartYear - 1, 3, 1)), to: endOfDay(new Date(fyStartYear, 2, 31)) };
    case "custom":
      return {
        from: customFrom ? startOfDay(customFrom) : startOfMonth(now),
        to: customTo ? endOfDay(customTo) : endOfDay(now),
      };
    case "all":
    default:
      return { from: new Date(2020, 0, 1), to: endOfDay(now) };
  }
}

export function useAccountingData() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Selected date range state
  const [periodPreset, setPeriodPreset] = useState<DatePeriodPreset>("this_month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPreset(periodPreset, customRange.from, customRange.to);
  }, [periodPreset, customRange]);

  // Specific Daybook date selection
  const [daybookDate, setDaybookDate] = useState<Date>(new Date());

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
  const { data: allSales = [], isLoading: salesLoading, refetch: refetchSales } = useQuery({
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
  const { data: allPurchases = [], isLoading: purchasesLoading, refetch: refetchPurchases } = useQuery({
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
  const { data: allExpenses = [], isLoading: expensesLoading, refetch: refetchExpenses } = useQuery({
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
  const { data: allProducts = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
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
  const { data: allParties = [], isLoading: partiesLoading, refetch: refetchParties } = useQuery({
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

  // Refetch all function
  const refetchAll = () => {
    refetchSales();
    refetchPurchases();
    refetchExpenses();
    refetchProducts();
    refetchParties();
  };

  const isLoading = salesLoading || purchasesLoading || expensesLoading || productsLoading || partiesLoading;

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

  // =========================================================================
  // 1. PROFIT AND LOSS STATEMENT (Schedule III / Ind AS Compliant)
  // =========================================================================
  const profitAndLoss = useMemo(() => {
    let grossSalesRevenue = 0;
    let salesReturns = 0;
    let directExpensesTotal = 0;
    let purchasesCost = 0;

    filteredSales.forEach((s: any) => {
      const tot = Number(s.total_amount || 0);
      if (s.status === "cancelled" || s.document_type === "credit_note") {
        salesReturns += tot;
      } else {
        grossSalesRevenue += tot;
      }
    });

    const netRevenue = grossSalesRevenue - salesReturns;

    filteredPurchases.forEach((p: any) => {
      purchasesCost += Number(p.total_amount || 0);
    });

    // Indirect vs Direct Expense Classification
    const directCategories = ["freight", "packaging", "raw materials", "labor", "carriage inward", "production"];
    const indirectCategories: Record<string, number> = {};
    let indirectExpensesTotal = 0;

    filteredExpenses.forEach((e: any) => {
      const amt = Number(e.amount || 0);
      const catName = (e.categories?.name || e.category || "General / Miscellaneous").toLowerCase().trim();

      const isDirect = directCategories.some((dc) => catName.includes(dc));
      if (isDirect) {
        directExpensesTotal += amt;
      } else {
        const displayCat = e.categories?.name || e.category || "General / Miscellaneous";
        indirectCategories[displayCat] = (indirectCategories[displayCat] || 0) + amt;
        indirectExpensesTotal += amt;
      }
    });

    // Cost of Goods Sold = Total Purchases + Direct Expenses
    const costOfGoodsSold = purchasesCost + directExpensesTotal;
    const grossProfit = netRevenue - costOfGoodsSold;
    const grossProfitMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    const netProfitBeforeTax = grossProfit - indirectExpensesTotal;
    const netProfitMarginPct = netRevenue > 0 ? (netProfitBeforeTax / netRevenue) * 100 : 0;

    return {
      grossSalesRevenue,
      salesReturns,
      netRevenue,
      purchasesCost,
      directExpensesTotal,
      costOfGoodsSold,
      grossProfit,
      grossProfitMarginPct,
      indirectCategories,
      indirectExpensesTotal,
      netProfitBeforeTax,
      netProfitMarginPct,
    };
  }, [filteredSales, filteredPurchases, filteredExpenses]);

  // =========================================================================
  // 2. BILL-WISE PROFIT REPORT
  // =========================================================================
  const billWiseProfit = useMemo(() => {
    return filteredSales.map((s: any) => {
      const invoiceTotal = Number(s.total_amount || 0);
      const items = Array.isArray(s.items) ? s.items : [];

      let costOfInvoice = 0;
      items.forEach((it: any) => {
        const qty = Number(it.quantity || 1);
        let itemCost = Number(it.cost_price || 0);
        if (!itemCost && it.name) {
          itemCost = productCostMap.get(it.name.toLowerCase().trim()) || 0;
        }
        if (!itemCost && it.product_id) {
          itemCost = productCostMap.get(it.product_id) || 0;
        }
        costOfInvoice += qty * itemCost;
      });

      // If items cost isn't recorded, estimate standard merchant benchmark (e.g. 70% COGS)
      if (costOfInvoice === 0 && invoiceTotal > 0 && items.length === 0) {
        costOfInvoice = invoiceTotal * 0.7;
      }

      const profit = invoiceTotal - costOfInvoice;
      const marginPct = invoiceTotal > 0 ? (profit / invoiceTotal) * 100 : 0;

      let statusTier: "High" | "Normal" | "Low" | "Loss" = "Normal";
      if (marginPct >= 30) statusTier = "High";
      else if (marginPct >= 15) statusTier = "Normal";
      else if (marginPct >= 0) statusTier = "Low";
      else statusTier = "Loss";

      return {
        id: s.id,
        invoiceNumber: s.invoice_number || s.id?.slice(0, 8),
        date: s.date || s.created_at,
        customerName: s.customer_name || "Direct Customer",
        customerPhone: s.customer_phone || "",
        invoiceTotal,
        costOfInvoice,
        profit,
        marginPct,
        statusTier,
      };
    });
  }, [filteredSales, productCostMap]);

  // =========================================================================
  // 3. RECEIVABLES AGING REPORT (0-30, 31-60, 61-90, 90+ days & MSME 45-day)
  // =========================================================================
  const receivablesAging = useMemo(() => {
    const partyMap = new Map<
      string,
      {
        partyId: string;
        partyName: string;
        phone: string;
        totalOutstanding: number;
        bucket0_30: number;
        bucket31_60: number;
        bucket61_90: number;
        bucket90Plus: number;
        oldestDueDate: string;
        overdueCount: number;
        isMsmeExceeded: boolean; // Over 45 days (Section 43B(h) statutory rule)
      }
    >();

    const now = new Date();
    let totalAll = 0;
    let tot0_30 = 0;
    let tot31_60 = 0;
    let tot61_90 = 0;
    let tot90Plus = 0;
    let msmeViolationsTotal = 0;

    allSales.forEach((s: any) => {
      const bal =
        s.balance_due !== undefined && s.balance_due !== null
          ? Number(s.balance_due)
          : Number(s.total_amount || 0) - Number(s.amount_paid || 0);

      if (bal <= 0) return;

      const pId = s.party_id || s.customer_name || "Direct Customer";
      const pName = s.customer_name || "Direct Customer";
      const phone = s.customer_phone || "";

      let daysOld = 0;
      const refDateStr = s.due_date || s.date || s.created_at;
      if (refDateStr) {
        try {
          daysOld = differenceInDays(now, parseISO(refDateStr.slice(0, 10)));
        } catch {
          daysOld = 15;
        }
      }

      if (!partyMap.has(pId)) {
        partyMap.set(pId, {
          partyId: pId,
          partyName: pName,
          phone,
          totalOutstanding: 0,
          bucket0_30: 0,
          bucket31_60: 0,
          bucket61_90: 0,
          bucket90Plus: 0,
          oldestDueDate: refDateStr || "",
          overdueCount: 0,
          isMsmeExceeded: false,
        });
      }

      const rec = partyMap.get(pId)!;
      rec.totalOutstanding += bal;
      totalAll += bal;

      if (daysOld <= 30) {
        rec.bucket0_30 += bal;
        tot0_30 += bal;
      } else if (daysOld <= 60) {
        rec.bucket31_60 += bal;
        tot31_60 += bal;
      } else if (daysOld <= 90) {
        rec.bucket61_90 += bal;
        tot61_90 += bal;
      } else {
        rec.bucket90Plus += bal;
        tot90Plus += bal;
      }

      if (daysOld > 45) {
        rec.isMsmeExceeded = true;
        msmeViolationsTotal += bal;
      }
      if (daysOld > 0) rec.overdueCount++;
    });

    return {
      parties: Array.from(partyMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding),
      totalOutstanding: totalAll,
      tot0_30,
      tot31_60,
      tot61_90,
      tot90Plus,
      msmeViolationsTotal,
    };
  }, [allSales]);

  // =========================================================================
  // 4. DAYBOOK (Daily Journal for a Selected Day)
  // =========================================================================
  const daybook = useMemo(() => {
    const selectedDateStr = daybookDate.toISOString().slice(0, 10);
    const entries: {
      id: string;
      time: string;
      voucherType: "Sale" | "Purchase" | "Expense" | "Lent" | "Borrowed";
      voucherNo: string;
      particulars: string;
      debit: number;
      credit: number;
      paymentMode: string;
    }[] = [];

    let totalDebit = 0;
    let totalCredit = 0;

    // Sales on daybookDate (Cash/Bank Debit, Sales Credit)
    allSales.forEach((s: any) => {
      const sDate = (s.date || s.created_at || "").slice(0, 10);
      if (sDate === selectedDateStr && s.status !== "draft") {
        const amt = Number(s.amount_paid || s.total_amount || 0);
        entries.push({
          id: `sale-${s.id}`,
          time: s.created_at ? s.created_at.slice(11, 16) : "12:00",
          voucherType: "Sale",
          voucherNo: s.invoice_number || `INV-${s.id?.slice(0, 6)}`,
          particulars: `To Sales A/c - ${s.customer_name || "Cash Customer"}`,
          debit: amt, // Cash/Bank inflow (Debit)
          credit: 0,
          paymentMode: s.payment_method || "Cash",
        });
        totalDebit += amt;
      }
    });

    // Purchases on daybookDate (Purchases Debit, Cash/Bank Credit)
    allPurchases.forEach((p: any) => {
      const pDate = (p.date || p.created_at || "").slice(0, 10);
      if (pDate === selectedDateStr) {
        const amt = Number(p.amount_paid || p.total_amount || 0);
        entries.push({
          id: `pur-${p.id}`,
          time: p.created_at ? p.created_at.slice(11, 16) : "12:00",
          voucherType: "Purchase",
          voucherNo: p.bill_number || `BILL-${p.id?.slice(0, 6)}`,
          particulars: `By Purchases A/c - ${p.vendor_name || "Vendor"}`,
          debit: 0,
          credit: amt, // Cash/Bank outflow (Credit)
          paymentMode: p.payment_method || "Cash",
        });
        totalCredit += amt;
      }
    });

    // Expenses on daybookDate (Expense Debit, Cash/Bank Credit)
    allExpenses.forEach((e: any) => {
      const eDate = (e.date || e.created_at || "").slice(0, 10);
      if (eDate === selectedDateStr) {
        const amt = Number(e.amount || 0);
        entries.push({
          id: `exp-${e.id}`,
          time: e.created_at ? e.created_at.slice(11, 16) : "12:00",
          voucherType: "Expense",
          voucherNo: `EXP-${e.id?.slice(0, 6)}`,
          particulars: `By ${e.categories?.name || e.category || "Expense"} A/c - ${e.title || ""}`,
          debit: 0,
          credit: amt,
          paymentMode: e.payment_method || "Cash",
        });
        totalCredit += amt;
      }
    });

    return {
      date: selectedDateStr,
      entries,
      totalDebit,
      totalCredit,
      netCashMovement: totalDebit - totalCredit,
    };
  }, [allSales, allPurchases, allExpenses, daybookDate]);

  // =========================================================================
  // 5. ALL TRANSACTIONS (Master Audit Journal)
  // =========================================================================
  const allTransactions = useMemo(() => {
    const list: {
      id: string;
      date: string;
      type: "Sale" | "Purchase" | "Expense" | "Lent" | "Borrowed";
      reference: string;
      partyName: string;
      category: string;
      paymentMode: string;
      amount: number;
      status: string;
    }[] = [];

    filteredSales.forEach((s: any) => {
      list.push({
        id: `sale-${s.id}`,
        date: (s.date || s.created_at || "").slice(0, 10),
        type: "Sale",
        reference: s.invoice_number || `INV-${s.id?.slice(0, 6)}`,
        partyName: s.customer_name || "Cash Customer",
        category: "Sales Revenue",
        paymentMode: s.payment_method || "Cash",
        amount: Number(s.total_amount || 0),
        status: s.status || "completed",
      });
    });

    filteredPurchases.forEach((p: any) => {
      list.push({
        id: `pur-${p.id}`,
        date: (p.date || p.created_at || "").slice(0, 10),
        type: "Purchase",
        reference: p.bill_number || `BILL-${p.id?.slice(0, 6)}`,
        partyName: p.vendor_name || "Vendor",
        category: "Inventory Purchase",
        paymentMode: p.payment_method || "Bank",
        amount: Number(p.total_amount || 0),
        status: p.status || "completed",
      });
    });

    filteredExpenses.forEach((e: any) => {
      list.push({
        id: `exp-${e.id}`,
        date: (e.date || e.created_at || "").slice(0, 10),
        type: "Expense",
        reference: `EXP-${e.id?.slice(0, 6)}`,
        partyName: e.vendor_name || "Direct Expense",
        category: e.categories?.name || e.category || "Operating Expense",
        paymentMode: e.payment_method || "Cash",
        amount: Number(e.amount || 0),
        status: "paid",
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredSales, filteredPurchases, filteredExpenses]);

  // =========================================================================
  // 6. CASH FLOW STATEMENT (Direct Method AS-3)
  // =========================================================================
  const cashFlow = useMemo(() => {
    // 1. Operating Activities
    let cashFromCustomers = 0;
    filteredSales.forEach((s: any) => {
      cashFromCustomers += Number(s.amount_paid || 0);
    });

    let cashPaidToSuppliers = 0;
    filteredPurchases.forEach((p: any) => {
      cashPaidToSuppliers += Number(p.amount_paid || 0);
    });

    let cashPaidForExpenses = 0;
    filteredExpenses.forEach((e: any) => {
      cashPaidForExpenses += Number(e.amount || 0);
    });

    const netOperatingCashFlow = cashFromCustomers - (cashPaidToSuppliers + cashPaidForExpenses);

    // 2. Financing Activities
    let borrowingsReceived = 0;
    allBorrowed.forEach((b: any) => {
      borrowingsReceived += Number(b.amount || 0);
    });

    let loansDisbursed = 0;
    allLent.forEach((l: any) => {
      loansDisbursed += Number(l.amount || 0);
    });

    const netFinancingCashFlow = borrowingsReceived - loansDisbursed;
    const netCashChange = netOperatingCashFlow + netFinancingCashFlow;

    return {
      cashFromCustomers,
      cashPaidToSuppliers,
      cashPaidForExpenses,
      netOperatingCashFlow,
      borrowingsReceived,
      loansDisbursed,
      netFinancingCashFlow,
      netCashChange,
    };
  }, [filteredSales, filteredPurchases, filteredExpenses, allBorrowed, allLent]);

  // =========================================================================
  // 7. TRIAL BALANCE (Self-Balancing Double Entry)
  // =========================================================================
  const trialBalance = useMemo(() => {
    const items: { accountName: string; accountType: "Asset" | "Liability" | "Income" | "Expense" | "Equity"; debit: number; credit: number }[] = [];

    // Revenue from Sales (Credit)
    const salesRev = filteredSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    if (salesRev > 0) {
      items.push({ accountName: "Sales Revenue Account", accountType: "Income", debit: 0, credit: salesRev });
    }

    // Purchases (Debit)
    const purCost = filteredPurchases.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);
    if (purCost > 0) {
      items.push({ accountName: "Purchases Account", accountType: "Expense", debit: purCost, credit: 0 });
    }

    // Direct & Operating Expenses (Debit)
    const expTotal = filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    if (expTotal > 0) {
      items.push({ accountName: "Operating Expenses Account", accountType: "Expense", debit: expTotal, credit: 0 });
    }

    // Sundry Debtors (Receivables from Customers) -> Debit
    const sundryDebtors = receivablesAging.totalOutstanding;
    if (sundryDebtors > 0) {
      items.push({ accountName: "Sundry Debtors (Receivables)", accountType: "Asset", debit: sundryDebtors, credit: 0 });
    }

    // Sundry Creditors (Payables to Suppliers) -> Credit
    let sundryCreditors = 0;
    allPurchases.forEach((p: any) => {
      const bal =
        p.balance_due !== undefined && p.balance_due !== null
          ? Number(p.balance_due)
          : Number(p.total_amount || 0) - Number(p.amount_paid || 0);
      if (bal > 0) sundryCreditors += bal;
    });
    if (sundryCreditors > 0) {
      items.push({ accountName: "Sundry Creditors (Payables)", accountType: "Liability", debit: 0, credit: sundryCreditors });
    }

    // Closing Stock Valuation -> Asset (Debit)
    let closingStockVal = 0;
    allProducts.forEach((prod: any) => {
      const qty = Math.max(0, Number(prod.current_stock || prod.stock_quantity || 0));
      const cost = Number(prod.cost_price || prod.purchase_price || 0);
      closingStockVal += qty * cost;
    });
    if (closingStockVal > 0) {
      items.push({ accountName: "Stock in Hand (Inventory)", accountType: "Asset", debit: closingStockVal, credit: 0 });
    }

    // Estimated Cash & Bank Balance -> Asset (Debit)
    const cashIn = allSales.reduce((acc, s) => acc + Number(s.amount_paid || 0), 0);
    const cashOut =
      allPurchases.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0) +
      allExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const cashBalance = Math.max(0, cashIn - cashOut);
    if (cashBalance > 0) {
      items.push({ accountName: "Cash & Bank Balances", accountType: "Asset", debit: cashBalance, credit: 0 });
    }

    // Loans Borrowed (Credit) & Loans Lent (Debit)
    const totBorrowed = allBorrowed.reduce((acc, b) => acc + Number(b.amount || 0), 0);
    if (totBorrowed > 0) {
      items.push({ accountName: "Loans & Borrowings", accountType: "Liability", debit: 0, credit: totBorrowed });
    }

    const totLent = allLent.reduce((acc, l) => acc + Number(l.amount || 0), 0);
    if (totLent > 0) {
      items.push({ accountName: "Loans & Advances Given", accountType: "Asset", debit: totLent, credit: 0 });
    }

    // Balancing Capital Account
    let totalDebit = items.reduce((acc, it) => acc + it.debit, 0);
    let totalCredit = items.reduce((acc, it) => acc + it.credit, 0);
    const diff = totalDebit - totalCredit;

    if (diff > 0) {
      items.push({ accountName: "Proprietor's Capital Account", accountType: "Equity", debit: 0, credit: diff });
      totalCredit += diff;
    } else if (diff < 0) {
      items.push({ accountName: "Proprietor's Capital Drawings", accountType: "Equity", debit: Math.abs(diff), credit: 0 });
      totalDebit += Math.abs(diff);
    }

    return {
      items,
      totalDebit,
      totalCredit,
      isBalanced: Math.round(totalDebit) === Math.round(totalCredit),
    };
  }, [filteredSales, filteredPurchases, filteredExpenses, receivablesAging, allPurchases, allProducts, allSales, allBorrowed, allLent]);

  // =========================================================================
  // 8. BALANCE SHEET (Schedule III)
  // =========================================================================
  const balanceSheet = useMemo(() => {
    // Current Assets
    const debtors = receivablesAging.totalOutstanding;
    let inventoryCost = 0;
    allProducts.forEach((p: any) => {
      const q = Math.max(0, Number(p.current_stock || p.stock_quantity || 0));
      const c = Number(p.cost_price || p.purchase_price || 0);
      inventoryCost += q * c;
    });

    const cashIn = allSales.reduce((acc, s) => acc + Number(s.amount_paid || 0), 0);
    const cashOut =
      allPurchases.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0) +
      allExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const cashAndBank = Math.max(0, cashIn - cashOut);

    const loansGiven = allLent.reduce((acc, l) => acc + Number(l.amount || 0), 0);

    const currentAssets = {
      "Cash and Bank Balance": cashAndBank,
      "Trade Receivables (Sundry Debtors)": debtors,
      "Inventories (Stock at Cost)": inventoryCost,
      "Short-term Loans & Advances": loansGiven,
    };
    const totalCurrentAssets = Object.values(currentAssets).reduce((a, b) => a + b, 0);

    const nonCurrentAssets = {
      "Fixed Assets & Equipment": 0,
    };
    const totalNonCurrentAssets = Object.values(nonCurrentAssets).reduce((a, b) => a + b, 0);
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    // Current Liabilities
    let creditors = 0;
    allPurchases.forEach((p: any) => {
      const bal =
        p.balance_due !== undefined && p.balance_due !== null
          ? Number(p.balance_due)
          : Number(p.total_amount || 0) - Number(p.amount_paid || 0);
      if (bal > 0) creditors += bal;
    });

    // GST Payable
    const outputGst = allSales.reduce((acc, s) => acc + Number(s.tax_amount || s.gst_amount || 0), 0);
    const inputGst = allPurchases.reduce(
      (acc, p) => acc + Number(p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0),
      0
    );
    const gstPayable = Math.max(0, outputGst - inputGst);

    const currentLiabilities = {
      "Trade Payables (Sundry Creditors)": creditors,
      "Statutory GST Liability": gstPayable,
    };
    const totalCurrentLiabilities = Object.values(currentLiabilities).reduce((a, b) => a + b, 0);

    const loansPayable = allBorrowed.reduce((acc, b) => acc + Number(b.amount || 0), 0);
    const nonCurrentLiabilities = {
      "Secured & Unsecured Loans": loansPayable,
    };
    const totalNonCurrentLiabilities = Object.values(nonCurrentLiabilities).reduce((a, b) => a + b, 0);
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

    // Equity
    const periodProfit = profitAndLoss.netProfitBeforeTax;
    const proprietorCapital = Math.max(0, totalAssets - totalLiabilities - periodProfit);
    const totalEquity = proprietorCapital + periodProfit;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      currentAssets,
      totalCurrentAssets,
      nonCurrentAssets,
      totalNonCurrentAssets,
      totalAssets,
      currentLiabilities,
      totalCurrentLiabilities,
      nonCurrentLiabilities,
      totalNonCurrentLiabilities,
      totalLiabilities,
      proprietorCapital,
      periodProfit,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced: Math.round(totalAssets) === Math.round(totalLiabilitiesAndEquity),
    };
  }, [receivablesAging, allProducts, allSales, allPurchases, allExpenses, allLent, allBorrowed, profitAndLoss]);

  // =========================================================================
  // 9. GST SLAB-WISE REPORT (0%, 5%, 12%, 18%, 28%)
  // =========================================================================
  const gstSlabReport = useMemo(() => {
    const slabs: Record<string, { rate: number; taxableValue: number; cgst: number; sgst: number; igst: number; totalTax: number; invoiceCount: number }> = {
      "0%": { rate: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
      "5%": { rate: 5, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
      "12%": { rate: 12, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
      "18%": { rate: 18, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
      "28%": { rate: 28, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 },
    };

    filteredSales.forEach((s: any) => {
      const items = Array.isArray(s.items) ? s.items : [];
      if (items.length > 0) {
        items.forEach((it: any) => {
          const rate = Number(it.tax_rate || it.gst_rate || 18);
          const key = `${rate}%`;
          if (!slabs[key]) {
            slabs[key] = { rate, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, invoiceCount: 0 };
          }
          const price = Number(it.price || 0);
          const qty = Number(it.quantity || 1);
          const itemVal = price * qty;
          const taxable = itemVal / (1 + rate / 100);
          const tax = itemVal - taxable;

          slabs[key].taxableValue += taxable;
          slabs[key].cgst += tax / 2;
          slabs[key].sgst += tax / 2;
          slabs[key].totalTax += tax;
          slabs[key].invoiceCount++;
        });
      } else {
        // Fallback to invoice totals at 18% standard rate
        const total = Number(s.total_amount || 0);
        const taxable = total / 1.18;
        const tax = total - taxable;
        slabs["18%"].taxableValue += taxable;
        slabs["18%"].cgst += tax / 2;
        slabs["18%"].sgst += tax / 2;
        slabs["18%"].totalTax += tax;
        slabs["18%"].invoiceCount++;
      }
    });

    return Object.values(slabs);
  }, [filteredSales]);

  // =========================================================================
  // 10. STOCK VALUATION & ITEM P&L SUMMARY
  // =========================================================================
  const stockSummary = useMemo(() => {
    let totalStockQty = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;

    const items = allProducts.map((p: any) => {
      const qty = Math.max(0, Number(p.current_stock || p.stock_quantity || 0));
      const cost = Number(p.cost_price || p.purchase_price || 0);
      const price = Number(p.price || p.selling_price || 0);
      const minStock = Number(p.min_stock_level || 5);

      const totalCost = qty * cost;
      const totalRetail = qty * price;
      const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;

      totalStockQty += qty;
      totalCostValuation += totalCost;
      totalRetailValuation += totalRetail;

      const isLow = qty <= minStock;
      if (isLow) lowStockCount++;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku || p.barcode || "-",
        hsn: p.hsn_code || "-",
        category: p.category || "General",
        currentStock: qty,
        minStockLevel: minStock,
        costPrice: cost,
        sellingPrice: price,
        totalCost,
        totalRetail,
        marginPct,
        status: qty === 0 ? "Out of Stock" : isLow ? "Low Stock" : "In Stock",
      };
    });

    return {
      items,
      totalProducts: allProducts.length,
      totalStockQty,
      totalCostValuation,
      totalRetailValuation,
      potentialGrossProfit: totalRetailValuation - totalCostValuation,
      lowStockCount,
    };
  }, [allProducts]);

  // Item-wise Profit & Loss
  const itemWiseProfit = useMemo(() => {
    const itemMap = new Map<
      string,
      {
        name: string;
        unitsSold: number;
        revenue: number;
        cost: number;
        profit: number;
        marginPct: number;
      }
    >();

    filteredSales.forEach((s: any) => {
      const items = Array.isArray(s.items) ? s.items : [];
      items.forEach((it: any) => {
        const name = it.name || "Custom Item";
        const qty = Number(it.quantity || 1);
        const price = Number(it.price || 0);
        let costPrice = Number(it.cost_price || 0);
        if (!costPrice) costPrice = productCostMap.get(name.toLowerCase().trim()) || 0;

        const rev = qty * price;
        const totalCost = qty * costPrice;

        if (!itemMap.has(name)) {
          itemMap.set(name, {
            name,
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            marginPct: 0,
          });
        }

        const entry = itemMap.get(name)!;
        entry.unitsSold += qty;
        entry.revenue += rev;
        entry.cost += totalCost;
        entry.profit += rev - totalCost;
        entry.marginPct = entry.revenue > 0 ? (entry.profit / entry.revenue) * 100 : 0;
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => b.profit - a.profit);
  }, [filteredSales, productCostMap]);

  // =========================================================================
  // 11. FINANCIAL HEALTH & SOLVENCY RATIOS
  // =========================================================================
  const financialHealth = useMemo(() => {
    const currentAssets = balanceSheet.totalCurrentAssets;
    const currentLiab = balanceSheet.totalCurrentLiabilities;
    const inventory = stockSummary.totalCostValuation;

    const workingCapital = currentAssets - currentLiab;
    const currentRatio = currentLiab > 0 ? currentAssets / currentLiab : currentAssets > 0 ? 99 : 0;
    const quickRatio = currentLiab > 0 ? (currentAssets - inventory) / currentLiab : 0;

    const totalDebt = balanceSheet.totalLiabilities;
    const totalEquity = Math.max(1, balanceSheet.totalEquity);
    const debtToEquity = totalDebt / totalEquity;

    // Monthly burn rate based on indirect expenses
    const monthlyBurn = Math.max(1, profitAndLoss.indirectExpensesTotal);
    const cashAvailable = Object.values(balanceSheet.currentAssets)[0] || 0;
    const cashRunwayMonths = cashAvailable > 0 ? cashAvailable / monthlyBurn : 0;

    return {
      workingCapital,
      currentRatio,
      quickRatio,
      debtToEquity,
      cashRunwayMonths,
      cashAvailable,
    };
  }, [balanceSheet, stockSummary, profitAndLoss]);

  return {
    // State
    periodPreset,
    setPeriodPreset,
    customRange,
    setCustomRange,
    activeDateRange,
    daybookDate,
    setDaybookDate,
    isLoading,
    refetchAll,

    // Raw datasets
    profile,
    allSales,
    allPurchases,
    allExpenses,
    allProducts,
    allParties,
    filteredSales,
    filteredPurchases,
    filteredExpenses,

    // CA Reports
    profitAndLoss,
    billWiseProfit,
    receivablesAging,
    daybook,
    allTransactions,
    cashFlow,
    trialBalance,
    balanceSheet,
    gstSlabReport,
    stockSummary,
    itemWiseProfit,
    financialHealth,
  };
}
