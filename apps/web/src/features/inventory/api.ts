import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { offlineMutate } from "@/core/offline/apiService";
import { Product } from "./types";
import { v4 as uuidv4 } from "uuid";

export const inventoryKeys = {
  all: ["products"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (userId?: string) => [...inventoryKeys.lists(), userId] as const,
  details: () => [...inventoryKeys.all, "detail"] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
};

/**
 * Fetches all inventory products for tenant with offline SQLite fallback.
 */
export function useProductsQuery(userId?: string) {
  return useQuery({
    queryKey: inventoryKeys.list(userId),
    queryFn: async () => {
      if (!userId) return [];

      try {
        const { data, error } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("user_id", userId)
          .order("name", { ascending: true });

        if (!error && data && data.length > 0) {
          sqliteService.upsertBatch("products", userId, data).catch(() => {});
          return data as Product[];
        }
      } catch {
        // Fall back to SQLite offline cache
      }

      const local = await sqliteService.getAll<Product>("products", userId);
      return local || [];
    },
    enabled: Boolean(userId),
  });
}

/**
 * Mutation hook to create or update an inventory product.
 */
export function useSaveProductMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData: Partial<Product>) => {
      const isEditing = Boolean(productData.id);
      const productId = productData.id || uuidv4();

      const payload = {
        ...productData,
        id: productId,
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      if (!isEditing) {
        payload.created_at = new Date().toISOString();
      }

      await offlineMutate({
        table: "products",
        action: isEditing ? "UPDATE" : "INSERT",
        data: payload,
      });

      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
