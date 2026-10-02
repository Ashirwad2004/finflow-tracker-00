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

export interface OrderReturn {
    id: string;
    order_id: string;
    reason: string;
    status: "pending" | "approved" | "rejected" | string;
    image_url?: string | null;
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

export interface SalesmanStats {
    pending: number;
    active: number;
    completed: number;
    returns: number;
}

export const statusConfig: Record<string, { label: string; color: string }> = {
    pending:   { label: "Pending",   color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30" },
    accepted:  { label: "Accepted",  color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30" },
    completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30" },
    rejected:  { label: "Rejected",  color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30" },
};
