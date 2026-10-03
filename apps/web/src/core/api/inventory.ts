import { apiClient } from "./apiClient";

export interface InventoryAdjustmentPayload {
  product_id: string;
  adjustment_type: "addition" | "deduction" | "set_exact" | "damage" | "audit";
  quantity: number;
  notes?: string;
}

export interface InventoryMovementRecord {
  id: string;
  product_id: string;
  product_name?: string;
  type: string;
  quantity: number;
  previous_stock: number;
  resulting_stock: number;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface InventoryValuationSummary {
  total_products: number;
  total_stock_units: number;
  total_retail_value: number;
  total_cost_value: number;
  low_stock_count: number;
}

export const inventoryApi = {
  adjustStock: async (payload: InventoryAdjustmentPayload): Promise<any> => {
    const res = await apiClient.post("/api/v1/inventory/adjust", payload);
    return res.data;
  },

  listMovements: async (params?: {
    product_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<InventoryMovementRecord[]> => {
    const res = await apiClient.get<InventoryMovementRecord[]>("/api/v1/inventory/movements", {
      params,
    });
    return res.data;
  },

  getValuation: async (): Promise<InventoryValuationSummary> => {
    const res = await apiClient.get<InventoryValuationSummary>("/api/v1/inventory/valuation");
    return res.data;
  },
};
