import { SaleOrder, PurchaseOrder } from "@/features/business/types/orders";
import { 
    generateInvoicePDF, 
    InvoiceDetails, 
    UniversalDocumentType,
    InvoicePdfTheme 
} from "@/utils/generateInvoicePDF";

/**
 * Resolves business branding from explicitly passed details or local storage cache
 */
export function resolveStoredBusinessDetails(explicit?: any): any {
    if (explicit && (explicit.business_name || explicit.name || explicit.display_name)) {
        return {
            name: explicit.business_name || explicit.name || explicit.display_name || "Business Firm",
            address: explicit.business_address || explicit.address,
            phone: explicit.business_phone || explicit.phone,
            gst: explicit.gst_number || explicit.gst,
            logo_url: explicit.business_logo || explicit.logo_url,
            signature_url: explicit.signature_url,
            bank_name: explicit.bank_name,
            bank_account_no: explicit.bank_account_no,
            bank_ifsc: explicit.bank_ifsc,
            bank_branch: explicit.bank_branch,
            upi_id: explicit.upi_id
        };
    }

    try {
        const cached = localStorage.getItem("rupeebill_profile") || localStorage.getItem("finflow_cached_profile");
        if (cached) {
            const parsed = JSON.parse(cached);
            return {
                name: parsed.business_name || parsed.display_name || "Business Firm",
                address: parsed.business_address,
                phone: parsed.business_phone || parsed.phone,
                gst: parsed.gst_number,
                logo_url: parsed.business_logo,
                signature_url: parsed.signature_url,
                bank_name: parsed.bank_name,
                bank_account_no: parsed.bank_account_no,
                bank_ifsc: parsed.bank_ifsc,
                bank_branch: parsed.bank_branch,
                upi_id: parsed.upi_id
            };
        }
    } catch (e) {
        // Fallback silently if localStorage parsing fails
    }

    return undefined;
}

/**
 * Maps a Sale Order into universal InvoiceDetails contract
 */
export function mapSaleOrderToInvoiceDetails(order: SaleOrder, businessDetails?: any): InvoiceDetails {
    const totalAmount = Number(order.total_amount) || 0;
    const advancePaid = Number(order.advance_paid) || 0;
    const balanceDue = Math.max(0, totalAmount - advancePaid);

    return {
        invoice_number: order.order_number,
        date: order.order_date || (order as any).created_at || new Date().toISOString(),
        due_date: order.expected_delivery_date || undefined,
        status: order.status,
        amount_paid: advancePaid,
        balance_due: balanceDue,
        customer_name: order.customer_name || "Cash Customer",
        customer_phone: order.customer_phone || undefined,
        customer_email: order.customer_email || undefined,
        customer_gstin: order.customer_gstin || undefined,
        items: (order.items || []).map((it) => ({
            description: it.name + (it.description ? `\n${it.description}` : ""),
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            total: Number(it.total) || ((Number(it.quantity) || 1) * (Number(it.price) || 0)),
            hsn_code: it.hsn_code || undefined,
            unit: it.unit || "pcs",
            tax_rate: it.tax_rate ?? undefined
        })),
        subtotal: Number(order.subtotal) || totalAmount,
        discount_amount: Number(order.discount_amount) || 0,
        tax_amount: Number(order.tax_amount) || 0,
        total_amount: totalAmount,
        notes: [order.notes, order.terms_conditions].filter(Boolean).join("\n"),
        business_details: resolveStoredBusinessDetails(businessDetails)
    };
}

/**
 * Maps a Purchase Order into universal InvoiceDetails contract
 */
export function mapPurchaseOrderToInvoiceDetails(po: PurchaseOrder, businessDetails?: any): InvoiceDetails {
    const totalAmount = Number(po.total_amount) || 0;
    const advancePaid = Number(po.advance_paid) || 0;
    const balanceDue = Math.max(0, totalAmount - advancePaid);

    return {
        invoice_number: po.po_number,
        date: po.order_date || (po as any).created_at || new Date().toISOString(),
        due_date: po.expected_delivery_date || undefined,
        status: po.status,
        amount_paid: advancePaid,
        balance_due: balanceDue,
        customer_name: po.vendor_name || "Supplier / Vendor",
        customer_phone: po.vendor_phone || undefined,
        customer_email: po.vendor_email || undefined,
        customer_gstin: po.vendor_gstin || undefined,
        items: (po.items || []).map((it) => ({
            description: it.name + (it.description ? `\n${it.description}` : ""),
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            total: Number(it.total) || ((Number(it.quantity) || 1) * (Number(it.price) || 0)),
            hsn_code: it.hsn_code || undefined,
            unit: it.unit || "pcs",
            tax_rate: it.tax_rate ?? undefined
        })),
        subtotal: Number(po.subtotal) || totalAmount,
        discount_amount: Number(po.discount_amount) || 0,
        tax_amount: Number(po.tax_amount) || 0,
        total_amount: totalAmount,
        notes: [po.notes, po.terms_conditions].filter(Boolean).join("\n"),
        business_details: resolveStoredBusinessDetails(businessDetails)
    };
}

/**
 * Generates and downloads or previews Sale Order PDF adhering to the active invoice theme (Tally ERP or Startup)
 */
export async function generateSaleOrderPDF(
    order: SaleOrder, 
    businessDetails?: any,
    options?: { action?: 'download' | 'preview'; theme?: InvoicePdfTheme }
) {
    const invoiceData = mapSaleOrderToInvoiceDetails(order, businessDetails);
    return generateInvoicePDF(invoiceData, {
        action: options?.action || 'download',
        theme: options?.theme,
        documentType: 'sale_order',
        documentTitle: 'SALE ORDER'
    });
}

/**
 * Generates and downloads or previews Purchase Order PDF adhering to the active invoice theme (Tally ERP or Startup)
 */
export async function generatePurchaseOrderPDF(
    po: PurchaseOrder, 
    businessDetails?: any,
    options?: { action?: 'download' | 'preview'; theme?: InvoicePdfTheme }
) {
    const invoiceData = mapPurchaseOrderToInvoiceDetails(po, businessDetails);
    return generateInvoicePDF(invoiceData, {
        action: options?.action || 'download',
        theme: options?.theme,
        documentType: 'purchase_order',
        documentTitle: 'PURCHASE ORDER'
    });
}

/**
 * Universal Order PDF Router - generates sale order or purchase order PDF based on type
 */
export async function generateOrderPDF(
    order: SaleOrder | PurchaseOrder,
    type: "sale_order" | "purchase_order",
    businessDetails?: any,
    options?: { action?: 'download' | 'preview'; theme?: InvoicePdfTheme }
) {
    if (type === "sale_order") {
        return generateSaleOrderPDF(order as SaleOrder, businessDetails, options);
    } else {
        return generatePurchaseOrderPDF(order as PurchaseOrder, businessDetails, options);
    }
}

/**
 * Previews Order PDF in browser new tab
 */
export async function previewOrderPDF(
    order: SaleOrder | PurchaseOrder,
    type: "sale_order" | "purchase_order",
    businessDetails?: any
) {
    return generateOrderPDF(order, type, businessDetails, { action: 'preview' });
}
