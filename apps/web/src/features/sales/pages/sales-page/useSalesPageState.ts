import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { sqliteService } from "@/core/offline/sqliteService";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useSalesSettings } from "@/core/hooks/use-sales-settings";
import { Sale } from "../../types";
import { useSalesCalculations } from "../../hooks/useSalesCalculations";
import { useSalesActions } from "../../hooks/useSalesActions";
import { FilterStatus, SortOption } from "../../components/SalesTable";

export function useSalesPageState() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");
  const activeTab: "invoices" | "payment-in" | "sales-order" =
    currentTab === "payment-in"
      ? "payment-in"
      : currentTab === "sales-order"
      ? "sales-order"
      : "invoices";

  const setActiveTab = (tab: "invoices" | "payment-in" | "sales-order") => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "payment-in") {
        next.set("tab", "payment-in");
      } else if (tab === "sales-order") {
        next.set("tab", "sales-order");
      } else {
        next.delete("tab");
      }
      return next;
    });
  };

  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const { settings, updateSetting, resetSettings } = useSalesSettings(user?.id);

  // Fetch Profile for Business Details
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
      } catch (e) {
        console.warn("[Sales] Profile fetch failed offline, falling back to cache:", e);
      }
      const cached = queryClient.getQueryData<any>(["profile", user.id]);
      if (cached) return cached;
      return await sqliteService.getById<any>(user.id);
    },
    initialData: () => queryClient.getQueryData(["profile", user?.id]) || undefined,
    enabled: !!user,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["parties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("parties")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[Sales] Parties fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("parties", user.id)) || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["parties", user?.id]) || undefined,
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[Sales] Products fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("products", user.id)) || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["products", user?.id]) || undefined,
    enabled: !!user,
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      let salesData: any[] = [];
      try {
        const { data, error } = await (supabase as any)
          .from("sales")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) {
          salesData = data;
        }
      } catch (e) {
        console.warn("[Sales] Sales fetch failed offline, falling back to cache:", e);
      }

      if (!salesData || salesData.length === 0) {
        const cached = queryClient.getQueryData<any[]>(["sales", user.id]);
        if (cached && cached.length > 0) {
          salesData = cached;
        } else {
          salesData = await sqliteService.getAll<any>("sales", user.id);
        }
      }

      const today = new Date().toISOString().split("T")[0];
      return (salesData || []).map((inv) => {
        if (inv.status === "pending" && inv.due_date && inv.due_date < today) {
          return { ...inv, status: "overdue" };
        }
        return inv;
      }) as Sale[];
    },
    initialData: () => queryClient.getQueryData<Sale[]>(["sales", user?.id]) || undefined,
    enabled: !!user,
  });

  // Single-pass calculations for KPI summaries
  const { outstandingTotal, overdueTotal, paidThisMonth } = useSalesCalculations(invoices);

  // Document actions, printing, sharing, WhatsApp, deletion
  const {
    paymentTarget,
    setPaymentTarget,
    transcriptTarget,
    setTranscriptTarget,
    isPaymentInOpen,
    setIsPaymentInOpen,
    whatsappInvoice,
    setWhatsappInvoice,
    whatsappPdfBase64,
    isBulkWhatsAppOpen,
    setIsBulkWhatsAppOpen,
    handleOpenRecordPayment,
    handleOpenTranscript,
    handlePreview,
    handlePrint,
    handleDownload,
    handleShare,
    handleOpenWhatsApp,
    handleGenerateEInvoice,
    handleBulkWhatsApp,
    handleBulkEmail,
    handleDelete,
  } = useSalesActions({
    invoices,
    parties,
    profile,
    settings,
    user,
    formatCurrency,
    queryClient,
  });

  const handleEdit = (invoice: Sale) => {
    setEditingInvoice(invoice);
    setIsCreateOpen(true);
  };

  return {
    user,
    navigate,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    isCreateOpen,
    setIsCreateOpen,
    editingInvoice,
    setEditingInvoice,
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSetting,
    resetSettings,
    parties,
    products,
    invoices,
    isLoading,
    outstandingTotal,
    overdueTotal,
    paidThisMonth,
    // Actions & Targets
    paymentTarget,
    setPaymentTarget,
    transcriptTarget,
    setTranscriptTarget,
    isPaymentInOpen,
    setIsPaymentInOpen,
    whatsappInvoice,
    setWhatsappInvoice,
    whatsappPdfBase64,
    isBulkWhatsAppOpen,
    setIsBulkWhatsAppOpen,
    handleOpenRecordPayment,
    handleOpenTranscript,
    handlePreview,
    handlePrint,
    handleDownload,
    handleShare,
    handleOpenWhatsApp,
    handleGenerateEInvoice,
    handleBulkWhatsApp,
    handleBulkEmail,
    handleDelete,
    handleEdit,
  };
}
