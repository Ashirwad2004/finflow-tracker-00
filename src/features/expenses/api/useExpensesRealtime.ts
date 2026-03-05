import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";

export const useExpensesRealtime = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Prevent connecting if the user isn't logged in yet
        if (!userId) return;

        // Create a unique channel name per user to prevent cross-talk
        const channelName = `realtime:expenses:${userId}`;

        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "*", // Listen to INSERT, UPDATE, and DELETE
                    schema: "public",
                    table: "expenses",
                    filter: `user_id=eq.${userId}`, // CRITICAL: Stop global table listening. Only listen to this user's rows.
                },
                (payload) => {
                    console.log("Real-time expenses change received:", payload);

                    // Let React Query intelligently refetch in the background.
                    queryClient.invalidateQueries({ queryKey: ["expenses", userId] });
                    // Invalidate specific report queries if they exist
                    queryClient.invalidateQueries({ queryKey: ["reports-expenses", userId] });
                }
            )
            .subscribe();

        // CRITICAL: Cleanup function to close the WebSocket when the component unmounts.
        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);
};