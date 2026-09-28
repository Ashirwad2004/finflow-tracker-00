import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchasesApi, CreatePurchasePayload, PurchaseRecord } from "@/core/api/purchases";

export function usePurchases(params?: {
  status?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["api-purchases", params],
    queryFn: () => purchasesApi.listPurchases(params),
    staleTime: 30000,
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: ["api-purchase", id],
    queryFn: () => purchasesApi.getPurchase(id),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchasePayload) => purchasesApi.recordPurchase(payload),
    onSuccess: (data: PurchaseRecord) => {
      queryClient.invalidateQueries({ queryKey: ["api-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      queryClient.invalidateQueries({ queryKey: ["api-inventory-valuation"] });
      queryClient.invalidateQueries({ queryKey: ["api-inventory-movements"] });
    },
  });
}
