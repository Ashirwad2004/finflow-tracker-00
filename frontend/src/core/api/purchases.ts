import { apiClient } from "./apiClient";

export interface PurchaseItemPayload {
  id?: string;
  product_id?: string;
  name?: string;
  description: string;
  quantity: number;
  price: number;
  discount?: number;
  tax_rate?: number;
  unit?: string;
}

export interface CreatePurchasePayload {
  party_id?: string | null;
  vendor_name: string;
  vendor_phone?: string | null;
  vendor_email?: string | null;
  vendor_gstin?: string | null;
  place_of_supply?: string | null;
  bill_number?: string | null;
  date?: string;
  due_date?: string | null;
  items: PurchaseItemPayload[];
  discount_amount?: number;
  tax_rate?: number;
  status?: "paid" | "partial" | "pending" | "overdue";
  amount_paid?: number;
  notes?: string | null;
  attachment_url?: string | null;
}

export interface PurchaseRecord {
  id: string;
  party_id?: string | null;
  bill_number?: string | null;
  vendor_name: string;
  vendor_phone?: string | null;
  vendor_email?: string | null;
  vendor_gstin?: string | null;
  place_of_supply?: string | null;
  date?: string;
  due_date?: string | null;
  subtotal?: number;
  discount_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: "paid" | "partial" | "pending" | "overdue";
  items: any[];
  notes?: string | null;
  attachment_url?: string | null;
  created_at?: string;
}

export const purchasesApi = {
  recordPurchase: async (payload: CreatePurchasePayload): Promise<PurchaseRecord> => {
    const res = await apiClient.post<PurchaseRecord>("/api/v1/purchases", payload);
    return res.data;
  },

  listPurchases: async (params?: {
    status?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<PurchaseRecord[]> => {
    const res = await apiClient.get<PurchaseRecord[]>("/api/v1/purchases", { params });
    return res.data;
  },

  getPurchase: async (id: string): Promise<PurchaseRecord> => {
    const res = await apiClient.get<PurchaseRecord>(`/api/v1/purchases/${id}`);
    return res.data;
  },
};
