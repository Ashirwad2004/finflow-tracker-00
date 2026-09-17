import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useExpensesRealtime } from "./useExpensesRealtime";
import { sqliteService } from "@/core/offline/sqliteService";

export const useExpensesQuery = (userId: string | undefined, isBusinessMode: boolean = false) => {
    // 1. Setup the real-time listener
    // Any component fetching expenses automatically gets real-time sync!
    useExpensesRealtime(userId);
    const queryClient = useQueryClient();

    // 2. Setup the query with Offline Fallback
    return useQuery({
        queryKey: ["expenses", userId],
        queryFn: async () => {
            if (!userId) return [];

            try {
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

                if (!error && data) return data as any[];
            } catch (err) {
                console.warn("[useExpensesQuery] Supabase fetch failed offline, falling back to cache:", err);
            }

            const cached = queryClient.getQueryData<any[]>(["expenses", userId]);
            if (cached && cached.length > 0) return cached;
            const localData = await sqliteService.getAll<any>("expenses", userId);
            return localData || [];
        },
        enabled: !!userId && !isBusinessMode, // Prevent fetching before user exists or in business mode
        staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
        refetchOnWindowFocus: true, // Syncs if the user goes to another tab and comes back
    });
};