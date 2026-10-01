import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { offlineMutate } from "@/core/offline/apiService";
import { PaymentRecord, PaymentCreatePayload, PaymentType } from "./types";
import { v4 as uuidv4 } from "uuid";

export const paymentKeys = {
  all: ["payments"] as const,
  lists: () => [...paymentKeys.all, "list"] as const,
  list: (userId?: string, type?: PaymentType) =>
    [...paymentKeys.lists(), { userId, type }] as const,
  details: () => [...paymentKeys.all, "detail"] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

/**
 * Fetches payment records for tenant with offline SQLite fallback.
 */
export function usePaymentsQuery(userId?: string, type?: PaymentType) {
  return useQuery({
    queryKey: paymentKeys.list(userId, type),
    queryFn: async () => {
      if (!userId) return [];

      try {
        let query = (supabase as any)
          .from("payments")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (type) {
          query = query.eq("payment_type", type);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          sqliteService.upsertBatch("payments", userId, data).catch(() => {});
          return data as PaymentRecord[];
        }
      } catch {
        // Fall back to SQLite offline cache
      }

      const local = await sqliteService.getAll<PaymentRecord>("payments", userId);
      return local || [];
    },
    enabled: Boolean(userId),
  });
}

/**
 * Mutation hook to record a payment-in or payment-out.
 */
export function useRecordPaymentMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PaymentCreatePayload) => {
      const paymentId = uuidv4();
      const record = {
        ...payload,
        id: paymentId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await offlineMutate({
        table: "payments",
        action: "INSERT",
        data: record,
      });

      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}
