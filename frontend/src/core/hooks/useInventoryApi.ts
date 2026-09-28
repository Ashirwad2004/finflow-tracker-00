import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inventoryApi,
  InventoryAdjustmentPayload,
  InventoryMovementRecord,
  InventoryValuationSummary,
} from "@/core/api/inventory";

export function useInventoryValuation() {
  return useQuery({
    queryKey: ["api-inventory-valuation"],
    queryFn: () => inventoryApi.getValuation(),
    staleTime: 60000,
  });
}

export function useInventoryMovements(productId?: string) {
  return useQuery({
    queryKey: ["api-inventory-movements", productId],
    queryFn: () => inventoryApi.listMovements({ product_id: productId }),
    staleTime: 30000,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InventoryAdjustmentPayload) => inventoryApi.adjustStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["api-inventory-valuation"] });
      queryClient.invalidateQueries({ queryKey: ["api-inventory-movements"] });
    },
  });
}
