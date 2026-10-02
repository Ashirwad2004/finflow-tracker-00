import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { offlineMutate } from "@/core/offline/apiService";
import { v4 as uuidv4 } from "uuid";
import { invoicesApi } from "@/core/api/invoices";
import {
    InvoiceFormValues,
    UseCreateInvoiceMutationParams,
    calculateInvoiceValues,
    resolveInvoiceParty,
    deductSoldInventory,
    invalidateInvoiceQueries,
    dispatchInvoiceWhatsApp,
} from "./invoiceMutation";

export * from "./invoiceMutation/types";

export function useCreateInvoiceMutation({
    authUser,
    profile,
    invoiceToEdit,
    salesSettings,
    itemSettings,
    selectedParty,
    isQuickBilling,
    isItemWiseTax,
    dbProducts,
    parties,
    partyPreviousBalance,
    partyClosingDue,
    sendWhatsApp,
    sendInvoiceMutation,
    onSuccess,
    onOpenChange,
    reset,
    setActiveStep,
    setSavedInvoiceData,
    setDraftPreviewData,
}: UseCreateInvoiceMutationParams) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const settings = itemSettings || {};

    return useMutation({
        mutationFn: async (values: InvoiceFormValues) => {
            const user = authUser;
            if (!user) {
                throw new Error("Not authenticated");
            }

            let profileData = queryClient.getQueryData(["profile", user.id]) as any;
            if (!profileData) {
                try {
                    const { data } = await supabase
                        .from("profiles" as any)
                        .select("business_name, gst_number, business_address, business_phone")
                        .eq("user_id", user.id)
                        .single();
                    profileData = data;
                } catch {
                    // Empty profile fallback
                }
            }

            // 1. Authoritative server API invoice creation
            if (!invoiceToEdit && navigator.onLine) {
                try {
                    const authoritativeRes = await invoicesApi.createInvoice({
                        party_id: selectedParty?.id || null,
                        customer_name: values.customer_name?.trim() || "Cash Customer",
                        customer_phone: values.customer_phone?.trim() || null,
                        customer_email: values.customer_email?.trim() || null,
                        customer_gstin: values.customer_gstin?.trim()?.toUpperCase() || null,
                        place_of_supply: values.place_of_supply?.trim() || null,
                        billing_address: values.billing_address?.trim() || null,
                        shipping_address: values.shipping_address?.trim() || null,
                        date: values.date,
                        due_date: values.due_date || null,
                        items: isQuickBilling ? [
                            {
                                name: values.quick_item_name?.trim() || "General Sale",
                                description: values.quick_item_name?.trim() || "General Sale",
                                quantity: 1,
                                price: (Number(values.quick_total_amount) || 0) / (1 + (Number(values.tax_rate) || 0) / 100),
                                tax_rate: Number(values.tax_rate) || 0,
                            }
                        ] : values.items.filter((it) => it.description?.trim()).map((it) => {
                            const matched = (dbProducts as any[]).find(
                                (p: any) => p.name?.trim().toLowerCase() === it.description?.trim().toLowerCase()
                            );
                            return {
                                product_id: matched?.id,
                                name: it.description,
                                description: it.description,
                                quantity: Number(it.quantity) || 1,
                                price: Number(it.price) || 0,
                                discount: Number(it.discount) || 0,
                                tax_rate: it.tax_rate !== undefined ? Number(it.tax_rate) : undefined,
                                unit: it.unit || "pc",
                                hsn_code: it.hsn_code || "",
                            };
                        }),
                        overall_discount: Number(values.overall_discount) || 0,
                        tax_rate: Number(values.tax_rate) || 0,
                        is_item_wise_tax: isItemWiseTax,
                        round_off: !!salesSettings?.roundOffTotal,
                        status: values.status,
                        amount_paid: Number(values.amount_paid) || 0,
                        payment_method: values.status === "paid" || (values.status === "partial" && (Number(values.amount_paid) || 0) > 0) ? "cash" : null,
                        notes: values.notes || null,
                        document_type: values.document_type || "invoice",
                        invoice_number_prefix: salesSettings?.invoiceNumberPrefix || "INV-",
                        custom_invoice_number: values.invoice_number?.trim() || null,
                    });

                    if (authoritativeRes && authoritativeRes.id) {
                        queryClient.invalidateQueries({ queryKey: ["sales", user.id] });
                        queryClient.invalidateQueries({ queryKey: ["products", user.id] });
                        queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
                        queryClient.invalidateQueries({ queryKey: ["api-invoices"] });

                        return {
                            ...values,
                            ...authoritativeRes,
                            profile: profileData,
                        };
                    }
                } catch (apiErr: any) {
                    console.warn("[CreateInvoice] Server authoritative invoice API threw exception, falling back to local queue:", apiErr);
                }
            }

            // 2. Calculations
            const {
                calcTaxRate,
                processedItems,
                calcSubtotal,
                calcOverallDiscountAmount,
                calcTaxAmount,
                calcTotalAmount,
            } = calculateInvoiceValues(values, salesSettings, isQuickBilling, isItemWiseTax);

            // 3. Auto resolve/enrich or auto-create party
            const resolvedPartyId = await resolveInvoiceParty({
                values,
                userId: user.id,
                queryClient,
                parties,
            });

            // 4. Construct sale data
            const saleData = {
                user_id: user.id,
                party_id: resolvedPartyId,
                invoice_number: values.invoice_number,
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                customer_email: values.customer_email,
                customer_gstin: values.customer_gstin?.trim().toUpperCase() || null,
                place_of_supply: (() => {
                    const rawPos = (values.place_of_supply || "").trim();
                    const gstinPos = (values.customer_gstin || "").trim().substring(0, 2);
                    if (rawPos) {
                        const digitMatch = rawPos.match(/^\d{2}/);
                        if (digitMatch) return digitMatch[0];
                        return rawPos;
                    }
                    return gstinPos || null;
                })(),
                is_reverse_charge: values.is_reverse_charge || false,
                document_type: values.document_type || "invoice",
                original_invoice_id: values.original_invoice_id || null,
                date: values.date,
                due_date: values.due_date || null,
                items: processedItems,
                subtotal: calcSubtotal,
                discount_amount: calcOverallDiscountAmount,
                tax_rate: calcTaxRate,
                tax_amount: calcTaxAmount,
                total_amount: calcTotalAmount,
                status:
                    values.status === "paid"
                        ? "paid"
                        : values.status === "partial"
                            ? ((Number(values.amount_paid) || 0) >= calcTotalAmount && calcTotalAmount > 0)
                                ? "paid"
                                : (Number(values.amount_paid) || 0) <= 0
                                    ? "pending"
                                    : "partial"
                            : "pending",
                amount_paid:
                    values.status === "paid"
                        ? calcTotalAmount
                        : values.status === "partial"
                            ? Math.min(Math.max(0, Number(values.amount_paid) || 0), calcTotalAmount)
                            : 0,
                balance_due:
                    values.status === "paid"
                        ? 0
                        : values.status === "partial"
                            ? Math.max(0, calcTotalAmount - Math.min(Math.max(0, Number(values.amount_paid) || 0), calcTotalAmount))
                            : calcTotalAmount,
                payment_method:
                    values.status === "paid" || (values.status === "partial" && (Number(values.amount_paid) || 0) > 0)
                        ? "cash"
                        : null,
                previous_balance: partyPreviousBalance,
                total_due_balance: partyClosingDue,
                party_pending_balance: partyClosingDue,
                irn: values.irn || null,
                eway_bill_number: values.eway_bill_number || null,
                qr_code: values.qr_code || null,
                notes: values.notes || null,
            };

            // 5. Conflict check on invoice number
            const cachedSales = (queryClient.getQueryData(["sales", user.id]) as any[]) || [];
            const hasConflict = cachedSales.some(
                (s: any) =>
                    s.invoice_number === values.invoice_number &&
                    (!invoiceToEdit || s.id !== invoiceToEdit.id)
            );

            if (hasConflict) {
                throw new Error(`An invoice with number "${values.invoice_number}" already exists.`);
            }

            const recordId = invoiceToEdit ? invoiceToEdit.id : uuidv4();
            const fullSalePayload = {
                id: recordId,
                ...saleData,
                created_at: invoiceToEdit ? invoiceToEdit.created_at : new Date().toISOString(),
            };

            // 6. Save sale with fallback to core DB schema
            const saveSaleToDB = async (action: "insert" | "update", rId: string, sPayload: any) => {
                try {
                    const res = await offlineMutate({
                        table: "sales",
                        action,
                        recordId: rId,
                        payload: sPayload,
                        userId: user.id,
                    });
                    if (!res.error) return res;
                } catch (err) {
                    console.warn("Full sales schema insert threw exception, falling back to core DB schema:", err);
                }

                const coreSaleData = {
                    id: sPayload.id,
                    user_id: sPayload.user_id,
                    party_id: sPayload.party_id || null,
                    invoice_number: sPayload.invoice_number,
                    customer_name: sPayload.customer_name,
                    customer_phone: sPayload.customer_phone,
                    customer_email: sPayload.customer_email,
                    date: sPayload.date,
                    status: sPayload.status,
                    subtotal: sPayload.subtotal,
                    tax_amount: sPayload.tax_amount,
                    total_amount: sPayload.total_amount,
                    amount_paid: sPayload.amount_paid,
                    balance_due: sPayload.balance_due,
                    payment_method: sPayload.payment_method,
                    items: sPayload.items,
                };

                return await offlineMutate({
                    table: "sales",
                    action,
                    recordId: rId,
                    payload: coreSaleData,
                    userId: user.id,
                });
            };

            const result = await saveSaleToDB(
                invoiceToEdit ? "update" : "insert",
                recordId,
                fullSalePayload
            );

            if (result.error) {
                throw result.error;
            }

            // 7. Inventory deduction
            if (!invoiceToEdit) {
                await deductSoldInventory({
                    items: values.items,
                    dbProducts,
                    userId: user.id,
                    queryClient,
                    status: values.status,
                    deductStockOnlyOnPaid: settings.deductStockOnlyOnPaid,
                });
            }

            return {
                ...values,
                ...fullSalePayload,
                items: processedItems,
                profile: profileData,
                discount_amount: calcOverallDiscountAmount,
                id: recordId,
                created_at: invoiceToEdit ? invoiceToEdit.created_at : new Date().toISOString(),
            };
        },

        onSuccess: (data: any) => {
            supabase.auth.getSession().then(({ data: { session } }) => {
                const userId = session?.user?.id;
                if (!userId) return;

                queryClient.setQueryData(["sales", userId], (old: any[] | undefined) => {
                    const salesList = old || [];
                    if (invoiceToEdit) {
                        return salesList.map((s: any) => (s.id === data.id ? { ...s, ...data } : s));
                    }
                    return [data, ...salesList];
                });
            });

            invalidateInvoiceQueries(queryClient);

            // Background Auto-WhatsApp Dispatch
            const customerPhone = data.customer_phone?.trim();
            const phoneDigits = (customerPhone || "").replace(/\D/g, "");
            const shouldSendWhatsApp = sendWhatsApp && phoneDigits.length >= 10;

            if (shouldSendWhatsApp) {
                dispatchInvoiceWhatsApp({
                    data,
                    sendWhatsApp,
                    salesSettings,
                    profile,
                    sendInvoiceMutation,
                });
            }

            toast({
                title: invoiceToEdit ? "✅ Invoice Updated" : "✅ Invoice Saved",
                description: shouldSendWhatsApp
                    ? `Invoice ${data.invoice_number} saved & sent via WhatsApp to ${customerPhone}.`
                    : `Invoice ${data.invoice_number} saved successfully.`,
            });

            if (onSuccess) {
                onSuccess(data);
            }

            // Immediately close dialog and reset
            onOpenChange(false);
            reset();
            setActiveStep("form");
            setSavedInvoiceData(null);
            setDraftPreviewData(null);
        },

        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}
