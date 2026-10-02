import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { toast } from "sonner";
import {
  Party,
  Sale,
  LedgerEntry,
  LoyaltyConfig,
  CustomerLoyaltyData,
  Tier,
  MonthlyTrendItem,
  DEFAULT_LOYALTY_CONFIG,
} from "../types";

export function useLoyaltyData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------
  // Config (kept local — it's a per-device UI preference, not customer data)
  // ---------------------------------------------------------------------
  const [config, setConfig] = useState<LoyaltyConfig>(() => {
    if (!user?.id) return DEFAULT_LOYALTY_CONFIG;
    const saved = localStorage.getItem(`loyalty_config_${user.id}`);
    if (saved) {
      try {
        return { ...DEFAULT_LOYALTY_CONFIG, ...JSON.parse(saved) };
      } catch {
        /* corrupt value, fall through to defaults */
      }
    }
    return DEFAULT_LOYALTY_CONFIG;
  });

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`loyalty_config_${user.id}`, JSON.stringify(config));
    }
  }, [config, user?.id]);

  // ---------------------------------------------------------------------
  // Legacy localStorage adjustments — only used as a fallback if the
  // loyalty_ledger table hasn't been migrated in yet (see loyalty_ledger.sql)
  // ---------------------------------------------------------------------
  const [legacyAdjustments, setLegacyAdjustments] = useState<Record<string, number>>(() => {
    if (!user?.id) return {};
    const saved = localStorage.getItem(`loyalty_points_adjustments_${user.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore corrupt value */
      }
    }
    return {};
  });

  const saveLegacyAdjustment = (partyId: string, delta: number) => {
    const next = { ...legacyAdjustments, [partyId]: (legacyAdjustments[partyId] || 0) + delta };
    setLegacyAdjustments(next);
    if (user?.id) {
      localStorage.setItem(`loyalty_points_adjustments_${user.id}`, JSON.stringify(next));
    }
  };

  // ---------------------------------------------------------------------
  // Data Queries
  // ---------------------------------------------------------------------
  const { data: parties = [], isLoading: loadingParties } = useQuery({
    queryKey: ["parties", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("parties")
        .select("*")
        .eq("user_id", user?.id || "");
      if (error) throw error;
      return data as Party[];
    },
    enabled: !!user,
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales")
        .select("id, customer_name, customer_phone, total_amount, date")
        .eq("user_id", user?.id || "");
      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id || "")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const {
    data: ledgerEntries = [],
    isLoading: loadingLedger,
    isError: ledgerUnavailable,
  } = useQuery({
    queryKey: ["loyalty_ledger", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("loyalty_ledger")
        .select("*")
        .eq("user_id", user?.id || "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LedgerEntry[];
    },
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
    if (ledgerUnavailable) {
      toast.warning("Loyalty ledger table not found — using local fallback. Run loyalty_ledger.sql to enable synced, auditable history.", {
        id: "ledger-fallback-warning",
        duration: 6000,
      });
    }
  }, [ledgerUnavailable]);

  const addLedgerEntryMutation = useMutation({
    mutationFn: async (entry: { party_id: string; type: LedgerEntry["type"]; points: number; reason: string }) => {
      const { error } = await (supabase as any).from("loyalty_ledger").insert({
        user_id: user?.id,
        party_id: entry.party_id,
        type: entry.type,
        points: entry.points,
        reason: entry.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty_ledger", user?.id] });
    },
  });

  // ---------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------
  const customers = useMemo(() => parties.filter((p) => p.type === "customer" || p.type === "both"), [parties]);

  const ledgerByParty = useMemo(() => {
    const map = new Map<string, LedgerEntry[]>();
    for (const entry of ledgerEntries) {
      const list = map.get(entry.party_id) || [];
      list.push(entry);
      map.set(entry.party_id, list);
    }
    return map;
  }, [ledgerEntries]);

  const customerLoyaltyData = useMemo<CustomerLoyaltyData[]>(() => {
    return customers.map((customer) => {
      const matches = sales.filter(
        (s) =>
          s.customer_name?.toLowerCase() === customer.name.toLowerCase() ||
          (customer.phone && s.customer_phone === customer.phone)
      );

      const totalSpent = matches.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const visitCount = matches.length;

      let calculatedPoints = 0;
      if (config.enabled && config.pointsPerUnit > 0) {
        calculatedPoints = Math.floor(totalSpent / config.pointsPerUnit);
      }

      const manualDelta = ledgerUnavailable
        ? legacyAdjustments[customer.id] || 0
        : (ledgerByParty.get(customer.id) || []).reduce((sum, e) => sum + e.points, 0);

      const finalPoints = Math.max(0, calculatedPoints + manualDelta);

      let lastPurchaseDate: Date | null = null;
      if (matches.length > 0) {
        const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastPurchaseDate = new Date(sorted[0].date);
      }

      let tier: Tier = "Bronze";
      if (totalSpent >= config.vipThreshold) {
        tier = "Gold";
      } else if (totalSpent >= config.vipThreshold / 2) {
        tier = "Silver";
      }

      const nextThreshold = tier === "Gold" ? null : tier === "Silver" ? config.vipThreshold : config.vipThreshold / 2;
      const tierProgress = nextThreshold ? Math.min(100, (totalSpent / nextThreshold) * 100) : 100;

      return {
        ...customer,
        totalSpent,
        visitCount,
        points: finalPoints,
        lastPurchaseDate,
        tier,
        tierProgress,
        nextThreshold,
      };
    });
  }, [customers, sales, config, ledgerByParty, legacyAdjustments, ledgerUnavailable]);

  const totalPointsIssued = useMemo(() => customerLoyaltyData.reduce((sum, c) => sum + c.points, 0), [customerLoyaltyData]);
  const vipCount = useMemo(() => customerLoyaltyData.filter((c) => c.tier === "Gold").length, [customerLoyaltyData]);
  const returningCustomerRate = useMemo(() => {
    if (customerLoyaltyData.length === 0) return "0.0";
    return ((customerLoyaltyData.filter((c) => c.visitCount > 1).length / customerLoyaltyData.length) * 100).toFixed(1);
  }, [customerLoyaltyData]);

  // Monthly spend trend for the analytics chart (last 6 months)
  const monthlyTrend = useMemo<MonthlyTrendItem[]>(() => {
    const months: MonthlyTrendItem[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: "short" }), spend: 0 });
    }
    const monthMap = new Map(months.map((m) => [m.key, m]));
    for (const s of sales) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = monthMap.get(key);
      if (entry) entry.spend += Number(s.total_amount || 0);
    }
    return months;
  }, [sales]);

  return {
    config,
    setConfig,
    profile,
    parties,
    sales,
    loadingParties,
    loadingSales,
    loadingLedger,
    ledgerUnavailable,
    ledgerByParty,
    customerLoyaltyData,
    totalPointsIssued,
    vipCount,
    returningCustomerRate,
    monthlyTrend,
    addLedgerEntryMutation,
    saveLegacyAdjustment,
  };
}
