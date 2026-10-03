export interface OrdersDrawerProps {
  open: boolean;
  onClose: () => void;
  formatCurrency: (n: number) => string;
  storeId: string | null;
  savedOrderIds: string[];
  merchantProfile?: any;
  onPayOrder?: (order: any) => void;
}

export interface OrderItem {
  product_name?: string;
  quantity?: number;
  price_at_time?: number;
}

export interface OrderRecord {
  id: string;
  created_at: string;
  total_amount: number | string;
  delivery_charge?: number | string;
  status: string;
  items?: string | OrderItem[];
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  payment?: {
    status?: string;
    payment_method?: string;
    invoices?: { invoice_number?: string };
  } | null;
  returnRequest?: {
    status?: string;
    reason?: string;
    image_url?: string;
  } | null;
}
