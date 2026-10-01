import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi, CreateInvoicePayload, UpdateInvoicePayload } from "@/core/api/invoices";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";

export const salesKeys = {
  all: ["sales"] as const,
  lists: () => [...salesKeys.all, "list"] as const,
  list: (userId?: string, filters?: Record<string, any>) =>
    [...salesKeys.lists(), { userId, ...filters }] as const,
  details: () => [...salesKeys.all, "detail"] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
  nextNumber: (prefix: string = "INV-") =>
    [...salesKeys.all, "next-number", prefix] as const,
};

/**
 * Fetches next auto-incremented invoice number.
 */
export function useNextInvoiceNumberQuery(prefix: string = "INV-", enabled: boolean = true) {
  return useQuery({
    queryKey: salesKeys.nextNumber(prefix),
    queryFn: () => invoicesApi.getNextInvoiceNumber(prefix),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetches sales records for a merchant with offline SQLite fallback.
 */
export function useSalesInvoicesQuery(userId?: string) {
  return useQuery({
    queryKey: salesKeys.list(userId),
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("sales")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (!error && data) {
          sqliteService.upsertBatch("sales", userId, data).catch(() => {});
          return data;
        }
      } catch {
        // Fall back to SQLite cache
      }

      const local = await sqliteService.getAll<any>("sales", userId);
      return local || [];
    },
    enabled: Boolean(userId),
  });
}

/**
 * Mutation hook to create an authoritative invoice.
 */
export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => invoicesApi.createInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}

/**
 * Mutation hook to update an invoice.
 */
export function useUpdateInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInvoicePayload }) =>
      invoicesApi.updateInvoice(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.all });
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}
