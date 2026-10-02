import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { OrderReturn } from "../types";

export function useStoreReturns(currentStoreId: string | null | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [returnsRefreshInterval, setReturnsRefreshInterval] = useState<number | false>(30000);
  const [lastUpdatedReturns, setLastUpdatedReturns] = useState<Date>(new Date());
  const [previewReturnImageUrl, setPreviewReturnImageUrl] = useState<string | null>(null);

  const {
    data: orderReturns = [] as OrderReturn[],
    isLoading: isLoadingReturns,
    isFetching: isFetchingReturns,
    refetch: refetchReturns,
  } = useQuery({
    queryKey: ["orderReturns", currentStoreId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("order_returns")
        .select(`
          *,
          online_orders (
            id,
            customer_name,
            customer_phone,
            customer_address,
            total_amount,
            created_at
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching returns:", error);
        throw error;
      }
      setLastUpdatedReturns(new Date());
      return data || [];
    },
    enabled: !!currentStoreId,
    refetchInterval: returnsRefreshInterval,
  });

  const updateReturnStatus = useMutation({
    mutationFn: async ({ returnId, status }: { returnId: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("order_returns")
        .update({ status })
        .eq("id", returnId);
      if (error) throw error;
      return { returnId, status };
    },
    onSuccess: (data) => {
      toast({ title: "Return Updated", description: `Return status has been set to ${data.status}.` });
      refetchReturns();
      queryClient.invalidateQueries({ queryKey: ["online_orders", currentStoreId] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Realtime subscription for order returns
  useEffect(() => {
    if (!currentStoreId) return;

    const playNotificationSound = () => {
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    };

    const channel = supabase
      .channel(`realtime-returns:${currentStoreId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_returns",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            playNotificationSound();
            toast({
              title: "🔄 New Return Request!",
              description: "A customer has submitted a new return request.",
            });
          }
          queryClient.invalidateQueries({ queryKey: ["orderReturns", currentStoreId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStoreId, queryClient, toast]);

  return {
    orderReturns,
    isLoadingReturns,
    isFetchingReturns,
    refetchReturns,
    returnsRefreshInterval,
    setReturnsRefreshInterval,
    lastUpdatedReturns,
    previewReturnImageUrl,
    setPreviewReturnImageUrl,
    updateReturnStatus,
  };
}
