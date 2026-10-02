import { useState } from "react";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { printInvoiceDirectly } from "@/utils/directPrint";
import { generateEInvoiceJSON, downloadJSON } from "@/core/utils/einvoiceGenerator";
import { dispatchJob, subscribeToJob } from "@/core/utils/jobQueue";
import { offlineMutate } from "@/core/offline/apiService";
import { BillPaymentTarget } from "@/features/payments/components/RecordBillPaymentDialog";
import { Sale } from "../types";
import { getPartyPreviousBalance, getSalePaymentTarget } from "./useSalesCalculations";

interface UseSalesActionsOptions {
    invoices: Sale[];
    parties: any[];
    profile: any;
    settings: any;
    user: any;
    formatCurrency: (amount: number) => string;
    queryClient: QueryClient;
}

export function useSalesActions({
    invoices,
    parties,
    profile,
    settings,
    user,
    formatCurrency,
    queryClient,
}: UseSalesActionsOptions) {
    const [paymentTarget, setPaymentTarget] = useState<BillPaymentTarget | null>(null);
    const [transcriptTarget, setTranscriptTarget] = useState<BillPaymentTarget | null>(null);
    const [isPaymentInOpen, setIsPaymentInOpen] = useState(false);
    const [whatsappInvoice, setWhatsappInvoice] = useState<Sale | null>(null);
    const [whatsappPdfBase64, setWhatsappPdfBase64] = useState<string | undefined>(undefined);
    const [isBulkWhatsAppOpen, setIsBulkWhatsAppOpen] = useState(false);

    const getDocumentData = (invoice: Sale) => {
        const prevBal = getPartyPreviousBalance(invoice, parties, invoices);
        const curDue = Number(
            invoice.balance_due != null
                ? invoice.balance_due
                : Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid ?? 0))
        );

        return {
            invoice_number: invoice.invoice_number,
            date: invoice.date ?? (invoice as any).created_at,
            due_date: invoice.due_date ?? undefined,
            status: invoice.status,
            amount_paid: Number(invoice.amount_paid ?? (invoice.status === "paid" ? invoice.total_amount : 0)),
            balance_due: curDue,
            payment_method: (invoice as any).payment_method,
            previous_balance: prevBal,
            total_due_balance: prevBal + curDue,
            party_pending_balance: prevBal + curDue,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            customer_gstin: invoice.customer_gstin,
            items: (invoice.items || []).map(item => ({
                description: item.description || item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total ?? item.amount ?? (item.quantity * item.price),
                hsn_code: item.hsn_code,
                unit: item.unit,
            })),
            subtotal: invoice.subtotal ?? invoice.total_amount,
            discount_amount: invoice.discount_amount ?? 0,
            tax_amount: invoice.tax_amount ?? 0,
            total_amount: invoice.total_amount,
            tax_rate: invoice.tax_rate ?? 0,
            irn: (invoice as any).irn,
            eway_bill_number: (invoice as any).eway_bill_number,
            qr_code: (invoice as any).qr_code,
            business_details: profile ? {
                name: (profile as any).business_name,
                address: (profile as any).business_address,
                phone: (profile as any).business_phone,
                gst: (profile as any).gst_number,
                logo_url: (profile as any).business_logo,
                signature_url: (profile as any).signature_url
            } : undefined
        };
    };

    const handleOpenRecordPayment = (invoice: Sale) => {
        setPaymentTarget(getSalePaymentTarget(invoice));
    };

    const handleOpenTranscript = (invoice: Sale) => {
        setTranscriptTarget(getSalePaymentTarget(invoice));
    };

    const handlePreview = async (invoice: Sale) => {
        const showPartyBalance = settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance ?? false;
        const docData = getDocumentData(invoice);

        const url = await generateInvoicePDF(docData, {
            action: 'preview',
            documentType: 'invoice',
            showPartyPreviousBalance: showPartyBalance,
            showPartyPendingBalance: showPartyBalance
        });

        if (url) {
            window.open(String(url), '_blank');
        }
    };

    const handlePrint = async (invoice: Sale) => {
        const showPartyBalance = settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance ?? false;
        const docData = getDocumentData(invoice);

        try {
            toast.loading("Sending invoice to printer...", { id: "print-invoice" });
            await printInvoiceDirectly(docData, {
                documentType: 'invoice',
                showPartyPreviousBalance: showPartyBalance,
                showPartyPendingBalance: showPartyBalance
            });
            toast.success("Print job sent to printer machine!", { id: "print-invoice" });
        } catch (err) {
            console.error("Print invoice error:", err);
            toast.error("Failed to print invoice", { id: "print-invoice" });
        }
    };

    const handleDownload = (invoice: Sale) => {
        const showPartyBalance = settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance ?? false;
        const docData = getDocumentData(invoice);

        generateInvoicePDF(docData, {
            action: 'download',
            documentType: 'invoice',
            showPartyPreviousBalance: showPartyBalance,
            showPartyPendingBalance: showPartyBalance
        });
        toast.success(`Invoice ${invoice.invoice_number} downloaded.`);
    };

    const handleShare = async (invoice: Sale) => {
        try {
            const showPartyBalance = settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance ?? false;
            const docData = getDocumentData(invoice);

            const url = await generateInvoicePDF(docData, {
                action: 'preview',
                documentType: 'invoice',
                showPartyPreviousBalance: showPartyBalance,
                showPartyPendingBalance: showPartyBalance
            });

            if (url) {
                const response = await fetch(String(url));
                const blob = await response.blob();
                const file = new File([blob], `Invoice_${invoice.invoice_number}.pdf`, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Invoice ${invoice.invoice_number}`,
                        text: `Here is the invoice for ${invoice.customer_name}`
                    });
                } else {
                    const shareText = `Invoice ${invoice.invoice_number} for ${invoice.customer_name}. Total: ${formatCurrency(invoice.total_amount)}`;
                    await navigator.clipboard.writeText(shareText);
                    toast.success("Invoice details copied to clipboard — direct PDF sharing isn't supported on this device/browser.");
                }
            }
        } catch (error) {
            console.error("Error sharing invoice:", error);
            toast.error("Failed to share invoice. Please try again.");
        }
    };

    const handleOpenWhatsApp = async (invoice: Sale) => {
        setWhatsappInvoice(invoice);
        try {
            const showPartyBalance = settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance ?? false;
            const docData = getDocumentData(invoice);

            const base64Uri = await generateInvoicePDF(docData, {
                action: 'base64',
                documentType: 'invoice',
                showPartyPreviousBalance: showPartyBalance,
                showPartyPendingBalance: showPartyBalance
            });

            if (base64Uri && typeof base64Uri === 'string') {
                setWhatsappPdfBase64(base64Uri);
            } else {
                setWhatsappPdfBase64(undefined);
            }
        } catch (e) {
            console.warn("Could not generate base64 PDF for WhatsApp:", e);
            setWhatsappPdfBase64(undefined);
        }
    };

    const handleGenerateEInvoice = (invoice: Sale) => {
        if (!profile) return toast.error("Profile not loaded.");
        if (!invoice.customer_gstin || invoice.customer_gstin.length < 15) {
            toast.error("E-Invoice requires a valid 15-digit customer GSTIN.");
            return;
        }
        if (invoice.total_amount <= 0) {
            toast.error("Invoice amount must be greater than 0.");
            return;
        }
        try {
            const payload = generateEInvoiceJSON(invoice, profile);
            downloadJSON(payload, `EInvoice_${invoice.invoice_number}.json`);
            toast.success("E-Invoice JSON generated successfully!");
        } catch (error) {
            console.error("Error generating E-Invoice:", error);
            toast.error("Failed to generate E-Invoice JSON.");
        }
    };

    const handleBulkWhatsApp = () => {
        const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
        if (overdueInvoices.length === 0) {
            toast.info("No overdue invoices to send reminders for.");
            return;
        }
        setIsBulkWhatsAppOpen(true);
    };

    const handleBulkEmail = async () => {
        const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
        if (overdueInvoices.length === 0) {
            toast.info("No overdue invoices to send reminders for.");
            return;
        }

        try {
            const jobId = await dispatchJob('send_bulk_email', { invoices: overdueInvoices });
            toast.success(`Dispatched email reminders for ${overdueInvoices.length} customers in the background.`);
            
            subscribeToJob(jobId, (job) => {
                if (job.status === 'completed') {
                    const res = JSON.parse(job.error_log || '{}');
                    toast.success(`Bulk Email finished: Sent ${res.sent} emails, ${res.failed} failed.`);
                } else if (job.status === 'failed') {
                    toast.error(`Bulk Email failed: ${job.error_log}`);
                }
            });
        } catch (error) {
            toast.error("Failed to start bulk email task.");
        }
    };

    const handleDelete = async (invoice: Sale) => {
        const shouldProceed = settings.confirmBeforeDelete
            ? window.confirm("Are you sure you want to delete invoice? It will be moved to History & Bin.")
            : true;

        if (!shouldProceed) return;

        // 1. Move to local storage recycle bin
        try {
            const storageKey = `recently_deleted_sales_${user?.id}`;
            const existing = localStorage.getItem(storageKey);
            const deletedItems = existing ? JSON.parse(existing) : [];

            deletedItems.push({
                ...invoice,
                type: "sale",
                deleted_at: new Date().toISOString()
            });

            localStorage.setItem(storageKey, JSON.stringify(deletedItems));
        } catch (e) {
            console.warn("Failed to save to local recycle bin", e);
        }

        // 2. Remove from Supabase/Queue
        if (!user?.id) return;
        try {
            await offlineMutate({
                table: "sales",
                action: "delete",
                recordId: invoice.id,
                userId: user.id
            });

            // Optimistic update
            queryClient.setQueryData(["sales", user.id], (old: any) => {
                return old ? old.filter((inv: any) => inv.id !== invoice.id) : [];
            });

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ["sales", user.id] });
            }

            toast.success(`Invoice ${invoice.invoice_number} moved to Recycle Bin.`);
        } catch (err: any) {
            console.error("Error deleting invoice:", err);
            toast.error("Failed to delete invoice. Please try again.");
        }
    };

    return {
        paymentTarget,
        setPaymentTarget,
        transcriptTarget,
        setTranscriptTarget,
        isPaymentInOpen,
        setIsPaymentInOpen,
        whatsappInvoice,
        setWhatsappInvoice,
        whatsappPdfBase64,
        setWhatsappPdfBase64,
        isBulkWhatsAppOpen,
        setIsBulkWhatsAppOpen,
        handleOpenRecordPayment,
        handleOpenTranscript,
        handlePreview,
        handlePrint,
        handleDownload,
        handleShare,
        handleOpenWhatsApp,
        handleGenerateEInvoice,
        handleBulkWhatsApp,
        handleBulkEmail,
        handleDelete,
    };
}
