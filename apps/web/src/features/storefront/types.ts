export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  products: {
    name: string;
  } | null;
}

export interface OnlineOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: string;
  total_amount: number;
  delivery_charge: number;
  created_at: string;
  online_order_items: OrderItem[];
}

export const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }
> = {
  pending: { label: "Pending", variant: "outline", color: "text-amber-600 bg-amber-50 border-amber-200" },
  accepted: { label: "Accepted", variant: "secondary", color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed: { label: "Completed", variant: "default", color: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "Rejected", variant: "destructive", color: "text-red-600 bg-red-50 border-red-200" },
};

export interface OrderReturn {
  id: string;
  order_id: string;
  reason: string;
  image_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  online_orders?: {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    total_amount: number;
    created_at: string;
  };
}

export interface StoreSalesman {
  id: string;
  store_id: string;
  salesman_name: string;
  salesman_email: string;
  salesman_phone: string | null;
  can_manage_orders: boolean;
  can_manage_returns: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  status: "success" | "pending" | "failed" | "refunded";
  payment_method: string;
  gateway_payment_id?: string;
  gateway_order_id?: string;
  created_at: string;
  updated_at: string;
  invoices?: Array<{ invoice_number: string }>;
  online_orders?: {
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    delivery_charge?: number;
    online_order_items?: OrderItem[];
  };
  refunds?: Array<{
    gateway_refund_id?: string;
    created_at?: string;
    reason?: string;
  }>;
}

export interface PaymentStats {
  paymentMethodsBreakdown: Array<{ name: string; value: number }>;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  ip_address: string | null;
  created_at: string;
  details: any;
  payments?: {
    gateway_order_id?: string;
  };
}

export type DateFilterPeriod = "today" | "week" | "month" | "year" | "all";
