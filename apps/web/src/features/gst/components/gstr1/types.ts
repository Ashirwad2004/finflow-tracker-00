export interface SaleInvoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_gstin?: string;
    customer_state?: string;
    date: string;
    status: string;
    total_amount: number;
    subtotal: number;
    tax_amount: number;
    items: InvoiceLineItem[];
    payment_method?: string;
}

export interface InvoiceLineItem {
    description: string;
    quantity: number;
    price: number;
    discount: number;
    total: number;
    tax_rate?: number;
    hsn_code?: string;
}

export interface B2BRecord {
    gstin: string;
    customer_name: string;
    invoice_number: string;
    invoice_date: string;
    invoice_value: number;
    taxable_value: number;
    igst: number;
    cgst: number;
    sgst: number;
    place_of_supply: string;
    reverse_charge: boolean;
}

export interface B2CSRecord {
    place_of_supply: string;
    tax_rate: number;
    taxable_value: number;
    igst: number;
    cgst: number;
    sgst: number;
}

export interface B2CLRecord {
    invoice_number: string;
    invoice_date: string;
    invoice_value: number;
    place_of_supply: string;
    taxable_value: number;
    igst: number;
}

export interface HSNRecord {
    hsn_code: string;
    description: string;
    uqc: string;
    quantity: number;
    taxable_value: number;
    tax_rate: number;
    igst: number;
    cgst: number;
    sgst: number;
}

export interface PeriodOption {
    label: string;
    from: Date;
    to: Date;
}
