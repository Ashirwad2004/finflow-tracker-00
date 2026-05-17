import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";

/** Refetch public storefront products when stock changes (sales, orders, admin edits). */
export function useStorefrontInventoryRealtime(storeId: string | null) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!storeId) return;

        const channel = supabase
            .channel(`realtime:store-products:${storeId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "products",
                    filter: `user_id=eq.${storeId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["publicStoreProducts", storeId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [storeId, queryClient]);
}
