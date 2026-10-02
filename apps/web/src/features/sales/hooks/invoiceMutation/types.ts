import { SalesSettings } from "@/core/hooks/use-sales-settings";

export interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
    discount: number;
    tax_rate?: number;
    total: number;
    hsn_code?: string;
    unit?: string;
}

export interface InvoiceFormValues {
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    customer_gstin: string;
    place_of_supply?: string;
    billing_address?: string;
    shipping_address?: string;
    is_reverse_charge?: boolean;
    document_type?: "invoice" | "credit_note" | "debit_note";
    original_invoice_id?: string;
    is_amendment?: boolean;
    amended_invoice_id?: string;
    invoice_number: string;
    date: string;
    due_date?: string;
    notes?: string;
    items: InvoiceItem[];
    tax_rate: number;
    overall_discount: number;
    status: "paid" | "pending" | "partial";
    amount_paid?: number;
    irn?: string;
    eway_bill_number?: string;
    qr_code?: string;
    quick_item_name?: string;
    quick_total_amount?: number;
}

export interface UseCreateInvoiceMutationParams {
    authUser: any;
    profile: any;
    invoiceToEdit?: any;
    salesSettings?: SalesSettings;
    itemSettings?: any;
    selectedParty: any;
    isQuickBilling: boolean;
    isItemWiseTax: boolean;
    dbProducts: any[];
    parties?: any[];
    partyPreviousBalance: number;
    partyClosingDue: number;
    sendWhatsApp: boolean;
    sendInvoiceMutation: any;
    onSuccess?: (savedInvoice: any) => void;
    onOpenChange: (open: boolean) => void;
    reset: () => void;
    setActiveStep: (step: "form" | "preview") => void;
    setSavedInvoiceData: (data: any) => void;
    setDraftPreviewData: (data: any) => void;
}
