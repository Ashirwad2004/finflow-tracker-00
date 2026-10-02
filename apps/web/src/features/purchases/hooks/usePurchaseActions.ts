import { useState } from "react";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { printInvoiceDirectly } from "@/utils/directPrint";
import { offlineMutate } from "@/core/offline/apiService";
import { BillPaymentTarget } from "@/features/payments/components/RecordBillPaymentDialog";
import { Purchase } from "../types";
import { getPurchasePaymentTarget } from "./usePurchasesPageCalculations";

interface UsePurchaseActionsOptions {
    profile: any;
    user: any;
    formatCurrency: (amount: number) => string;
    queryClient: QueryClient;
}

export function usePurchaseActions({
    profile,
    user,
    formatCurrency,
    queryClient,
}: UsePurchaseActionsOptions) {
    const [paymentPurchase, setPaymentPurchase] = useState<BillPaymentTarget | null>(null);
    const [transcriptPurchase, setTranscriptPurchase] = useState<BillPaymentTarget | null>(null);
    const [isPaymentOutOpen, setIsPaymentOutOpen] = useState(false);

    const getDocumentData = (purchase: Purchase) => {
        const billNumber = purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`;
        const curDue = Number(
            purchase.balance_due != null
                ? purchase.balance_due
                : Math.max(0, Number(purchase.total_amount || 0) - Number(purchase.amount_paid ?? 0))
        );

        return {
            invoice_number: billNumber,
            date: purchase.date || (purchase as any).created_at,
            due_date: purchase.due_date,
            status: purchase.status,
            amount_paid: Number(purchase.amount_paid ?? (purchase.status === "paid" ? purchase.total_amount : 0)),
            balance_due: curDue,
            customer_name: purchase.vendor_name,
            customer_phone: purchase.vendor_phone,
            customer_email: purchase.vendor_email,
            customer_gstin: purchase.vendor_gstin,
            items: purchase.items || [],
            subtotal: purchase.subtotal ?? purchase.total_amount,
            discount_amount: purchase.discount_amount ?? 0,
            tax_amount: purchase.tax_amount ?? 0,
            total_amount: purchase.total_amount,
            tax_rate: purchase.tax_rate ?? 0,
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

    const handlePreview = async (purchase: Purchase) => {
        const docData = getDocumentData(purchase);
        const url = await generateInvoicePDF(docData, {
            action: 'preview',
            documentType: 'purchase_bill',
            documentTitle: 'PURCHASE BILL'
        });

        if (url) {
            window.open(String(url), '_blank');
        }
    };

    const handlePrint = async (purchase: Purchase) => {
        const docData = getDocumentData(purchase);
        try {
            toast.loading("Sending purchase bill to printer...", { id: "print-purchase" });
            await printInvoiceDirectly(docData, {
                documentType: 'purchase_bill',
                documentTitle: 'PURCHASE BILL'
            });
            toast.success("Print job sent to printer machine!", { id: "print-purchase" });
        } catch (err) {
            console.error("Print purchase error:", err);
            toast.error("Failed to print purchase bill", { id: "print-purchase" });
        }
    };

    const handleDownload = (purchase: Purchase) => {
        const docData = getDocumentData(purchase);
        generateInvoicePDF(docData, {
            action: 'download',
            documentType: 'purchase_bill',
            documentTitle: 'PURCHASE BILL'
        });
    };

    const handleShare = async (purchase: Purchase) => {
        try {
            const billString = purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`;
            const docData = getDocumentData(purchase);
            const url = await generateInvoicePDF(docData, {
                action: 'preview',
                documentType: 'purchase_bill',
                documentTitle: 'PURCHASE BILL'
            });

            if (url) {
                const response = await fetch(String(url));
                const blob = await response.blob();
                const file = new File([blob], `PurchaseBill_${billString}.pdf`, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Purchase Bill ${billString}`,
                        text: `Here is the purchase bill detail for ${purchase.vendor_name}`
                    });
                } else {
                    const shareText = `Purchase Bill ${billString} from ${purchase.vendor_name}. Total: ${formatCurrency(purchase.total_amount)}`;
                    await navigator.clipboard.writeText(shareText);
                    alert("Purchase bill details copied to clipboard (Sharing PDF files directly is not supported on this device/browser).");
                }
            }
        } catch (error) {
            console.error("Error sharing purchase:", error);
            alert("Failed to share purchase.");
        }
    };

    const handleDelete = async (purchase: Purchase) => {
        if (!user?.id) return;
        if (window.confirm(`Are you sure you want to delete purchase bill ${purchase.bill_number}? It will be moved to Recycle Bin.`)) {
            // 1. Move to local storage recycle bin
            try {
                const storageKey = `recently_deleted_purchases_${user.id}`;
                const existing = localStorage.getItem(storageKey);
                const deletedItems = existing ? JSON.parse(existing) : [];

                const filtered = deletedItems.filter((i: any) => i.id !== purchase.id);
                filtered.unshift({
                    ...purchase,
                    type: "purchase",
                    deleted_at: new Date().toISOString()
                });

                localStorage.setItem(storageKey, JSON.stringify(filtered));
            } catch (e) {
                console.warn("Failed to save to local recycle bin", e);
            }

            // 2. Remove from Supabase/Queue
            try {
                await offlineMutate({
                    table: "purchases",
                    action: "delete",
                    recordId: purchase.id,
                    userId: user.id
                });

                // Optimistic update
                queryClient.setQueryData(["purchases", user.id], (old: any) => {
                    return old ? old.filter((p: any) => p.id !== purchase.id) : [];
                });

                if (navigator.onLine) {
                    queryClient.invalidateQueries({ queryKey: ["purchases", user.id] });
                    queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
                }

                toast.success(`Purchase bill ${purchase.bill_number} moved to Recycle Bin.`);
            } catch (err: any) {
                console.error("Error deleting purchase:", err);
                toast.error("Failed to delete purchase. Please try again.");
            }
        }
    };

    return {
        paymentPurchase,
        setPaymentPurchase,
        transcriptPurchase,
        setTranscriptPurchase,
        isPaymentOutOpen,
        setIsPaymentOutOpen,
        handlePreview,
        handlePrint,
        handleDownload,
        handleShare,
        handleDelete,
        openRecordPayment: (purchase: Purchase) => setPaymentPurchase(getPurchasePaymentTarget(purchase)),
        openTranscript: (purchase: Purchase) => setTranscriptPurchase(getPurchasePaymentTarget(purchase)),
    };
}
