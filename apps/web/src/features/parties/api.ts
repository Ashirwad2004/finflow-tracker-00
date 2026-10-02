import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { offlineMutate } from "@/core/offline/apiService";
import { Party, PartyType } from "./types";
import { v4 as uuidv4 } from "uuid";

export const partyKeys = {
  all: ["parties"] as const,
  lists: () => [...partyKeys.all, "list"] as const,
  list: (userId?: string, type?: PartyType) =>
    [...partyKeys.lists(), { userId, type }] as const,
  details: () => [...partyKeys.all, "detail"] as const,
  detail: (id: string) => [...partyKeys.details(), id] as const,
};

/**
 * Fetches all parties for the active tenant with offline SQLite fallback.
 */
export function usePartiesQuery(userId?: string, type?: PartyType) {
  return useQuery({
    queryKey: partyKeys.list(userId, type),
    queryFn: async () => {
      if (!userId) return [];

      try {
        let query = (supabase as any)
          .from("parties")
          .select("*")
          .eq("user_id", userId)
          .order("name", { ascending: true });

        if (type && type !== "both") {
          query = query.or(`type.eq.${type},type.eq.both`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          sqliteService.upsertBatch("parties", userId, data).catch(() => {});
          return data as Party[];
        }
      } catch {
        // Fall back to SQLite offline cache
      }

      const local = await sqliteService.getAll<Party>("parties", userId);
      return local || [];
    },
    enabled: Boolean(userId),
  });
}

/**
 * Mutation hook to create or edit a party with optimistic & offline support.
 */
export function useSavePartyMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partyData: Partial<Party>) => {
      const isEditing = Boolean(partyData.id);
      const partyId = partyData.id || uuidv4();

      const payload = {
        ...partyData,
        id: partyId,
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      if (!isEditing) {
        payload.created_at = new Date().toISOString();
      }

      await offlineMutate({
        table: "parties",
        action: isEditing ? "update" : "insert",
        data: payload,
      });

      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partyKeys.all });
    },
  });
}
