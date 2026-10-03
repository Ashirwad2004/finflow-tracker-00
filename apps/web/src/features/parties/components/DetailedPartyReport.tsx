import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { sqliteService } from "@/core/offline/sqliteService";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ArrowRightLeft } from "lucide-react";
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";
import {
  LedgerTransaction,
  parseSafeDate,
  computeDetailedPartyLedger,
} from "../lib/detailedLedgerCalculations";
import {
  PartyReportToolbar,
  PartySummaryBanner,
  PartyLedgerTable,
} from "./detailed-report";

export type { LedgerTransaction };
export { parseSafeDate };

export interface DetailedPartyReportProps {
  initialPartyName?: string | null;
  initialPartyId?: string | null;
  initialDateRange?: { from?: Date; to?: Date };
}

export const DetailedPartyReport = ({
  initialPartyName,
  initialPartyId,
  initialDateRange,
}: DetailedPartyReportProps) => {
  const { formatCurrency, currency } = useCurrency();
  const { user } = useAuth();

  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [partySearch, setPartySearch] = useState<string>("");
  const [viewOrder, setViewOrder] = useState<"chronological" | "reverse">("chronological");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: initialDateRange?.from,
    to: initialDateRange?.to,
  });
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [showWhatsAppReminderModal, setShowWhatsAppReminderModal] = useState(false);

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "all") {
      setDateRange({ from: undefined, to: undefined });
    } else if (preset === "this_month") {
      setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    } else if (preset === "last_month") {
      const prev = subMonths(now, 1);
      setDateRange({ from: startOfMonth(prev), to: endOfMonth(prev) });
    } else if (preset === "last_90_days") {
      setDateRange({ from: subDays(now, 90), to: now });
    } else if (preset === "this_fy") {
      const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setDateRange({ from: new Date(currentYear, 3, 1), to: new Date(currentYear + 1, 2, 31) });
    } else if (preset === "last_fy") {
      const prevYear = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) - 1;
      setDateRange({ from: new Date(prevYear, 3, 1), to: new Date(prevYear + 1, 2, 31) });
    }
  };

  const dateButtonLabel = useMemo(() => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd MMM yyyy")} – ${format(dateRange.to, "dd MMM yyyy")}`;
    }
    if (dateRange.from && !dateRange.to) {
      return `From ${format(dateRange.from, "dd MMM yyyy")}`;
    }
    if (!dateRange.from && dateRange.to) {
      return `Up to ${format(dateRange.to, "dd MMM yyyy")}`;
    }
    return "All Dates";
  }, [dateRange]);

  // Queries with SQLite offline fallback
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn("Using offline profile for detailed ledger:", err);
      }
      return (await sqliteService.getById<any>(user.id)) || null;
    },
    enabled: !!user,
  });

  const { data: partiesDirectory = [], isLoading: partiesLoading } = useQuery({
    queryKey: ["parties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("parties")
          .select("*")
          .eq("user_id", user.id);
        if (!error && data) return data;
      } catch (err) {
        console.warn("Using offline parties for detailed ledger:", err);
      }
      return (await sqliteService.getAll<any>("parties", user.id)) || [];
    },
    enabled: !!user,
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("sales")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: true });
        if (!error && data) return data;
      } catch (err) {
        console.warn("Using offline sales for detailed ledger:", err);
      }
      return (await sqliteService.getAll<any>("sales", user.id)) || [];
    },
    enabled: !!user,
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("purchases")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: true });
        if (!error && data) return data;
      } catch (err) {
        console.warn("Using offline purchases for detailed ledger:", err);
      }
      return (await sqliteService.getAll<any>("purchases", user.id)) || [];
    },
    enabled: !!user,
  });

  // Unique Parties
  const uniqueParties = useMemo(() => {
    interface PartyOption {
      id?: string;
      name: string;
      type: "customer" | "vendor" | "both";
      phone?: string;
      gst?: string;
    }

    const map = new Map<string, PartyOption>();

    partiesDirectory.forEach((p: any) => {
      const name = (p.name || "").trim();
      if (!name) return;
      const norm = name.toLowerCase();
      map.set(norm, {
        id: p.id,
        name,
        type: p.type || "customer",
        phone: p.phone || undefined,
        gst: p.gst_number || undefined,
      });
    });

    sales.forEach((s: any) => {
      const name = (s.customer_name || "").trim();
      if (!name) return;
      const norm = name.toLowerCase();
      if (!map.has(norm)) {
        map.set(norm, {
          id: s.party_id || undefined,
          name,
          type: "customer",
          phone: s.customer_phone || undefined,
          gst: s.customer_gstin || undefined,
        });
      } else {
        const existing = map.get(norm)!;
        if (!existing.id && s.party_id) existing.id = s.party_id;
        if (!existing.phone && s.customer_phone) existing.phone = s.customer_phone;
      }
    });

    purchases.forEach((p: any) => {
      const name = (p.vendor_name || "").trim();
      if (!name) return;
      const norm = name.toLowerCase();
      if (!map.has(norm)) {
        map.set(norm, {
          id: p.party_id || undefined,
          name,
          type: "vendor",
          phone: p.vendor_phone || undefined,
          gst: p.vendor_gstin || undefined,
        });
      } else {
        const existing = map.get(norm)!;
        if (existing.type === "customer") existing.type = "both";
        if (!existing.id && p.party_id) existing.id = p.party_id;
        if (!existing.phone && p.vendor_phone) existing.phone = p.vendor_phone;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [partiesDirectory, sales, purchases]);

  // Initial selection sync
  useEffect(() => {
    if (initialPartyName && initialPartyName !== "all") {
      setSelectedParty(initialPartyName.trim());
    } else if (initialPartyId && uniqueParties.length > 0) {
      const match = uniqueParties.find((p) => p.id === initialPartyId);
      if (match) setSelectedParty(match.name);
    } else if (selectedParty === "all" && uniqueParties.length > 0) {
      setSelectedParty(uniqueParties[0].name);
    }
  }, [initialPartyName, initialPartyId, uniqueParties.length]);

  const activePartyRecord = useMemo(() => {
    if (!selectedParty || selectedParty === "all") return null;
    const normSelected = selectedParty.trim().toLowerCase();
    return (
      partiesDirectory.find(
        (p: any) => p.name && p.name.trim().toLowerCase() === normSelected
      ) ||
      uniqueParties.find((p) => p.name.trim().toLowerCase() === normSelected) ||
      null
    );
  }, [selectedParty, partiesDirectory, uniqueParties]);

  const partyDetails = useMemo(() => {
    if (!activePartyRecord) return { name: selectedParty };
    return {
      name: activePartyRecord.name || selectedParty,
      phone: activePartyRecord.phone || (activePartyRecord as any).mobile || "",
      gst:
        activePartyRecord.gst ||
        (activePartyRecord as any).gst_number ||
        (activePartyRecord as any).gstin ||
        "",
      address:
        (activePartyRecord as any).billing_address || (activePartyRecord as any).address || "",
      type: activePartyRecord.type || (activePartyRecord as any).party_type || "Party",
    };
  }, [activePartyRecord, selectedParty]);

  const businessDetails = useMemo(() => {
    if (!profile) return undefined;
    return {
      name: (profile as any).business_name || "RupeeBill Business",
      address: (profile as any).business_address || "",
      phone: (profile as any).business_phone || "",
      gst: (profile as any).gst_number || "",
      email: (profile as any).business_email || "",
    };
  }, [profile]);

  const filteredPartyOptions = useMemo(() => {
    if (!partySearch.trim()) return uniqueParties;
    const q = partySearch.toLowerCase();
    return uniqueParties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.gst && p.gst.toLowerCase().includes(q))
    );
  }, [uniqueParties, partySearch]);

  // Compute Full Ledger
  const {
    fullLedger,
    closingBalance,
    totalPeriodDebit,
    totalPeriodCredit,
    initialBroughtForward,
  } = useMemo(() => {
    return computeDetailedPartyLedger({
      selectedParty,
      activePartyRecord,
      partiesDirectory,
      sales,
      purchases,
      dateRange,
    });
  }, [sales, purchases, partiesDirectory, selectedParty, dateRange, activePartyRecord]);

  const displayLedger = useMemo(() => {
    if (viewOrder === "reverse") {
      return [...fullLedger].reverse();
    }
    return fullLedger;
  }, [fullLedger, viewOrder]);

  const sendWhatsAppReminder = () => {
    setShowWhatsAppReminderModal(true);
  };

  const isLoading = partiesLoading || salesLoading || purchasesLoading;

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      {/* Top Action Toolbar */}
      <PartyReportToolbar
        selectedParty={selectedParty}
        setSelectedParty={setSelectedParty}
        partySearch={partySearch}
        setPartySearch={setPartySearch}
        filteredPartyOptions={filteredPartyOptions}
        isDatePopoverOpen={isDatePopoverOpen}
        setIsDatePopoverOpen={setIsDatePopoverOpen}
        dateButtonLabel={dateButtonLabel}
        datePreset={datePreset}
        setDatePreset={setDatePreset}
        dateRange={dateRange}
        setDateRange={setDateRange}
        handleDatePresetChange={handleDatePresetChange}
        viewOrder={viewOrder}
        setViewOrder={setViewOrder}
        fullLedger={fullLedger}
        businessDetails={businessDetails}
        partyDetails={partyDetails}
      />

      {/* Content Body: Loading, Empty, or Ledger Statement */}
      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground animate-pulse text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          Loading verified ledger data...
        </div>
      ) : selectedParty === "all" ? (
        <div className="text-center py-20 text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-30 text-primary" />
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            No Party Selected
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Select any customer or vendor above to view their verified double-entry statement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Executive Summary Banner */}
          <PartySummaryBanner
            selectedParty={selectedParty}
            activePartyRecord={activePartyRecord}
            closingBalance={closingBalance}
            totalPeriodDebit={totalPeriodDebit}
            totalPeriodCredit={totalPeriodCredit}
            formatCurrency={formatCurrency}
            onSendWhatsAppReminder={sendWhatsAppReminder}
          />

          {/* Ledger Table */}
          <PartyLedgerTable
            fullLedger={fullLedger}
            displayLedger={displayLedger}
            dateRange={dateRange}
            initialBroughtForward={initialBroughtForward}
            totalPeriodDebit={totalPeriodDebit}
            totalPeriodCredit={totalPeriodCredit}
            closingBalance={closingBalance}
            formatCurrency={formatCurrency}
          />
        </div>
      )}

      {showWhatsAppReminderModal && activePartyRecord && (
        <SendWhatsAppDialog
          open={showWhatsAppReminderModal}
          onOpenChange={setShowWhatsAppReminderModal}
          messageType="reminder"
          recipientName={selectedParty}
          recipientPhone={activePartyRecord.phone}
          metadata={{
            party_id: activePartyRecord.id,
            outstanding_amount: closingBalance,
            currency_symbol: currency?.symbol || "₹",
          }}
          defaultMessage={`Dear ${selectedParty},\n\nThis is a friendly reminder from ${
            (profile as any)?.business_name || "our office"
          } regarding your outstanding balance of ${formatCurrency(
            closingBalance
          )} as per your current ledger statement. Please arrange the payment at your earliest convenience.\n\nThank you!`}
        />
      )}
    </div>
  );
};

export default DetailedPartyReport;
