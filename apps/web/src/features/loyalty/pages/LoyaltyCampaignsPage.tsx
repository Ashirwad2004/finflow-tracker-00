import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Segment,
  SortKey,
  SortDir,
  LOYALTY_PAGE_SIZE,
  LedgerEntry,
} from "../types";
import { useLoyaltyData, useLoyaltyCampaigns } from "../hooks";
import {
  LoyaltyOverviewTab,
  LoyaltyLedgerTab,
  LoyaltyCampaignsTab,
  LoyaltySettingsTab,
  LoyaltyAdjustmentDialog,
  LoyaltyHistoryDialog,
} from "../components";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function LoyaltyCampaignsPage() {
  const { formatCurrency } = useCurrency();

  const [activeTab, setActiveTab] = useState<"overview" | "ledger" | "campaigns" | "settings">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [selectedSegment, setSelectedSegment] = useState<Segment>("all");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Manual adjustment dialog state
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; currentPoints: number } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [adjustReason, setAdjustReason] = useState("");

  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<{ id: string; name: string } | null>(null);

  // Loyalty data hook
  const {
    config,
    setConfig,
    profile,
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
  } = useLoyaltyData();

  // Segment filtering
  const segmentFilter = useCallback(
    (c: (typeof customerLoyaltyData)[number]) => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (selectedSegment === "vip") return c.tier === "Gold";
      if (selectedSegment === "slipping") {
        if (c.lastPurchaseDate) return c.lastPurchaseDate < thirtyDaysAgo;
        return new Date(c.created_at) < thirtyDaysAgo;
      }
      if (selectedSegment === "new") return new Date(c.created_at) >= sevenDaysAgo;
      return true;
    },
    [selectedSegment]
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

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedSegment, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / LOYALTY_PAGE_SIZE));
  const pagedCustomers = filteredCustomers.slice((page - 1) * LOYALTY_PAGE_SIZE, page * LOYALTY_PAGE_SIZE);

  // Sorting & selection
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

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

  // Campaigns hook
  const {
    selectedTemplate,
    setSelectedTemplate,
    customPromoCode,
    setCustomPromoCode,
    campaignTemplates,
    bulkSending,
    bulkProgress,
    handleSendWhatsApp,
    handleBulkSend,
  } = useLoyaltyCampaigns({
    profile,
    config,
    filteredCustomers,
    selectedIds,
    formatCurrency,
  });

  // Actions
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
      } catch {
        toast.error("Couldn't save the adjustment. Please try again.");
        return;
      }
    }

    setAdjustmentDialogOpen(false);
    setSelectedCustomer(null);
    setAdjustAmount(0);
    setAdjustReason("");
  };

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

        {/* Tab content */}
        {activeTab === "overview" && (
          <LoyaltyOverviewTab
            totalPointsIssued={totalPointsIssued}
            vipCount={vipCount}
            returningCustomerRate={returningCustomerRate}
            config={config}
            monthlyTrend={monthlyTrend}
            customerLoyaltyData={customerLoyaltyData}
            loadingParties={loadingParties}
            loadingSales={loadingSales}
            formatCurrency={formatCurrency}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "ledger" && (
          <LoyaltyLedgerTab
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            toggleSelectAllVisible={toggleSelectAllVisible}
            handleExportCsv={handleExportCsv}
            onClearFilters={() => {
              setSelectedSegment("all");
              setSearchTerm("");
              setSelectedIds(new Set());
            }}
            filteredCustomers={filteredCustomers}
            pagedCustomers={pagedCustomers}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            pageSize={LOYALTY_PAGE_SIZE}
            sortKey={sortKey}
            toggleSort={toggleSort}
            config={config}
            loadingParties={loadingParties}
            loadingSales={loadingSales}
            loadingLedger={loadingLedger}
            formatCurrency={formatCurrency}
            onOpenHistory={(c) => {
              setHistoryCustomer(c);
              setHistoryDialogOpen(true);
            }}
            onOpenAdjust={(c) => {
              setSelectedCustomer(c);
              setAdjustType("add");
              setAdjustAmount(0);
              setAdjustReason("");
              setAdjustmentDialogOpen(true);
            }}
            onOpenRedeem={(c) => {
              if (c.currentPoints <= 0) {
                toast.error("Customer has 0 points to redeem!");
                return;
              }
              setSelectedCustomer(c);
              setAdjustType("deduct");
              setAdjustAmount(c.currentPoints);
              setAdjustReason("Redeemed in-store");
              setAdjustmentDialogOpen(true);
            }}
          />
        )}

        {activeTab === "campaigns" && (
          <LoyaltyCampaignsTab
            campaignTemplates={campaignTemplates}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            customPromoCode={customPromoCode}
            setCustomPromoCode={setCustomPromoCode}
            config={config}
            selectedSegment={selectedSegment}
            setSelectedSegment={setSelectedSegment}
            filteredCustomers={filteredCustomers}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            toggleSelectAllVisible={toggleSelectAllVisible}
            bulkSending={bulkSending}
            bulkProgress={bulkProgress}
            handleBulkSend={handleBulkSend}
            handleSendWhatsApp={handleSendWhatsApp}
          />
        )}

        {activeTab === "settings" && (
          <LoyaltySettingsTab
            config={config}
            setConfig={setConfig}
            ledgerUnavailable={ledgerUnavailable}
            formatCurrency={formatCurrency}
          />
        )}

        {/* Dialogs */}
        <LoyaltyAdjustmentDialog
          open={adjustmentDialogOpen}
          onOpenChange={setAdjustmentDialogOpen}
          selectedCustomer={selectedCustomer}
          adjustType={adjustType}
          setAdjustType={setAdjustType}
          adjustAmount={adjustAmount}
          setAdjustAmount={setAdjustAmount}
          adjustReason={adjustReason}
          setAdjustReason={setAdjustReason}
          pointValue={config.pointValue}
          formatCurrency={formatCurrency}
          isPending={addLedgerEntryMutation.isPending}
          onApply={handleApplyAdjustment}
        />

        <LoyaltyHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          historyCustomer={historyCustomer}
          ledgerUnavailable={ledgerUnavailable}
          historyEntries={historyEntries}
        />
      </div>
    </AppLayout>
  );
}