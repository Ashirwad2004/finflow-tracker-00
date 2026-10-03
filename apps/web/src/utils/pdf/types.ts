import jsPDF from "jspdf";

export interface InvoiceDetails {
    invoice_number: string;
    date: string;
    due_date?: string;
    status?: 'paid' | 'pending' | 'overdue' | 'draft' | 'partial' | string;
    amount_paid?: number;
    balance_due?: number;
    payment_method?: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    billing_address?: string;
    customer_address?: string;
    customer_state?: string;
    place_of_supply?: string;
    items: {
        description: string;
        quantity: number | string;
        price: number | string;
        total: number | string;
        hsn_code?: string;
        unit?: string;
        tax_rate?: number | string;
        discount?: number | string;
    }[];
    subtotal: number;
    discount_amount?: number;
    tax_rate?: number;
    tax_amount?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total_amount: number;
    customer_gstin?: string;
    previous_balance?: number;
    total_due_balance?: number;
    party_pending_balance?: number;
    notes?: string;
    irn?: string;
    eway_bill_number?: string;
    qr_code?: string;
    business_details?: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        state?: string;
        gst?: string;
        logo_url?: string;
        signature_url?: string;
        bank_name?: string;
        bank_account_no?: string;
        bank_ifsc?: string;
        bank_branch?: string;
        upi_id?: string;
    };
}

export type InvoicePdfTheme = 'startup-gradient' | 'tally-accounting' | 'sale-invoice';

export type UniversalDocumentType = 
    | 'invoice' 
    | 'purchase_bill' 
    | 'sale_order' 
    | 'purchase_order' 
    | 'delivery_challan' 
    | 'proforma';

export interface DocumentDescriptor {
    type: UniversalDocumentType;
    title: string;
    numberLabel: string;
    dateLabel: string;
    dueDateLabel: string;
    defaultDueDateText: string;
    statusHeaderLabel: string;
    senderLabel: string;
    partyLabel: string;
    consigneeLabel: string;
    subtotalLabel: string;
    totalLabel: string;
    paidLabel: string;
    balanceLabel: string;
    signatoryCompanyText: (bizName: string) => string;
    signatoryRoleText: string;
    declarationTitle: string;
    defaultDeclaration: string;
    enableUpiQr: boolean;
    isPurchaseFlow: boolean;
    isOrder: boolean;
}

