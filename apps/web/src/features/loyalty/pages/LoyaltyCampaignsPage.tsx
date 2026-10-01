import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Sparkles,
  Gift,
  Send,
  Users,
  Settings2,
  Coins,
  Search,
  Award,
  PlusCircle,
  MinusCircle,
  ChevronRight,
  Info,
  Download,
  ArrowUpDown,
  History,
  Loader2,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Party {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

interface Sale {
  id: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  date: string;
}

interface LedgerEntry {
  id: string;
  user_id: string;
  party_id: string;
  type: "manual_add" | "manual_deduct" | "redeem";
  points: number;
  reason: string | null;
  created_at: string;
}

interface LoyaltyConfig {
  enabled: boolean;
  pointsPerUnit: number; // e.g. 1 point per 100 currency units spent
  pointValue: number; // e.g. 1 point = ₹1 discount
  vipThreshold: number; // e.g. ₹5,000 spent for VIP tier
  pointsExpiryDays: number; // 0 = never expire
}

type Tier = "Bronze" | "Silver" | "Gold";
type Segment = "all" | "slipping" | "vip" | "new";
type SortKey = "name" | "points" | "totalSpent" | "lastPurchase";
type SortDir = "asc" | "desc";

const DEFAULT_CONFIG: LoyaltyConfig = {
  enabled: true,
  pointsPerUnit: 100,
  pointValue: 1,
  vipThreshold: 5000,
  pointsExpiryDays: 0,
};

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Small utility hooks
// ---------------------------------------------------------------------------

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoyaltyCampaigns() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "ledger" | "campaigns" | "settings">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [selectedSegment, setSelectedSegment] = useState<Segment>("all");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Manual adjustment dialog
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; currentPoints: number } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [adjustReason, setAdjustReason] = useState("");

  // History dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<{ id: string; name: string } | null>(null);

  // Bulk send progress
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0 });

  // WhatsApp campaign builder
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);
  const [customPromoCode, setCustomPromoCode] = useState("RUPEEBILL10");

  // ---------------------------------------------------------------------
  // Config (kept local — it's a per-device UI preference, not customer data)
  // ---------------------------------------------------------------------
  const [config, setConfig] = useState<LoyaltyConfig>(() => {
    if (!user?.id) return DEFAULT_CONFIG;
    const saved = localStorage.getItem(`loyalty_config_${user.id}`);
    if (saved) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch {
        /* corrupt value, fall through to defaults */
      }
    }
    return DEFAULT_CONFIG;
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
  // Data
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

  // Real, DB-backed ledger. If the table hasn't been created yet
  // (see loyalty_ledger.sql), this query fails once, we notice, and we
  // transparently fall back to the legacy localStorage adjustments so the
  // page never breaks — it just nudges you to run the migration.
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

  const customerLoyaltyData = useMemo(() => {
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

      // Prefer the real ledger; fall back to legacy localStorage adjustments
      // only when the ledger table isn't available yet.
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
  const monthlyTrend = useMemo(() => {
    const months: { key: string; label: string; spend: number }[] = [];
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

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const segmentFilter = useCallback(
    (c: (typeof customerLoyaltyData)[number]) => {
      if (selectedSegment === "vip") return c.tier === "Gold";
      if (selectedSegment === "slipping") {
        if (c.lastPurchaseDate) return c.lastPurchaseDate < thirtyDaysAgo;
        return new Date(c.created_at) < thirtyDaysAgo;
      }
      if (selectedSegment === "new") return new Date(c.created_at) >= sevenDaysAgo;
      return true;
    },
    [selectedSegment, thirtyDaysAgo, sevenDaysAgo]
  );

  const filteredCustomers = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    let result = customerLoyaltyData.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term));
      return matchesSearch && segmentFilter(c);
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "points":
          cmp = a.points - b.points;
          break;
        case "totalSpent":
          cmp = a.totalSpent - b.totalSpent;
          break;
        case "lastPurchase":
          cmp = (a.lastPurchaseDate?.getTime() || 0) - (b.lastPurchaseDate?.getTime() || 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [customerLoyaltyData, debouncedSearch, segmentFilter, sortKey, sortDir]);

  // Reset to page 1 whenever the filtered set changes shape
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedSegment, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const pagedCustomers = filteredCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // ---------------------------------------------------------------------
  // Selection (bulk actions)
  // ---------------------------------------------------------------------

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const visibleIds = filteredCustomers.map((c) => c.id);
      const allSelected = visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // ---------------------------------------------------------------------
  // Manual point adjustments
  // ---------------------------------------------------------------------

  const handleApplyAdjustment = async () => {
    if (!selectedCustomer || adjustAmount <= 0) return;

    const signedAmount = adjustType === "add" ? adjustAmount : -adjustAmount;
    const entryType: LedgerEntry["type"] =
      adjustType === "add" ? "manual_add" : adjustAmount === selectedCustomer.currentPoints ? "redeem" : "manual_deduct";

    if (ledgerUnavailable) {
      saveLegacyAdjustment(selectedCustomer.id, signedAmount);
      toast.success(`Adjusted points for ${selectedCustomer.name}`);
    } else {
      try {
        await addLedgerEntryMutation.mutateAsync({
          party_id: selectedCustomer.id,
          type: entryType,
          points: signedAmount,
          reason: adjustReason.trim(),
        });
        toast.success(`Adjusted points for ${selectedCustomer.name}`);
      } catch (err) {
        toast.error("Couldn't save the adjustment. Please try again.");
        return;
      }
    }

    setAdjustmentDialogOpen(false);
    setSelectedCustomer(null);
    setAdjustAmount(0);
    setAdjustReason("");
  };

  // ---------------------------------------------------------------------
  // WhatsApp campaigns
  // ---------------------------------------------------------------------

  const storeLink = profile?.business_name
    ? `${window.location.origin}/store/${profile.business_name.toLowerCase().replace(/\s+/g, "-")}`
    : `${window.location.origin}/storefront`;

  const campaignTemplates = [
    {
      title: "Reward point balance reminder",
      icon: Coins,
      getBody: (name: string, points: number, value: number) =>
        `Hey ${name}! You have accumulated ${points} reward points (valued at ${formatCurrency(value)}) in your loyalty wallet at ${
          profile?.business_name || "our shop"
        }. Redeem them on your next visit or check our storefront: ${storeLink}`,
    },
    {
      title: "We miss you — retention offer",
      icon: Gift,
      getBody: (name: string) =>
        `Hello ${name}! We haven't seen you in a while at ${
          profile?.business_name || "our shop"
        }. Enjoy 10% off your next purchase with code ${customPromoCode}. Browse our catalog online: ${storeLink}`,
    },
    {
      title: "Exclusive VIP reward invite",
      icon: Award,
      getBody: (name: string, points: number, value: number) =>
        `Dear ${name}, as one of our valued VIP Gold members at ${
          profile?.business_name || "our shop"
        }, enjoy early access to our premium items. You have ${points} points (${formatCurrency(value)}) ready to redeem. Order here: ${storeLink}`,
    },
  ];

  const buildWhatsAppUrl = (customerName: string, phone: string, points: number) => {
    const value = points * config.pointValue;
    const message = campaignTemplates[selectedTemplate].getBody(customerName, points, value);
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const handleSendWhatsApp = (customerName: string, phone: string, points: number) => {
    if (!phone) {
      toast.error("This customer doesn't have a phone number configured.");
      return;
    }
    window.open(buildWhatsAppUrl(customerName, phone, points), "_blank");
    toast.success(`WhatsApp compose opened for ${customerName}`);
  };

  const handleBulkSend = async () => {
    const targets = filteredCustomers.filter((c) => selectedIds.has(c.id) && c.phone);
    const skipped = filteredCustomers.filter((c) => selectedIds.has(c.id) && !c.phone).length;

    if (targets.length === 0) {
      toast.error("None of the selected customers have a phone number on file.");
      return;
    }

    setBulkSending(true);
    setBulkProgress({ sent: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      const c = targets[i];
      window.open(buildWhatsAppUrl(c.name, c.phone as string, c.points), "_blank");
      setBulkProgress({ sent: i + 1, total: targets.length });
      // Small delay so the browser doesn't treat this as a popup-spam burst
      if (i < targets.length - 1) await sleep(900);
    }

    setBulkSending(false);
    toast.success(`Opened WhatsApp for ${targets.length} customer${targets.length === 1 ? "" : "s"}${skipped ? ` — skipped ${skipped} without a phone number` : ""}`);
  };

  // ---------------------------------------------------------------------
  // CSV export
  // ---------------------------------------------------------------------

  const handleExportCsv = () => {
    const rows = [
      ["Name", "Phone", "Tier", "Points", "Redeemable value", "Total spent", "Last visit"],
      ...filteredCustomers.map((c) => [
        c.name,
        c.phone || "",
        c.tier,
        String(c.points),
        String((c.points * config.pointValue).toFixed(2)),
        String(c.totalSpent.toFixed(2)),
        c.lastPurchaseDate ? c.lastPurchaseDate.toISOString().slice(0, 10) : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loyalty-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ledger exported");
  };

  // ---------------------------------------------------------------------
  // Shared UI bits
  // ---------------------------------------------------------------------

  const tierBadgeClass = (tier: Tier) =>
    tier === "Gold"
      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 border-amber-300"
      : tier === "Silver"
      ? "bg-slate-100 dark:bg-slate-800 text-slate-700 border-slate-300"
      : "bg-orange-100 dark:bg-orange-950/20 text-orange-700 border-orange-200";

  const TierProgressBar = ({ c }: { c: (typeof customerLoyaltyData)[number] }) => (
    <div className="w-24">
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${c.tier === "Gold" ? "bg-amber-400" : c.tier === "Silver" ? "bg-slate-400" : "bg-orange-400"}`}
          style={{ width: `${c.tierProgress}%` }}
        />
      </div>
      <p className="text-[9px] text-slate-400 mt-0.5">
        {c.tier === "Gold" ? "Top tier" : `${formatCurrency(Math.max(0, (c.nextThreshold || 0) - c.totalSpent))} to next`}
      </p>
    </div>
  );

  const SortHeader = ({ label, sortableKey }: { label: string; sortableKey: SortKey }) => (
    <button
      onClick={() => toggleSort(sortableKey)}
      className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === sortableKey ? "text-primary" : "text-slate-300"}`} />
    </button>
  );

  const historyEntries = historyCustomer ? ledgerByParty.get(historyCustomer.id) || [] : [];

  return (
    <AppLayout>
      <div className="px-4 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto animate-fade-in font-display text-[11px]">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-primary font-semibold text-[10px] uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-violet-500 fill-violet-500/20" /> Loyalty & Retention Hub
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Customer Campaigns</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Increase repeat visits with reward points and WhatsApp marketing.
            </p>
          </div>

          <div className="flex items-center p-1 bg-white border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            {(["overview", "ledger", "campaigns", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all capitalize ${
                  activeTab === tab
                    ? "bg-primary text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200"
                }`}
              >
                {tab === "ledger" ? "Rewards Ledger" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-lg">
                    <Coins className="w-4 h-4" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                    Point Pool
                  </Badge>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total Points Issued</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{totalPointsIssued.toLocaleString()} pts</h3>
                <p className="text-[10px] text-slate-400 mt-1.5">Active currency circulating in rewards wallet</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Gift className="w-4 h-4" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Liability
                  </Badge>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Redeemable Discount</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalPointsIssued * config.pointValue)}</h3>
                <p className="text-[10px] text-slate-400 mt-1.5">Point value rate of {formatCurrency(config.pointValue)}/pt</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Users className="w-4 h-4" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    Retention
                  </Badge>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Returning Customer Rate</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{returningCustomerRate}%</h3>
                <p className="text-[10px] text-slate-400 mt-1.5">Customers with more than 1 transaction</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Award className="w-4 h-4" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    Tiers
                  </Badge>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">VIP Gold Customers</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{vipCount}</h3>
                <p className="text-[10px] text-slate-400 mt-1.5">Spent more than {formatCurrency(config.vipThreshold)}</p>
              </div>
            </div>

            {/* Analytics: spend trend */}
            <div className="bg-white dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h4 className="text-xs font-semibold mb-3">Customer Spend Trend (6 months)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={48} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                    <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-violet-500/10 p-6 rounded-2xl border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary fill-primary/20" /> How Rewards Boost Your Business
                </h4>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Loyalty rewards give customers a reason to choose your counter over competitors. Earning 1 point per{" "}
                  {formatCurrency(config.pointsPerUnit)} spent creates a habit of returning. Paired with WhatsApp campaigns,
                  you can proactively re-engage customers who've gone quiet.
                </p>
              </div>
              <Button onClick={() => setActiveTab("campaigns")} className="rounded-full shadow-lg h-8 px-4 text-[11px] hover:scale-105 transition-all">
                Launch WhatsApp Campaign <ChevronRight className="ml-1 w-3 h-3" />
              </Button>
            </div>

            <div className="bg-white dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h4 className="text-xs font-semibold">Top Customer Loyalty Wallets</h4>
                <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={() => setActiveTab("ledger")}>
                  Manage All
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-[10px] font-semibold uppercase tracking-wide bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Customer</th>
                      <th className="px-4 py-2.5">Reward Tier</th>
                      <th className="px-4 py-2.5">Points Balance</th>
                      <th className="px-4 py-2.5 text-right">Total Business Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingParties || loadingSales ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1.5" /> Loading loyalty data...
                        </td>
                      </tr>
                    ) : customerLoyaltyData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                          Add customers in "Parties" to track loyalty!
                        </td>
                      </tr>
                    ) : (
                      [...customerLoyaltyData]
                        .sort((a, b) => b.points - a.points)
                        .slice(0, 5)
                        .map((c) => (
                          <tr key={c.id}>
                            <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                            <td className="px-4 py-2.5">
                              <Badge className={"text-[10px] " + tierBadgeClass(c.tier)} variant="outline">
                                {c.tier}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-violet-600 dark:text-violet-400">{c.points} pts</td>
                            <td className="px-4 py-2.5 font-semibold text-right">{formatCurrency(c.totalSpent)}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- REWARDS LEDGER TAB --- */}
        {activeTab === "ledger" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-[11px] rounded-lg"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="h-8 flex items-center px-2.5 text-[10px]">
                    {selectedIds.size} selected
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={handleExportCsv} className="rounded-lg text-[11px] h-8 flex-1 sm:flex-initial">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSegment("all");
                    setSearchTerm("");
                    setSelectedIds(new Set());
                  }}
                  className="rounded-lg text-[11px] h-8 flex-1 sm:flex-initial"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-[10px] font-semibold uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 w-8">
                        <Checkbox
                          checked={filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.has(c.id))}
                          onCheckedChange={toggleSelectAllVisible}
                          aria-label="Select all visible customers"
                        />
                      </th>
                      <th className="px-4 py-2.5">
                        <SortHeader label="Customer" sortableKey="name" />
                      </th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">Tier / Progress</th>
                      <th className="px-4 py-2.5">
                        <SortHeader label="Points" sortableKey="points" />
                      </th>
                      <th className="px-4 py-2.5">Value</th>
                      <th className="px-4 py-2.5">
                        <SortHeader label="Last Visit" sortableKey="lastPurchase" />
                      </th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingParties || loadingSales || loadingLedger ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1.5" /> Loading ledger data...
                        </td>
                      </tr>
                    ) : pagedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          No matching customers found.
                        </td>
                      </tr>
                    ) : (
                      pagedCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-2.5">
                            <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} aria-label={`Select ${c.name}`} />
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{c.name}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{c.phone || "No Phone"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-1">
                              <Badge className={"text-[10px] w-fit " + tierBadgeClass(c.tier)} variant="outline">
                                {c.tier}
                              </Badge>
                              <TierProgressBar c={c} />
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-violet-600 dark:text-violet-400">{c.points} pts</td>
                          <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{formatCurrency(c.points * config.pointValue)}</td>
                          <td className="px-4 py-2.5 text-slate-500">{c.lastPurchaseDate ? c.lastPurchaseDate.toLocaleDateString() : "Never"}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 rounded-md text-slate-500 hover:text-slate-800"
                                title="View history"
                                onClick={() => {
                                  setHistoryCustomer({ id: c.id, name: c.name });
                                  setHistoryDialogOpen(true);
                                }}
                              >
                                <History className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 rounded-md border-primary/30 text-primary hover:bg-primary/5 text-[10px]"
                                onClick={() => {
                                  setSelectedCustomer({ id: c.id, name: c.name, currentPoints: c.points });
                                  setAdjustType("add");
                                  setAdjustAmount(0);
                                  setAdjustReason("");
                                  setAdjustmentDialogOpen(true);
                                }}
                              >
                                Adjust
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-[10px] font-semibold"
                                onClick={() => {
                                  if (c.points <= 0) {
                                    toast.error("Customer has 0 points to redeem!");
                                    return;
                                  }
                                  setSelectedCustomer({ id: c.id, name: c.name, currentPoints: c.points });
                                  setAdjustType("deduct");
                                  setAdjustAmount(c.points);
                                  setAdjustReason("Redeemed in-store");
                                  setAdjustmentDialogOpen(true);
                                }}
                              >
                                Redeem
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredCustomers.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
                  <span>
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="px-1">
                      {page} / {totalPages}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- CAMPAIGNS TAB --- */}
        {activeTab === "campaigns" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4 lg:col-span-1">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-5">
                <h3 className="text-xs font-semibold">1. Select Campaign</h3>

                <div className="space-y-2.5">
                  {campaignTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedTemplate(i)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedTemplate === i ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-slate-200 hover:border-slate-400 bg-card"
                      }`}
                    >
                      <div className="font-semibold text-[11px] text-foreground mb-1 flex items-center gap-1.5">
                        <tpl.icon className="w-3.5 h-3.5 text-primary" />
                        {tpl.title}
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{tpl.getBody("Customer Name", 150, 150)}</p>
                    </button>
                  ))}
                </div>

                <div className="pt-3 border-t space-y-3">
                  <h3 className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Campaign Variables</h3>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Custom Promo Code (Optional)</label>
                    <Input value={customPromoCode} onChange={(e) => setCustomPromoCode(e.target.value)} className="h-8 text-[11px] rounded-lg" />
                  </div>
                </div>

                <div className="bg-violet-500/5 p-3 rounded-lg border border-violet-500/10 flex items-start gap-2.5">
                  <Info className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Messages open directly in WhatsApp web/app using each customer's saved contact number.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold">2. Target Audience</h3>
                  <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border gap-1">
                    {[
                      { id: "all", label: "All Customers" },
                      { id: "vip", label: "VIP Gold" },
                      { id: "slipping", label: "Inactive (30d+)" },
                      { id: "new", label: "New (7d)" },
                    ].map((seg) => (
                      <button
                        key={seg.id}
                        onClick={() => setSelectedSegment(seg.id as Segment)}
                        className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
                          selectedSegment === seg.id
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl">
                  <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide">
                    Live Template Message Preview
                  </span>
                  <p className="mt-2 text-[11px] text-slate-700 dark:text-slate-300 font-sans italic whitespace-pre-line leading-relaxed">
                    "{campaignTemplates[selectedTemplate].getBody("Amit Kumar", 350, 350 * config.pointValue)}"
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">
                    {filteredCustomers.length} customer{filteredCustomers.length === 1 ? "" : "s"} in this segment
                    {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
                  </p>
                  <Button
                    size="sm"
                    disabled={selectedIds.size === 0 || bulkSending}
                    onClick={handleBulkSend}
                    className="h-7 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                  >
                    {bulkSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Sending {bulkProgress.sent}/{bulkProgress.total}
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Send to Selected
                      </>
                    )}
                  </Button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px] overscroll-contain">
                    <table className="w-full text-left text-[11px]">
                      <thead className="text-[10px] font-semibold uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 tracking-wide sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 w-8">
                            <Checkbox
                              checked={filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.has(c.id))}
                              onCheckedChange={toggleSelectAllVisible}
                              aria-label="Select all"
                            />
                          </th>
                          <th className="px-4 py-2.5">Recipient</th>
                          <th className="px-4 py-2.5">Phone</th>
                          <th className="px-4 py-2.5">Wallet</th>
                          <th className="px-4 py-2.5 text-right">Dispatch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                              No customers match this target segment.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map((c) => (
                            <tr key={c.id}>
                              <td className="px-4 py-2.5">
                                <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} aria-label={`Select ${c.name}`} />
                              </td>
                              <td className="px-4 py-2.5 font-medium">{c.name}</td>
                              <td className="px-4 py-2.5 text-slate-500">{c.phone || "No Phone"}</td>
                              <td className="px-4 py-2.5 font-semibold text-violet-600 dark:text-violet-400">{c.points} pts</td>
                              <td className="px-4 py-2.5 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleSendWhatsApp(c.name, c.phone || "", c.points)}
                                  className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px]"
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  Send
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === "settings" && (
          <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Settings2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold">Reward Program Configuration</h3>
                <p className="text-[10px] text-slate-500">Define how customers earn and redeem points in your store.</p>
              </div>
            </div>

            {ledgerUnavailable && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Running on local, per-device point adjustments. Apply the <code className="font-mono">loyalty_ledger.sql</code> migration to sync
                  adjustments across devices and keep a full audit trail.
                </p>
              </div>
            )}

            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border">
                <div className="space-y-0.5">
                  <label className="font-semibold text-[11px] text-foreground">Enable Loyalty Points</label>
                  <p className="text-[10px] text-slate-500">Allow customers to accumulate reward points on transactions.</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-9 h-5 bg-slate-200 rounded-full appearance-none cursor-pointer checked:bg-primary relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-all checked:before:translate-x-4"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Point Earning Multiplier</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 mb-1.5">Award 1 point for every spent currency unit:</p>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={config.pointsPerUnit}
                      disabled={!config.enabled}
                      onChange={(e) => setConfig({ ...config, pointsPerUnit: Number(e.target.value) })}
                      className="w-full accent-primary disabled:opacity-50"
                    />
                  </div>
                  <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-[11px] font-semibold">
                    {formatCurrency(config.pointsPerUnit)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Point Value (Exchange Rate)</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 mb-1.5">Monetary value of 1 reward point when redeeming:</p>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={config.pointValue}
                      disabled={!config.enabled}
                      onChange={(e) => setConfig({ ...config, pointValue: Number(e.target.value) })}
                      className="w-full accent-primary disabled:opacity-50"
                    />
                  </div>
                  <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-[11px] font-semibold">
                    {formatCurrency(config.pointValue)}/pt
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">VIP Gold Spend Threshold</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 mb-1.5">Total spend requirement for VIP membership perks:</p>
                    <input
                      type="range"
                      min="1000"
                      max="50000"
                      step="1000"
                      value={config.vipThreshold}
                      disabled={!config.enabled}
                      onChange={(e) => setConfig({ ...config, vipThreshold: Number(e.target.value) })}
                      className="w-full accent-primary disabled:opacity-50"
                    />
                  </div>
                  <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-[11px] font-semibold">
                    {formatCurrency(config.vipThreshold)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Points Expiry</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 mb-1.5">Days before unused points expire (0 = never):</p>
                    <input
                      type="range"
                      min="0"
                      max="730"
                      step="30"
                      value={config.pointsExpiryDays}
                      disabled={!config.enabled}
                      onChange={(e) => setConfig({ ...config, pointsExpiryDays: Number(e.target.value) })}
                      className="w-full accent-primary disabled:opacity-50"
                    />
                  </div>
                  <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-[11px] font-semibold">
                    {config.pointsExpiryDays === 0 ? "Never" : `${config.pointsExpiryDays}d`}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <Button size="sm" onClick={() => toast.success("Loyalty settings updated successfully!")} className="rounded-lg shadow-sm text-[11px] h-8">
                Save Rule Configurations
              </Button>
            </div>
          </div>
        )}

        {/* Manual Adjustment Dialog */}
        <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm">Adjust Reward Points</DialogTitle>
              <DialogDescription className="text-[11px]">
                Adjust points balance manually for <strong>{selectedCustomer?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="flex gap-3">
                <button
                  onClick={() => setAdjustType("add")}
                  className={`flex-1 p-2.5 rounded-lg border text-center font-semibold text-[11px] flex items-center justify-center gap-1.5 ${
                    adjustType === "add" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600" : "border-slate-200 hover:border-slate-400 bg-card"
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Points
                </button>
                <button
                  onClick={() => setAdjustType("deduct")}
                  className={`flex-1 p-2.5 rounded-lg border text-center font-semibold text-[11px] flex items-center justify-center gap-1.5 ${
                    adjustType === "deduct" ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600" : "border-slate-200 hover:border-slate-400 bg-card"
                  }`}
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  Deduct Points
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-medium">Current Wallet Balance</label>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold font-mono">
                  {selectedCustomer?.currentPoints || 0} pts
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-medium">Adjustment Value (points)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter points value..."
                  value={adjustAmount || ""}
                  onChange={(e) => setAdjustAmount(Math.max(0, Number(e.target.value)))}
                  className="h-8 text-[11px] rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-medium">Reason (kept in the audit log)</label>
                <Input
                  placeholder="e.g. Birthday bonus, price adjustment..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="h-8 text-[11px] rounded-lg"
                />
              </div>

              {adjustType === "deduct" && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Redeeming {adjustAmount || 0} points will grant a checkout discount of{" "}
                    <strong>{formatCurrency((adjustAmount || 0) * config.pointValue)}</strong> on their invoice billing.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdjustmentDialogOpen(false)} className="rounded-lg text-[11px] h-8">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyAdjustment}
                disabled={addLedgerEntryMutation.isPending || adjustAmount <= 0}
                className="rounded-lg text-[11px] h-8"
              >
                {addLedgerEntryMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Apply Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm">Points History</DialogTitle>
              <DialogDescription className="text-[11px]">
                Manual adjustments and redemptions for <strong>{historyCustomer?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-80 overflow-y-auto space-y-2 py-2">
              {ledgerUnavailable ? (
                <p className="text-[11px] text-slate-400 text-center py-6">
                  Detailed history requires the loyalty_ledger migration — see Settings tab.
                </p>
              ) : historyEntries.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-6">No manual adjustments yet.</p>
              ) : (
                historyEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-lg border">
                    <div>
                      <p className="text-[11px] font-medium capitalize">{entry.type.replace("_", " ")}</p>
                      {entry.reason && <p className="text-[10px] text-slate-500">{entry.reason}</p>}
                      <p className="text-[9px] text-slate-400">{new Date(entry.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-[11px] font-semibold font-mono ${entry.points > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {entry.points > 0 ? "+" : ""}
                      {entry.points} pts
                    </span>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setHistoryDialogOpen(false)} className="rounded-lg text-[11px] h-8">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}