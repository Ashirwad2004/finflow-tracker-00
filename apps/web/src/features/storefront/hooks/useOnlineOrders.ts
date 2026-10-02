import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { offlineMutate } from "@/core/offline/apiService";
import { useToast } from "@/core/hooks/use-toast";
import { OnlineOrder, DateFilterPeriod } from "../types";

export function useOnlineOrders(currentStoreId: string | null | undefined, dateFilter: DateFilterPeriod = "month") {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch Orders — include nested order items + product name in a single query
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["online_orders", currentStoreId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("online_orders")
        .select(`
          *,
          online_order_items (
            id,
            product_id,
            quantity,
            price_at_time,
            products ( name )
          )
        `)
        .eq("store_id", currentStoreId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown) as OnlineOrder[];
    },
    enabled: !!currentStoreId,
    refetchInterval: autoRefresh ? 8000 : false,
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      if (!currentStoreId) throw new Error("Store not identified");
      const { error } = await offlineMutate({
        table: "online_orders",
        action: "update",
        recordId: orderId,
        payload: { status },
        userId: currentStoreId,
      });
      if (error) throw error;
      return { orderId, status };
    },
    onSuccess: (data) => {
      const { orderId, status } = data;

      // Optimistic update for online_orders
      queryClient.setQueryData(["online_orders", currentStoreId], (old: any) => {
        return old ? old.map((o: any) => (o.id === orderId ? { ...o, status } : o)) : [];
      });

      // Optimistic update for pending count
      queryClient.setQueryData(["online_orders_pending_count", currentStoreId], () => {
        const currentOrders: any[] = queryClient.getQueryData(["online_orders", currentStoreId]) || [];
        return currentOrders.filter((o: any) => o.status === "pending").length;
      });

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["online_orders", currentStoreId] });
        queryClient.invalidateQueries({ queryKey: ["online_orders_pending_count", currentStoreId] });
        if (status === "rejected") {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      }
      toast({ title: "Status Updated", description: "Order status has been updated." });
    },
    onError: (error: Error) => {
      toast({
        title: "Status update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Realtime subscription for incoming online orders
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
      .channel(`realtime-online-orders:${currentStoreId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "online_orders",
          filter: `store_id=eq.${currentStoreId}`,
        },
        (payload) => {
          playNotificationSound();
          toast({
            title: "🎉 New Order Received!",
            description: `Incoming order from ${payload.new.customer_name}.`,
          });
          queryClient.invalidateQueries({ queryKey: ["online_orders", currentStoreId] });
          queryClient.invalidateQueries({ queryKey: ["online_orders_pending_count", currentStoreId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "online_orders",
          filter: `store_id=eq.${currentStoreId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["online_orders", currentStoreId] });
          queryClient.invalidateQueries({ queryKey: ["online_orders_pending_count", currentStoreId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStoreId, queryClient, toast]);

  // Derived metrics
  const pendingCount = useMemo(() => orders.filter((o) => o.status === "pending").length, [orders]);

  const metrics = useMemo(() => {
    const now = new Date();
    let startTime = 0;

    if (dateFilter === "today") {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    } else if (dateFilter === "week") {
      const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
    } else if (dateFilter === "month") {
      startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else if (dateFilter === "year") {
      startTime = new Date(now.getFullYear(), 0, 1).getTime();
    }

    let filteredSales = 0;
    let filteredOrdersCount = 0;
    let filteredDeliveryFee = 0;

    orders.forEach((order) => {
      if (order.status !== "completed" && order.status !== "accepted") return;

      const orderTime = new Date(order.created_at).getTime();
      if (orderTime >= startTime) {
        filteredSales += order.total_amount || 0;
        filteredDeliveryFee += order.delivery_charge || 0;
        filteredOrdersCount++;
      }
    });

    const avgOrderValue = filteredOrdersCount > 0 ? filteredSales / filteredOrdersCount : 0;

    return {
      filteredSales,
      filteredOrdersCount,
      filteredDeliveryFee,
      avgOrderValue,
    };
  }, [orders, dateFilter]);

  return {
    orders,
    isLoadingOrders,
    autoRefresh,
    setAutoRefresh,
    pendingCount,
    updateOrderStatus,
    metrics,
  };
}
