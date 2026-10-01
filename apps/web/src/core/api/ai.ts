import { apiClient } from "./apiClient";
import type {
  FinanceInsightRequest,
  FinanceInsightResponse,
  BusinessInsightRequest,
  BusinessInsightResponse,
  ProductSearchRequest,
  ProductSearchResponse,
  ProductContentRequest,
  ProductContentResponse,
  ScanBillRequest,
  ScanBillResponse,
  SmartExpenseParseRequest,
  SmartExpenseParseResponse,
  MagicAddParseRequest,
  MagicAddParseResponse,
  CompletionRequest,
  CompletionResponse,
} from "@rupaybill/api-types";

export const aiApi = {
  createCompletion: async (payload: CompletionRequest): Promise<CompletionResponse> => {
    const res = await apiClient.post<CompletionResponse>("/api/v1/ai/completions", payload);
    return res.data;
  },

  getFinanceInsights: async (payload: FinanceInsightRequest): Promise<FinanceInsightResponse> => {
    const res = await apiClient.post<FinanceInsightResponse>("/api/v1/ai/insights/finance", payload);
    return res.data;
  },

  getBusinessInsights: async (payload: BusinessInsightRequest): Promise<BusinessInsightResponse> => {
    const res = await apiClient.post<BusinessInsightResponse>("/api/v1/ai/insights/business", payload);
    return res.data;
  },

  searchProducts: async (payload: ProductSearchRequest): Promise<ProductSearchResponse> => {
    const res = await apiClient.post<ProductSearchResponse>("/api/v1/ai/products/search", payload);
    return res.data;
  },

  generateProductContent: async (payload: ProductContentRequest): Promise<ProductContentResponse> => {
    const res = await apiClient.post<ProductContentResponse>("/api/v1/ai/products/content", payload);
    return res.data;
  },

  scanBill: async (payload: ScanBillRequest): Promise<ScanBillResponse> => {
    const res = await apiClient.post<ScanBillResponse>("/api/v1/ai/ocr/scan-bill", payload);
    return res.data;
  },

  parseExpense: async (payload: SmartExpenseParseRequest): Promise<SmartExpenseParseResponse> => {
    const res = await apiClient.post<SmartExpenseParseResponse>("/api/v1/ai/parse/expense", payload);
    return res.data;
  },

  parseMagicAdd: async (payload: MagicAddParseRequest): Promise<MagicAddParseResponse> => {
    const res = await apiClient.post<MagicAddParseResponse>("/api/v1/ai/parse/magic-add", payload);
    return res.data;
  },
};
