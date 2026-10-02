export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayPaymentResponse) => Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CreateOrderResponse {
  success: boolean;
  gatewayOrderId: string;
  order_id?: string;
  amount?: number;
  key_id?: string;
  currency?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  status?: string;
  paymentId?: string;
}

export interface SubscriptionStatus {
  plan: string;
  status: string;
  current_period_end?: string | null;
  current_period_start?: string | null;
}
