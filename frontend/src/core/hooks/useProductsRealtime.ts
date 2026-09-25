import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChannelSubscription {
    channel: RealtimeChannel;
    subscribers: number;
}

const activeSubscriptions = new Map<string, ChannelSubscription>();

/** Refetch admin inventory when product stock changes (online orders, invoices, edits). */
export function useProductsRealtime(userId: string | undefined) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!userId) return;

        const channelKey = `products:${userId}`;
        let sub = activeSubscriptions.get(channelKey);

        if (!sub) {
            const staleChannel = supabase.getChannels().find(
                (ch) => ch.topic === `realtime:${channelKey}` || ch.topic === channelKey
            );
            if (staleChannel) {
                supabase.removeChannel(staleChannel);
            }

            const channel = supabase
                .channel(channelKey)
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

            sub = { channel, subscribers: 1 };
            activeSubscriptions.set(channelKey, sub);
        } else {
            sub.subscribers += 1;
        }

        return () => {
            const currentSub = activeSubscriptions.get(channelKey);
            if (currentSub) {
                currentSub.subscribers -= 1;
                if (currentSub.subscribers <= 0) {
                    supabase.removeChannel(currentSub.channel);
                    activeSubscriptions.delete(channelKey);
                }
            }
        };
    }, [userId, queryClient]);
}