export const DOCUMENT_DESCRIPTORS: Record<UniversalDocumentType, DocumentDescriptor> = {
    invoice: {
        type: 'invoice',
        title: 'TAX INVOICE',
        numberLabel: 'Invoice No:',
        dateLabel: 'Dated:',
        dueDateLabel: 'Delivery Note / Due:',
        defaultDueDateText: 'Direct Delivery',
        statusHeaderLabel: 'Mode/Terms:',
        senderLabel: 'Sender / Company Details:',
        partyLabel: 'Buyer (Bill to):',
        consigneeLabel: 'Consignee (Ship to):',
        subtotalLabel: 'Subtotal:',
        totalLabel: 'Grand Total:',
        paidLabel: 'Amount Paid:',
        balanceLabel: 'Balance Due:',
        signatoryCompanyText: (biz) => `for ${biz.toUpperCase()}`,
        signatoryRoleText: 'Authorized Signatory',
        declarationTitle: 'Declaration:',
        defaultDeclaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
        enableUpiQr: true,
        isPurchaseFlow: false,
        isOrder: false
    },
    purchase_bill: {
        type: 'purchase_bill',
        title: 'PURCHASE BILL',
        numberLabel: 'Bill No:',
        dateLabel: 'Bill Date:',
        dueDateLabel: 'Payment Due:',
        defaultDueDateText: 'Immediate / Net 0',
        statusHeaderLabel: 'Bill Status:',
        senderLabel: 'Recipient / Consignee (Purchaser):',
        partyLabel: 'Supplier / Vendor (Billed By):',
        consigneeLabel: 'Delivery / Goods Inward At:',
        subtotalLabel: 'Subtotal:',
        totalLabel: 'Total Bill Value:',
        paidLabel: 'Amount Paid:',
        balanceLabel: 'Balance Payable:',
        signatoryCompanyText: (biz) => `for ${biz.toUpperCase()} (Purchaser)`,
        signatoryRoleText: 'Authorized Receiver / Signatory',
        declarationTitle: 'Declaration:',
        defaultDeclaration: 'We acknowledge receipt of inward goods/services as per the quantities and rates invoiced above, subject to internal verification and GST ITC eligibility.',
        enableUpiQr: false,
        isPurchaseFlow: true,
        isOrder: false
    },
    sale_order: {
        type: 'sale_order',
        title: 'SALE ORDER',
        numberLabel: 'Order No:',
        dateLabel: 'Order Date:',
        dueDateLabel: 'Expected Delivery:',
        defaultDueDateText: 'Standard Fulfillment',
        statusHeaderLabel: 'Order Status:',
        senderLabel: 'Seller / Supplier Details:',
        partyLabel: 'Customer Details (Bill To):',
        consigneeLabel: 'Shipping Address (Ship To):',
        subtotalLabel: 'Subtotal:',
        totalLabel: 'Total Order Value:',
        paidLabel: 'Advance Received:',
        balanceLabel: 'Balance on Delivery:',
        signatoryCompanyText: (biz) => `for ${biz.toUpperCase()}`,
        signatoryRoleText: 'Authorized Signatory',
        declarationTitle: 'Order Notes & Terms:',
        defaultDeclaration: 'Goods will be supplied as per the agreed specifications and delivery schedule above. Subject to local jurisdiction.',
        enableUpiQr: true,
        isPurchaseFlow: false,
        isOrder: true
    },
    purchase_order: {
        type: 'purchase_order',
        title: 'PURCHASE ORDER',
        numberLabel: 'PO No:',
        dateLabel: 'PO Date:',
        dueDateLabel: 'Expected Delivery:',
        defaultDueDateText: 'Standard Procurement',
        statusHeaderLabel: 'PO Status:',
        senderLabel: 'Issued By / Purchaser:',
        partyLabel: 'Vendor / Supplier Details:',
        consigneeLabel: 'Deliver To / Destination:',
        subtotalLabel: 'Subtotal:',
        totalLabel: 'Total PO Value:',
        paidLabel: 'Advance Paid:',
        balanceLabel: 'Balance on Delivery:',
        signatoryCompanyText: (biz) => `for ${biz.toUpperCase()} (Purchaser)`,
        signatoryRoleText: 'Authorized Procurement Officer',
        declarationTitle: 'Procurement Instructions:',
        defaultDeclaration: 'Please supply the goods described above adhering strictly to the agreed purchase rates, delivery deadlines, and packaging standards.',
        enableUpiQr: false,
        isPurchaseFlow: true,
        isOrder: true
    },
    delivery_challan: {
        type: 'delivery_challan',
        title: 'DELIVERY CHALLAN',
        numberLabel: 'Challan No:',
        dateLabel: 'Challan Date:',
        dueDateLabel: 'Delivery Date:',
        defaultDueDateText: 'Direct Delivery',
        statusHeaderLabel: 'Dispatch Status:',
        senderLabel: 'Dispatched By:',
        partyLabel: 'Consignee / Recipient:',
        consigneeLabel: 'Delivery Location:',
        subtotalLabel: 'Subtotal:',
        totalLabel: 'Declared Value:',
        paidLabel: 'Amount Received:',
        balanceLabel: 'Balance Payable:',
        signatoryCompanyText: (biz) => `for ${biz.toUpperCase()}`,
        signatoryRoleText: 'Authorized Dispatcher',
        declarationTitle: 'Transportation Terms:',
        defaultDeclaration: 'Goods dispatched for transportation / delivery. Not an invoice for sale.',
        enableUpiQr: false,
        isPurchaseFlow: false,
        isOrder: false
    },
    proforma: {
        type: 'proforma',
        title: 'PROFORMA INVOICE',
        numberLabel: 'Proforma No:',
        dateLabel: 'Date:',
        dueDateLabel: 'Validity Until:',
        defaultDueDateText: '30 Days Validity',
        statusHeaderLabel: 'Quote Status:',
        senderLabel: 'Quoted By:',
        partyLabel: 'Quotation For:',
        consigneeLabel: 'Proposed Delivery To:',
        subtotalLabel: 'Subtotal:',
        totalLabel: 'Estimated Total:',
        paidLabel: 'Advance Required:',
        balanceLabel: 'Estimated Balance:',
        signatoryCompanyText: (biz) => `for ${biz.toUpperCase()}`,
        signatoryRoleText: 'Authorized Signatory',
        declarationTitle: 'Quotation Terms:',
        defaultDeclaration: 'This is a proforma quotation and not a demand for payment or tax invoice.',
        enableUpiQr: true,
        isPurchaseFlow: false,
        isOrder: true
    }
};

export interface BankDetailsInfo {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName?: string;
}

export interface TotalRow {
    label: string;
    value: number;
    bold?: boolean;
    isPaid?: boolean;
    isDue?: boolean;
    isPrevBal?: boolean;
    isNetDue?: boolean;
}

export type PageSize = 'a4' | 'a5';

export interface GenerateInvoicePdfOptions {
    theme?: InvoicePdfTheme;
    pageSize?: PageSize;
    printBankDetails?: boolean;
    bankDetails?: BankDetailsInfo;
    selectedBankAccountId?: string;
    showPartyPreviousBalance?: boolean;
    showPartyPendingBalance?: boolean;
    printUpiQr?: boolean;
    upiId?: string;
    documentType?: UniversalDocumentType;
    documentTitle?: string;
    showItemTaxRateOnBill?: boolean;
    returnBlob?: boolean;
    returnBase64?: boolean;
}

export interface ImageBase64Info {
    dataUrl: string;
    width: number;
    height: number;
}

export interface ThemeRenderContext {
    doc: jsPDF;
    data: InvoiceDetails;
    options?: GenerateInvoicePdfOptions;
    descriptor: DocumentDescriptor;
    profile?: any;
    resolvedBank: BankDetailsInfo | null;
    logoBase64: ImageBase64Info | null;
    signatureBase64: ImageBase64Info | null;
    upiQrBase64: ImageBase64Info | null;
    totalRows: TotalRow[];
    taxRateVal: number;
    cgstVal: number;
    sgstVal: number;
    amountPaid: number;
    balanceDue: number;
    totalAmount: number;
    shouldShowPartyBalance: boolean;
    prevBalanceVal: number;
    closingNetDueVal: number;
    showItemTaxRate: boolean;
    pageWidth: number;
    pageHeight: number;
    scale: number;
    marginX: number;
    dateFormatted: string;
    dueDateFormatted?: string;
    bizName: string;
    custGSTIN: string;
    safeText: (txt: string | undefined | null) => string;
    isFullyPaid: boolean;
    resolvedUpiId: string;
    customTerms: string;
}
