import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChannelSubscription {
    channel: RealtimeChannel;
    subscribers: number;
}

const activeSubscriptions = new Map<string, ChannelSubscription>();

/** Refetch public storefront products when stock changes (sales, orders, admin edits). */
export function useStorefrontInventoryRealtime(storeId: string | null) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!storeId) return;

        const channelKey = `store-products:${storeId}`;
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
                        filter: `user_id=eq.${storeId}`,
                    },
                    () => {
                        queryClient.invalidateQueries({ queryKey: ["publicStoreProducts", storeId] });
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
    }, [storeId, queryClient]);
}
