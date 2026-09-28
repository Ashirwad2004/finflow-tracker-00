import { apiClient } from "./apiClient";

export interface InvoiceItemPayload {
  id?: string;
  product_id?: string;
  name?: string;
  description?: string;
  quantity: number;
  price: number;
  discount?: number;
  tax_rate?: number;
  unit?: string;
  hsn_code?: string;
}

export type InvoiceStatus = "paid" | "partial" | "pending" | "overdue" | "cancelled";

export interface CreateInvoicePayload {
  party_id?: string | null;
  customer_name?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_gstin?: string | null;
  place_of_supply?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  date?: string;
  due_date?: string | null;
  items: InvoiceItemPayload[];
  overall_discount?: number;
  tax_rate?: number;
  is_item_wise_tax?: boolean;
  round_off?: boolean;
  status: InvoiceStatus;
  amount_paid?: number;
  payment_method?: string | null;
  notes?: string | null;
  document_type?: string;
  invoice_number_prefix?: string;
  custom_invoice_number?: string | null;
}

export interface UpdateInvoicePayload {
  customer_name?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_gstin?: string | null;
  place_of_supply?: string | null;
  due_date?: string | null;
  status?: InvoiceStatus;
  amount_paid?: number;
  payment_method?: string | null;
  notes?: string | null;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  party_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_gstin?: string | null;
  place_of_supply?: string | null;
  date?: string;
  due_date?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_rate?: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  payment_method?: string | null;
  document_type?: string;
  items: any[];
  notes?: string | null;
  created_at?: string;
}

export const invoicesApi = {
  createInvoice: async (payload: CreateInvoicePayload): Promise<InvoiceRecord> => {
    const res = await apiClient.post<InvoiceRecord>("/api/v1/invoices", payload);
    return res.data;
  },

  listInvoices: async (params?: {
    status?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<InvoiceRecord[]> => {
    const res = await apiClient.get<InvoiceRecord[]>("/api/v1/invoices", { params });
    return res.data;
  },

  getInvoice: async (id: string): Promise<InvoiceRecord> => {
    const res = await apiClient.get<InvoiceRecord>(`/api/v1/invoices/${id}`);
    return res.data;
  },

  getNextInvoiceNumber: async (prefix: string = "INV-"): Promise<string> => {
    const res = await apiClient.get<{ invoice_number: string }>("/api/v1/invoices/next-number", {
      params: { prefix },
    });
    return res.data.invoice_number;
  },

  updateInvoice: async (
    id: string,
    payload: UpdateInvoicePayload
  ): Promise<InvoiceRecord> => {
    const res = await apiClient.patch<InvoiceRecord>(`/api/v1/invoices/${id}`, payload);
    return res.data;
  },
};
