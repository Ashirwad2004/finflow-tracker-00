export type SaleOrderStatus =
    | "draft"
    | "confirmed"
    | "partially_delivered"
    | "delivered"
    | "cancelled";

export type PurchaseOrderStatus =
    | "draft"
    | "sent"
    | "partially_received"
    | "received"
    | "cancelled";

export interface SaleOrderItem {
    id?: string;
    product_id?: string;
    name: string;
    description?: string;
    hsn_code?: string;
    unit?: string;
    quantity: number;
    price: number;
    tax_rate?: number;
    tax_amount?: number;
    total?: number;
    delivered_qty?: number; // cumulative units converted to sales invoices
    purchased_qty?: number; // cumulative units procured via purchase orders
}

export interface PurchaseOrderItem {
    id?: string;
    product_id?: string;
    name: string;
    description?: string;
    hsn_code?: string;
    unit?: string;
    quantity: number;
    price: number;
    tax_rate?: number;
    tax_amount?: number;
    total?: number;
    received_qty?: number; // cumulative units received on purchase bills
}

export interface SaleOrder {
    id: string;
    user_id: string;
    order_number: string;
    party_id?: string | null;
    customer_name: string;
    customer_phone?: string | null;
    customer_email?: string | null;
    customer_gstin?: string | null;
    billing_address?: string | null;
    shipping_address?: string | null;
    place_of_supply?: string | null;
    order_date: string;
    expected_delivery_date?: string | null;
    status: SaleOrderStatus;
    items: SaleOrderItem[];
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    advance_paid: number;
    notes?: string | null;
    terms_conditions?: string | null;
    created_at: string;
    updated_at: string;
}

export interface PurchaseOrder {
    id: string;
    user_id: string;
    po_number: string;
    party_id?: string | null;
    vendor_name: string;
    vendor_phone?: string | null;
    vendor_email?: string | null;
    vendor_gstin?: string | null;
    billing_address?: string | null;
    shipping_address?: string | null;
    place_of_supply?: string | null;
    order_date: string;
    expected_delivery_date?: string | null;
    status: PurchaseOrderStatus;
    items: PurchaseOrderItem[];
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    advance_paid: number;
    notes?: string | null;
    terms_conditions?: string | null;
    created_at: string;
    updated_at: string;
}

export interface SaleOrderInvoiceLink {
    id: string;
    user_id: string;
    sale_order_id: string;
    sale_id: string;
    delivered_items?: { item_id?: string; name: string; quantity: number }[];
    created_at: string;
    sale?: {
        invoice_number: string;
        date: string;
        total_amount: number;
        status: string;
    };
}

export interface SaleOrderPurchaseOrderLink {
    id: string;
    user_id: string;
    sale_order_id: string;
    purchase_order_id: string;
    procured_items?: { item_id?: string; name: string; quantity: number }[];
    created_at: string;
    purchase_order?: {
        po_number: string;
        vendor_name: string;
        order_date: string;
        total_amount: number;
        status: string;
    };
}

export interface PurchaseOrderBillLink {
    id: string;
    user_id: string;
    purchase_order_id: string;
    purchase_id: string;
    received_items?: { item_id?: string; name: string; quantity: number }[];
    created_at: string;
    purchase?: {
        bill_number: string;
        date: string;
        total_amount: number;
        status: string;
    };
}

export interface OrderStockSummary {
    ordered: number;
    reserved: number;
    delivered: number;
    invoiced: number;
    remainingDelivery: number;
    purchased: number;
    remainingProcurement: number;
}

export interface OrderTimelineEvent {
    id: string;
    date: string;
    title: string;
    description: string;
    type: "order_created" | "po_created" | "goods_received" | "delivery_invoiced" | "payment" | "cancelled";
    documentType?: "sale_order" | "purchase_order" | "sale_invoice" | "purchase_bill" | "payment";
    documentId?: string;
    documentNumber?: string;
    badgeText?: string;
    badgeVariant?: "default" | "secondary" | "outline" | "destructive";
}
