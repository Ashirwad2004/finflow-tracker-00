import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useToast } from "@/core/hooks/use-toast";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { getOverdueDaysThreshold, setOverdueDaysThreshold } from "@/core/utils/overdue";
import { convertToCSV } from "./csvUtils";
import { BackupFormat } from "./types";

export function useSettingsData() {
  const { isBusinessMode, toggleBusinessMode } = useBusiness();
  const { currency, setCurrency } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "general";

  const [showBusinessDialog, setShowBusinessDialog] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [autoAddParties, setAutoAddParties] = useState(() => {
    return localStorage.getItem("rupeebill_auto_add_parties") === "true";
  });
  const [overdueDays, setOverdueDays] = useState<number>(() => getOverdueDaysThreshold());

  // Fetch user's subscription status
  const { data: subStatus } = useQuery({
    queryKey: ["subscription_status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("subscription_status")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.warn("Fetch subscription status warning:", error.message);
      return data || { plan: "starter", status: "active" };
    },
    enabled: !!user?.id,
  });

  const handleOverdueDaysChange = (val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setOverdueDays(num);
      setOverdueDaysThreshold(num);
      toast({
        title: "Overdue Setting Saved",
        description: `Unpaid bills older than ${num} days will now automatically flag as Overdue across the system.`,
      });
    }
  };

  const handleAutoAddPartiesToggle = (checked: boolean) => {
    setAutoAddParties(checked);
    localStorage.setItem("rupeebill_auto_add_parties", checked ? "true" : "false");
    toast({
      title: checked ? "Feature Enabled" : "Feature Disabled",
      description: checked
        ? "New customers will be automatically saved to your Parties directory."
        : "New customers will not be saved automatically.",
    });
  };

  const handleBusinessToggle = async (checked: boolean) => {
    if (checked) {
      // Check if business details exist
      const { data } = await supabase
        .from("profiles" as any)
        .select("business_name")
        .eq("user_id", user?.id || "")
        .single();

      const hasDetails = (data as any)?.business_name;

      if (!hasDetails) {
        setShowBusinessDialog(true);
      } else {
        toggleBusinessMode(true);
      }
    } else {
      toggleBusinessMode(false);
    }
  };

  const handleBackup = async (format: BackupFormat) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to backup data",
        variant: "destructive",
      });
      return;
    }

    setIsBackingUp(true);
    try {
      let data: any = null;

      // Try FastAPI backend backup endpoint first
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch("/api/v1/backup/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn("Backend backup endpoint unreachable, falling back to edge function:", err);
      }

      if (!data) {
        const { data: edgeData, error } = await supabase.functions.invoke("backup-data");
        if (error) {
          throw new Error(error.message);
        }
        data = edgeData;
      }

      const dateStr = new Date().toISOString().split("T")[0];
      let blob: Blob;
      let filename: string;

      if (format === "csv") {
        const csvData = {
          expenses: data.expenses || [],
          budgets: data.budgets || [],
          lentMoney: data.lentMoney || [],
          borrowedMoney: data.borrowedMoney || [],
          sales: data.sales || [],
          purchases: data.purchases || [],
          products: data.products || [],
        };
        const csvContent = convertToCSV(csvData);
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        filename = `rupeebill-backup-${dateStr}.csv`;
      } else {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        filename = `rupeebill-backup-${dateStr}.json`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Complete",
        description: `Your data has been downloaded as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Backup error:", error);
      toast({
        title: "Backup Failed",
        description: error instanceof Error ? error.message : "Failed to backup data",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const activePlanName = subStatus?.plan ? subStatus.plan.toUpperCase() : "STARTER";

  return {
    isBusinessMode,
    currency,
    setCurrency,
    activeTab,
    setSearchParams,
    showBusinessDialog,
    setShowBusinessDialog,
    isBackingUp,
    checkoutOpen,
    setCheckoutOpen,
    autoAddParties,
    overdueDays,
    subStatus,
    activePlanName,
    handleOverdueDaysChange,
    handleAutoAddPartiesToggle,
    handleBusinessToggle,
    handleBackup,
    toggleBusinessMode,
  };
}
