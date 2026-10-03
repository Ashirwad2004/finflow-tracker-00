import { apiClient } from "./apiClient";
import type {
  OrderCreate,
  SubscriptionOrderCreate,
  PaymentVerify,
  PaymentRefund,
} from "@rupaybill/api-types";

export interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  amount: number;
  currency: string;
  key_id?: string;
  notes?: Record<string, any>;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  payment_id?: string;
  order_id?: string;
  status?: string;
}

export const paymentsApi = {
  createOrder: async (payload: OrderCreate): Promise<CreateOrderResponse> => {
    const res = await apiClient.post<CreateOrderResponse>("/api/v1/payments/create-order", payload);
    return res.data;
  },

  createSubscriptionOrder: async (payload: SubscriptionOrderCreate): Promise<CreateOrderResponse> => {
    const res = await apiClient.post<CreateOrderResponse>(
      "/api/v1/payments/create-subscription-order",
      payload
    );
    return res.data;
  },

  verifyPayment: async (payload: PaymentVerify): Promise<VerifyPaymentResponse> => {
    const res = await apiClient.post<VerifyPaymentResponse>("/api/v1/payments/verify", payload);
    return res.data;
  },

  refundPayment: async (payload: PaymentRefund): Promise<any> => {
    const res = await apiClient.post("/api/v1/payments/refund", payload);
    return res.data;
  },
};
