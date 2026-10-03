import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import {
  useStorefrontOrdersRealtime,
  loadCustomerOrderIds,
  isOrderDeclined,
} from "@/core/hooks/useStorefrontOrdersRealtime";

export function useStorefrontOrderTracking(
  storeId: string | null,
  storeSlug?: string,
  isOrdersOpen: boolean = false
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>("pending");
  const [orderComplete, setOrderComplete] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [customerOrderIds, setCustomerOrderIds] = useState<string[]>(loadCustomerOrderIds);

  const notifyOrderStatus = (status: string) => {
    if (status === "accepted") {
      toast({ title: "Order Accepted! 🎉", description: "The store has accepted your order." });
    } else if (status === "completed") {
      toast({ title: "Order Completed! ✅", description: "Your order is ready." });
    } else if (isOrderDeclined(status)) {
      toast({
        title: "Order Rejected",
        description: "Your order could not be fulfilled. Stock has been restored.",
        variant: "destructive",
      });
    }
  };

  // Live order tracking
  const watchedOrderIds = useMemo(() => {
    const ids = new Set(customerOrderIds);
    if (trackedOrderId) ids.add(trackedOrderId);
    return [...ids];
  }, [customerOrderIds, trackedOrderId]);

  useStorefrontOrdersRealtime(watchedOrderIds, {
    onOrderStatusChange: (orderId, status) => {
      if (orderId === trackedOrderId) {
        setOrderStatus(status);
        notifyOrderStatus(status);
      }
      if (isOrderDeclined(status) && storeId) {
        queryClient.invalidateQueries({ queryKey: ["publicStoreProducts", storeId] });
      }
    },
  });

  useEffect(() => {
    setCustomerOrderIds(loadCustomerOrderIds());
  }, [storeSlug, isOrdersOpen]);

  useEffect(() => {
    if (!trackedOrderId || trackedOrderId.startsWith("DEMO-ORD-")) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc("get_customer_orders", {
        p_order_ids: [trackedOrderId],
      });
      if (!cancelled && data?.[0]?.status) {
        setOrderStatus(data[0].status);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackedOrderId]);

  useEffect(() => {
    if (!orderComplete || !trackedOrderId || trackedOrderId.startsWith("DEMO-ORD-")) return;
    const poll = async () => {
      const { data } = await (supabase as any).rpc("get_customer_orders", {
        p_order_ids: [trackedOrderId],
      });
      const latest = data?.[0]?.status;
      if (latest) {
        setOrderStatus((prev) => (prev !== latest ? latest : prev));
      }
    };
    const interval = setInterval(poll, 8_000);
    return () => clearInterval(interval);
  }, [orderComplete, trackedOrderId]);

  return {
    trackedOrderId,
    setTrackedOrderId,
    orderStatus,
    setOrderStatus,
    orderComplete,
    setOrderComplete,
    submittedName,
    setSubmittedName,
    customerOrderIds,
    setCustomerOrderIds,
    notifyOrderStatus,
  };
}
