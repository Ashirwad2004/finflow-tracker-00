import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import axios from "axios";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { PaymentRecord, PaymentStats, AuditLogEntry } from "../types";

export const fetchWithAuth = async (url: string, options: any = {}) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${session?.access_token}`,
  };
  return axios({
    url,
    ...options,
    headers,
  });
};

interface UseStorePaymentsProps {
  currentStoreId: string | null | undefined;
  isSalesman: boolean;
  searchQuery: string;
  statusFilter: string;
}

export function useStorePayments({
  currentStoreId,
  isSalesman,
  searchQuery,
  statusFilter,
}: UseStorePaymentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Payments history list
  const {
    data: paymentsHistory = { payments: [] as PaymentRecord[], total: 0 },
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["paymentsHistory", currentStoreId, searchQuery, statusFilter],
    queryFn: async () => {
      const res = await fetchWithAuth(
        `/api/v1/payments/admin/history?storeId=${currentStoreId}&search=${searchQuery}&status=${statusFilter}`
      );
      return res.data;
    },
    enabled: !!currentStoreId && !isSalesman,
  });

  // Gateway payment aggregated analytics
  const { data: analyticsData = { stats: null as PaymentStats | null }, isLoading: isLoadingStats } = useQuery({
    queryKey: ["paymentStats", currentStoreId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/v1/payments/admin/stats?storeId=${currentStoreId}`);
      return res.data;
    },
    enabled: !!currentStoreId && !isSalesman,
  });

  // Payment security Audit logs
  const { data: auditLogs = { logs: [] as AuditLogEntry[] }, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["paymentLogs", currentStoreId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/v1/payments/admin/logs?storeId=${currentStoreId}`);
      return res.data;
    },
    enabled: !!currentStoreId && !isSalesman,
  });

  // Fetch store profile for invoice branding name
  const { data: storeProfile } = useQuery({
    queryKey: ["storeProfile", currentStoreId],
    queryFn: async () => {
      if (!currentStoreId) return null;
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", currentStoreId || "")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentStoreId,
  });

  // Refund mutation
  const refundPayment = useMutation({
    mutationFn: async ({
      paymentId,
      amount,
      reason,
    }: {
      paymentId: string;
      amount?: number;
      reason: string;
    }) => {
      const res = await fetchWithAuth("/api/v1/payments/refund", {
        method: "POST",
        data: { paymentId, amount, reason },
      });
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Refund Successful 🎉",
        description: "The payment has been refunded in full and updated.",
      });
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ["paymentStats", currentStoreId] });
      queryClient.invalidateQueries({ queryKey: ["paymentLogs", currentStoreId] });
    },
    onError: (err: any) => {
      console.error("Refund processing error:", err);
      toast({
        title: "Refund Denied",
        description: err.response?.data?.error ?? "Failed to issue refund. Check gateway connection.",
        variant: "destructive",
      });
    },
  });

  // 30 days daily sales chart data
  const chartData = useMemo(() => {
    const payments = paymentsHistory?.payments || [];
    const dailyMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), "MMM dd");
      dailyMap.set(dateStr, 0);
    }

    payments.forEach((p: any) => {
      if (p.status === "success") {
        const dateStr = format(new Date(p.created_at), "MMM dd");
        if (dailyMap.has(dateStr)) {
          dailyMap.set(dateStr, dailyMap.get(dateStr)! + Number(p.amount || 0));
        }
      }
    });

    return Array.from(dailyMap.entries()).map(([name, value]) => ({
      name,
      revenue: value,
    }));
  }, [paymentsHistory?.payments]);

  return {
    paymentsHistory,
    isLoadingHistory,
    refetchHistory,
    analyticsData,
    isLoadingStats,
    auditLogs,
    isLoadingLogs,
    storeProfile,
    refundPayment,
    chartData,
  };
}
