import { PurchaseItemRowData } from "../PurchaseItemsTable";

export interface ExtractedPurchaseBill {
    vendor_name: string;
    vendor_gstin?: string;
    vendor_phone?: string;
    place_of_supply?: string;
    bill_number?: string;
    date?: string;
    due_date?: string;
    subtotal?: number;
    tax_amount?: number;
    tax_rate?: number;
    discount_amount?: number;
    total_amount?: number;
    amount_paid?: number;
    payment_status?: "paid" | "partial" | "pending";
    notes?: string;
    items: PurchaseItemRowData[];
    file_name?: string;
    is_pdf?: boolean;
    attachment_data?: string;
}

export interface PurchaseBillScannerProps {
    onExtract: (data: ExtractedPurchaseBill, autoSaveImmediately?: boolean) => void;
    onClose?: () => void;
}

export interface ScannedFileMeta {
    name: string;
    isPdf: boolean;
    sizeFormatted: string;
    previewUrl?: string;
}
