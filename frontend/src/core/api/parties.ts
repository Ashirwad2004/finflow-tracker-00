import { apiClient } from "./apiClient";

export interface PartyPayload {
  name: string;
  type?: "customer" | "vendor" | "both";
  phone?: string | null;
  email?: string | null;
  gst_number?: string | null;
  address?: string | null;
  opening_balance?: number;
  opening_balance_type?: "to_receive" | "to_pay";
  notes?: string | null;
}

export interface PartyRecord {
  id: string;
  user_id: string;
  name: string;
  type: string;
  phone?: string | null;
  email?: string | null;
  gst_number?: string | null;
  address?: string | null;
  opening_balance: number;
  opening_balance_type?: string;
  current_balance?: number;
  total_sales?: number;
  total_purchases?: number;
  created_at?: string;
}

export const partiesApi = {
  listParties: async (params?: {
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PartyRecord[]> => {
    const res = await apiClient.get<PartyRecord[]>("/api/v1/parties", { params });
    return res.data;
  },

  getParty: async (id: string): Promise<PartyRecord> => {
    const res = await apiClient.get<PartyRecord>(`/api/v1/parties/${id}`);
    return res.data;
  },

  createParty: async (payload: PartyPayload): Promise<PartyRecord> => {
    const res = await apiClient.post<PartyRecord>("/api/v1/parties", payload);
    return res.data;
  },

  updateParty: async (id: string, payload: Partial<PartyPayload>): Promise<PartyRecord> => {
    const res = await apiClient.patch<PartyRecord>(`/api/v1/parties/${id}`, payload);
    return res.data;
  },
};
