import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";

export type OrderStatusChangeHandler = (orderId: string, status: string) => void;

/** Subscribe to live order status events for the customer's saved orders (public storefront). */
export function useStorefrontOrdersRealtime(
    orderIds: string[],
    options?: {
        onOrderStatusChange?: OrderStatusChangeHandler;
    }
) {
    const queryClient = useQueryClient();
    const onChangeRef = useRef(options?.onOrderStatusChange);
    onChangeRef.current = options?.onOrderStatusChange;

    const orderIdsKey = orderIds.filter(Boolean).sort().join(",");

    useEffect(() => {
        const uniqueIds = [...new Set(orderIds.filter(Boolean))];
        if (uniqueIds.length === 0) return;

        const channel = supabase.channel(`storefront-orders:${uniqueIds.slice(0, 8).join("-")}`);

        for (const orderId of uniqueIds) {
            channel.on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "order_status_events",
                    filter: `order_id=eq.${orderId}`,
                },
                (payload) => {
                    const row = payload.new as { order_id?: string; status?: string };
                    const status = row?.status;
                    if (!status) return;
                    const id = row?.order_id ?? orderId;

                    onChangeRef.current?.(id, status);
                    queryClient.invalidateQueries({ queryKey: ["orderHistory"] });
                }
            );
        }

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderIdsKey, queryClient]);
}

export function loadCustomerOrderIds(): string[] {
    try {
        const raw = JSON.parse(localStorage.getItem("storefront_orders") || "[]");
        return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
    } catch {
        return [];
    }
}

export function isOrderDeclined(status: string) {
    return status === "rejected" || status === "cancelled";
}
