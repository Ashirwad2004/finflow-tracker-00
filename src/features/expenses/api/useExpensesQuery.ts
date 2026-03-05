import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useExpensesRealtime } from "./useExpensesRealtime";

export const useExpensesQuery = (userId: string | undefined, isBusinessMode: boolean = false) => {
    // 1. Setup the real-time listener
    // Any component fetching expenses automatically gets real-time sync!
    useExpensesRealtime(userId);

    // 2. Setup the query
    return useQuery({
        queryKey: ["expenses", userId],
        queryFn: async () => {
            if (!userId) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from("expenses")
                .select(`
          *,
          categories (
            id,
            name,
            color,
            icon
          )
        `)
                .eq("user_id", userId)
                .order("date", { ascending: false });

            if (error) throw error;
            return (data || []) as any[];
        },
        enabled: !!userId && !isBusinessMode, // Prevent fetching before user exists or in business mode
        staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
        refetchOnWindowFocus: true, // Syncs if the user goes to another tab and comes back
    });
};
