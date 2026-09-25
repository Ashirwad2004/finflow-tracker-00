import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChannelSubscription {
    channel: RealtimeChannel;
    subscribers: number;
}

// Module-level subscription map to prevent duplicate channels across concurrent components
const activeSubscriptions = new Map<string, ChannelSubscription>();

export const useExpensesRealtime = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Prevent connecting if the user isn't logged in yet
        if (!userId) return;

        const channelKey = `expenses:${userId}`;
        let sub = activeSubscriptions.get(channelKey);

        if (!sub) {
            // Remove any stale channel instance left in Supabase's internal registry (e.g. from HMR or fast reload)
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
                        event: "*", // Listen to INSERT, UPDATE, and DELETE
                        schema: "public",
                        table: "expenses",
                        filter: `user_id=eq.${userId}`, // Stop global table listening. Only listen to this user's rows.
                    },
                    () => {
                        // Let React Query intelligently refetch in the background.
                        queryClient.invalidateQueries({ queryKey: ["expenses", userId] });
                        // Invalidate specific report queries if they exist
                        queryClient.invalidateQueries({ queryKey: ["reports-expenses", userId] });
                    }
                )
                .subscribe();

            sub = { channel, subscribers: 1 };
            activeSubscriptions.set(channelKey, sub);
        } else {
            // Channel already established and listening. Increment subscriber counter.
            sub.subscribers += 1;
        }

        // Cleanup: decrement subscriber count; only destroy channel when all subscribers unmount
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
};
