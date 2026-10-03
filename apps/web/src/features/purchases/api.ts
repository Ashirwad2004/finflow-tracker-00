import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { PurchaseBill } from "./types";

export const purchaseKeys = {
  all: ["purchases"] as const,
  lists: () => [...purchaseKeys.all, "list"] as const,
  list: (userId?: string) => [...purchaseKeys.lists(), userId] as const,
  details: () => [...purchaseKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseKeys.details(), id] as const,
};

/**
 * Fetches all purchases for the active tenant with offline SQLite fallback.
 */
export function usePurchasesQuery(userId?: string) {
  return useQuery({
    queryKey: purchaseKeys.list(userId),
    queryFn: async () => {
      if (!userId) return [];

      try {
        const { data, error } = await (supabase as any)
          .from("purchases")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (!error && data && data.length > 0) {
          sqliteService.upsertBatch("purchases", userId, data).catch(() => {});
          return data as PurchaseBill[];
        }
      } catch {
        // Fall back to SQLite offline cache
      }

      const local = await sqliteService.getAll<PurchaseBill>("purchases", userId);
      return local || [];
    },
    enabled: Boolean(userId),
  });
}
