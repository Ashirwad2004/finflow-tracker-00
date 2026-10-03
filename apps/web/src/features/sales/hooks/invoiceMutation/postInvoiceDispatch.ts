import { QueryClient } from "@tanstack/react-query";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";

export function invalidateInvoiceQueries(queryClient: QueryClient) {
    if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        queryClient.invalidateQueries({ queryKey: ["parties"] });
        queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
        queryClient.invalidateQueries({ queryKey: ["last-invoice-number"] });
    }
}

interface DispatchWhatsAppParams {
    data: any;
    sendWhatsApp: boolean;
    salesSettings?: SalesSettings;
    profile: any;
    sendInvoiceMutation: any;
}

export async function dispatchInvoiceWhatsApp({
    data,
    sendWhatsApp,
    salesSettings,
    profile,
    sendInvoiceMutation,
}: DispatchWhatsAppParams): Promise<void> {
    const customerPhone = data.customer_phone?.trim();
    const phoneDigits = (customerPhone || "").replace(/\D/g, "");
    const shouldSendWhatsApp = sendWhatsApp && phoneDigits.length >= 10;

    if (!shouldSendWhatsApp) return;

    try {
        const curDue = Number(
            data.balance_due != null
                ? data.balance_due
                : Math.max(0, Number(data.total_amount || 0) - Number(data.amount_paid || 0))
        );
        const showPartyBalance =
            salesSettings?.showPartyPendingBalance ??
            salesSettings?.showPartyPreviousBalance ??
            false;

        const base64Uri = await generateInvoicePDF(
            {
                invoice_number: data.invoice_number,
                date: data.date || data.created_at,
                due_date: data.due_date || undefined,
                status: data.status,
                amount_paid: Number(
                    data.amount_paid ?? (data.status === "paid" ? data.total_amount : 0)
                ),
                balance_due: curDue,
                payment_method: data.payment_method,
                previous_balance: data.previous_balance,
                total_due_balance: data.total_due_balance,
                party_pending_balance: (data as any).party_pending_balance ?? data.total_due_balance,
                customer_name: data.customer_name,
                customer_phone: data.customer_phone,
                customer_email: data.customer_email,
                customer_gstin: data.customer_gstin,
                items: (data.items || []).map((it: any) => ({
                    description: it.description || it.name,
                    quantity: it.quantity,
                    price: it.price,
                    total: it.total ?? Number(it.quantity) * Number(it.price),
                    hsn_code: it.hsn_code,
                    unit: it.unit,
                })),
                subtotal: data.subtotal ?? data.total_amount,
                discount_amount: data.discount_amount ?? 0,
                tax_amount: data.tax_amount ?? 0,
                total_amount: data.total_amount,
                tax_rate: (data as any).tax_rate ?? 0,
                notes: data.notes,
                business_details: profile
                    ? {
                        name: profile.business_name,
                        address: profile.business_address,
                        phone: profile.business_phone,
                        gst: profile.gst_number,
                        logo_url: profile.business_logo,
                        signature_url: profile.signature_url,
                    }
                    : undefined,
            },
            {
                action: "base64",
                documentType: "invoice",
                showPartyPreviousBalance: showPartyBalance,
                showPartyPendingBalance: showPartyBalance,
            }
        );

        await sendInvoiceMutation.mutateAsync({
            invoice_id: data.id,
            invoice_number: data.invoice_number,
            customer_name: data.customer_name || "Customer",
            customer_phone: customerPhone!,
            total_amount: Number(data.total_amount || 0),
            amount_paid: Number(data.amount_paid || 0),
            balance_due: Number(
                data.balance_due != null
                    ? data.balance_due
                    : Math.max(0, Number(data.total_amount) - Number(data.amount_paid || 0))
            ),
            due_date: data.due_date || undefined,
            document_base64: base64Uri && typeof base64Uri === "string" ? base64Uri : undefined,
            document_filename: `Invoice_${data.invoice_number}.pdf`,
        });
    } catch (err: any) {
        console.warn("[CreateInvoiceDialog] Background WhatsApp dispatch error:", err);
    }
}
