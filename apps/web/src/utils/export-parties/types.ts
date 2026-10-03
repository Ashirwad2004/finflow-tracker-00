export interface BusinessDetailsInfo {
    name?: string;
    address?: string;
    phone?: string;
    gst?: string;
    logo_url?: string;
}

export interface PartyExportItem {
    id: string;
    name: string;
    type: "customer" | "vendor" | "both";
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    gst_number?: string | null;
    opening_balance?: number;
    opening_balance_type?: "to_receive" | "to_pay";
    created_at?: string;
}

export interface PartyMetrics {
    partySales: any[];
    partyPurchases: any[];
    totalSalesAmount: number;
    totalSalesPaid: number;
    salesBalanceDue: number;
    totalPurchasesAmount: number;
    totalPurchasesPaid: number;
    purchasesBalanceDue: number;
    receivable: number;
    payable: number;
    totalRecords: number;
}
