import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";

/** Refetch admin inventory when product stock changes (online orders, invoices, edits). */
export function useProductsRealtime(userId: string | undefined) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`realtime:products:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "products",
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["products", userId] });
                    queryClient.invalidateQueries({ queryKey: ["products"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);
}
