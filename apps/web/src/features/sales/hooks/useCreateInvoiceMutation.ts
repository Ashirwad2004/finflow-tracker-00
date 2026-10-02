import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import { v4 as uuidv4 } from "uuid";
import { invoicesApi } from "@/core/api/invoices";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";

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
            mutationFn: async (
                values: InvoiceFormValues
            ) => {
                const user = authUser;

                if (!user) {
                    throw new Error(
                        "Not authenticated"
                    );
                }

                let profileData =
                    queryClient.getQueryData([
                        "profile",
                        user.id,
                    ]) as any;

                if (!profileData) {
                    try {
                        const { data } =
                            await supabase
                                .from(
                                    "profiles" as any
                                )
                                .select(
                                    "business_name, gst_number, business_address, business_phone"
                                )
                                .eq(
                                    "user_id",
                                    user.id
                                )
                                .single();

                        profileData = data;
                    } catch {
                        // Empty profile fallback.
                    }
                }

                // ------------------------------------------------
                // 1. AUTHORITATIVE SERVER API INVOICE CREATION
                // ------------------------------------------------
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

                const calcTaxRate =
                    Number(values.tax_rate) || 0;

                let processedItems: any[] = [];
                let calcSubtotal = 0;
                let calcOverallDiscountAmount = 0;
                let calcTaxAmount = 0;
                let calcTotalAmount = 0;

                // ------------------------------------------------
                // QUICK BILLING
                // ------------------------------------------------

                if (isQuickBilling) {
                    const totalVal =
                        Number(
                            values.quick_total_amount
                        ) || 0;

                    const priceVal =
                        totalVal /
                        (1 +
                            calcTaxRate / 100);

                    processedItems = [
                        {
                            description:
                                values.quick_item_name?.trim() ||
                                "General Sale",
                            quantity: 1,
                            price: priceVal,
                            discount: 0,
                            tax_rate: calcTaxRate,
                            total: priceVal,
                            hsn_code: "",
                        },
                    ];

                    calcSubtotal = priceVal;
                    calcOverallDiscountAmount = 0;
                    calcTaxAmount =
                        totalVal - priceVal;
                    calcTotalAmount = totalVal;
                } else {
                    // ------------------------------------------------
                    // FULL BILLING
                    // ------------------------------------------------

                    const validItems =
                        values.items.filter(
                            (item) =>
                                item.description &&
                                item.description.trim() !== ""
                        );

                    const itemsToProcess =
                        validItems.length > 0
                            ? validItems
                            : values.items;

                    processedItems =
                        itemsToProcess.map(
                            (item) => {
                                const qty =
                                    Number(
                                        item.quantity
                                    ) || 0;

                                const price =
                                    Number(
                                        item.price
                                    ) || 0;

                                const disc =
                                    Number(
                                        item.discount
                                    ) || 0;

                                return {
                                    ...item,
                                    tax_rate:
                                        item.tax_rate !==
                                        undefined
                                            ? Number(
                                                item.tax_rate
                                            )
                                            : (
                                                salesSettings?.defaultTaxRate ??
                                                0
                                            ),
                                    total:
                                        qty *
                                        price *
                                        (1 -
                                            disc /
                                            100),
                                };
                            }
                        );

                    calcSubtotal =
                        processedItems.reduce(
                            (sum, item) =>
                                sum +
                                item.total,
                            0
                        );

                    const calcOverallDiscountPercent =
                        Number(
                            values.overall_discount
                        ) || 0;

                    calcOverallDiscountAmount =
                        (calcSubtotal *
                            calcOverallDiscountPercent) /
                        100;

                    const calcTaxableAmount =
                        Math.max(
                            0,
                            calcSubtotal -
                            calcOverallDiscountAmount
                        );

                    let calcTaxAmountVal = 0;

                    if (isItemWiseTax) {
                        const discountFactor =
                            calcSubtotal > 0
                                ? calcTaxableAmount /
                                calcSubtotal
                                : 1;

                        calcTaxAmountVal =
                            processedItems.reduce(
                                (
                                    sum,
                                    item
                                ) => {
                                    const lineTaxable =
                                        item.total *
                                        discountFactor;

                                    const itemTaxRate =
                                        Number(
                                            item.tax_rate ??
                                            calcTaxRate
                                        );

                                    return (
                                        sum +
                                        (lineTaxable *
                                            itemTaxRate) /
                                        100
                                    );
                                },
                                0
                            );
                    } else {
                        calcTaxAmountVal =
                            (calcTaxableAmount *
                                calcTaxRate) /
                            100;
                    }

                    const calcRawTotal =
                        calcTaxableAmount +
                        calcTaxAmountVal;

                    calcTotalAmount =
                        salesSettings?.roundOffTotal
                            ? Math.round(
                                calcRawTotal
                            )
                            : calcRawTotal;

                    calcTaxAmount =
                        calcTaxAmountVal;
                }

                // ------------------------------------------------
                // AUTO RESOLVE / AUTO CREATE PARTY & LINK
                // ------------------------------------------------
                let resolvedPartyId: string | null = null;
                const customerNameTrimmed = values.customer_name?.trim();

                if (customerNameTrimmed) {
                    const cachedParties: any[] = queryClient.getQueryData(["parties", user.id]) || (parties as any[]) || [];
                    const existingParty = cachedParties.find(
                        (p: any) => p.name?.trim().toLowerCase() === customerNameTrimmed.toLowerCase()
                    );

                    if (existingParty) {
                        resolvedPartyId = existingParty.id;
                        // Enrich party contact info if invoice has new details
                        const needsUpdate = (
                            (!existingParty.phone && values.customer_phone?.trim()) ||
                            (!existingParty.email && values.customer_email?.trim()) ||
                            (!existingParty.gst_number && values.customer_gstin?.trim()) ||
                            (!existingParty.address && values.place_of_supply?.trim()) ||
                            (existingParty.type === 'vendor')
                        );

                        if (needsUpdate) {
                            const updatedPartyPayload: any = {
                                ...existingParty,
                                phone: existingParty.phone || values.customer_phone?.trim() || null,
                                email: existingParty.email || values.customer_email?.trim() || null,
                                gst_number: existingParty.gst_number || values.customer_gstin?.trim()?.toUpperCase() || null,
                                address: existingParty.address || values.place_of_supply?.trim() || null,
                                type: existingParty.type === 'vendor' ? 'both' : existingParty.type
                            };

                            offlineMutate({
                                table: "parties",
                                action: "update",
                                recordId: existingParty.id,
                                payload: updatedPartyPayload,
                                userId: user.id
                            }).catch((err) => console.warn("Could not update party details:", err));

                            queryClient.setQueryData(["parties", user.id], (old: any) => {
                                if (!old) return [updatedPartyPayload];
                                return old.map((p: any) => p.id === existingParty.id ? updatedPartyPayload : p);
                            });
                            queryClient.setQueryData(["invoice-parties"], (old: any) => {
                                if (!old) return [updatedPartyPayload];
                                return old.map((p: any) => p.id === existingParty.id ? updatedPartyPayload : p);
                            });
                        }
                    } else {
                        // Party does not exist -> Automatically add new party to directory
                        resolvedPartyId = uuidv4();
                        const newPartyPayload = {
                            id: resolvedPartyId,
                            user_id: user.id,
                            name: customerNameTrimmed,
                            type: "customer",
                            phone: values.customer_phone?.trim() || null,
                            email: values.customer_email?.trim() || null,
                            address: values.place_of_supply?.trim() || null,
                            gst_number: values.customer_gstin?.trim()?.toUpperCase() || null,
                            opening_balance: 0,
                            opening_balance_type: "to_receive",
                            created_at: new Date().toISOString()
                        };

                        await offlineMutate({
                            table: "parties",
                            action: "insert",
                            recordId: resolvedPartyId,
                            payload: newPartyPayload,
                            userId: user.id
                        });

                        queryClient.setQueryData(["parties", user.id], (old: any) => {
                            const prev = old || [];
                            return [...prev, newPartyPayload].sort((a: any, b: any) => a.name.localeCompare(b.name));
                        });
                        queryClient.setQueryData(["invoice-parties"], (old: any) => {
                            const prev = old || [];
                            return [...prev, newPartyPayload].sort((a: any, b: any) => a.name.localeCompare(b.name));
                        });
                    }
                }

                const saleData = {
                    user_id: user.id,
                    party_id: resolvedPartyId,
                    invoice_number:
                        values.invoice_number,
                    customer_name:
                        values.customer_name,
                    customer_phone:
                        values.customer_phone,
                    customer_email:
                        values.customer_email,
                    customer_gstin:
                        values.customer_gstin
                            ?.trim()
                            .toUpperCase() ||
                        null,
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
                    is_reverse_charge:
                        values.is_reverse_charge ||
                        false,
                    document_type:
                        values.document_type ||
                        "invoice",
                    original_invoice_id:
                        values.original_invoice_id ||
                        null,
                    date: values.date,
                    due_date:
                        values.due_date ||
                        null,
                    items: processedItems,
                    subtotal: calcSubtotal,
                    discount_amount:
                        calcOverallDiscountAmount,
                    tax_rate: calcTaxRate,
                    tax_amount:
                        calcTaxAmount,
                    total_amount:
                        calcTotalAmount,
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
                                ? Math.min(
                                    Math.max(0, Number(values.amount_paid) || 0),
                                    calcTotalAmount
                                )
                                : 0,
                    balance_due:
                        values.status === "paid"
                            ? 0
                            : values.status === "partial"
                                ? Math.max(
                                    0,
                                    calcTotalAmount -
                                    Math.min(
                                        Math.max(0, Number(values.amount_paid) || 0),
                                        calcTotalAmount
                                    )
                                )
                                : calcTotalAmount,
                    payment_method:
                        values.status === "paid" || (values.status === "partial" && (Number(values.amount_paid) || 0) > 0)
                            ? "cash"
                            : null,
                    previous_balance: partyPreviousBalance,
                    total_due_balance: partyClosingDue,
                    party_pending_balance: partyClosingDue,
                    irn:
                        values.irn || null,
                    eway_bill_number:
                        values.eway_bill_number ||
                        null,
                    qr_code:
                        values.qr_code || null,
                    notes:
                        values.notes || null,
                };

                // ------------------------------------------------
                // INVOICE NUMBER CONFLICT
                // ------------------------------------------------

                const cachedSales =
                    (queryClient.getQueryData([
                        "sales",
                        user.id,
                    ]) as any[]) || [];

                const hasConflict =
                    cachedSales.some(
                        (s: any) =>
                            s.invoice_number ===
                            values.invoice_number &&
                            (
                                !invoiceToEdit ||
                                s.id !==
                                invoiceToEdit.id
                            )
                    );

                if (hasConflict) {
                    throw new Error(
                        `An invoice with number "${values.invoice_number}" already exists.`
                    );
                }

                const recordId =
                    invoiceToEdit
                        ? invoiceToEdit.id
                        : uuidv4();

                const fullSalePayload = {
                    id: recordId,
                    ...saleData,
                    created_at:
                        invoiceToEdit
                            ? invoiceToEdit.created_at
                            : new Date().toISOString(),
                };

                // ------------------------------------------------
                // SAVE SALE
                // ------------------------------------------------

                const saveSaleToDB = async (
                    action:
                        | "insert"
                        | "update",
                    rId: string,
                    sPayload: any
                ) => {
                    try {
                        const res =
                            await offlineMutate({
                                table: "sales",
                                action,
                                recordId: rId,
                                payload: sPayload,
                                userId: user.id,
                            });

                        if (!res.error) {
                            return res;
                        }
                    } catch (err) {
                        console.warn(
                            "Full sales schema insert threw exception, falling back to core DB schema:",
                            err
                        );
                    }

                    const coreSaleData = {
                        id: sPayload.id,
                        user_id:
                            sPayload.user_id,
                        party_id:
                            sPayload.party_id || null,
                        invoice_number:
                            sPayload.invoice_number,
                        customer_name:
                            sPayload.customer_name,
                        customer_phone:
                            sPayload.customer_phone,
                        customer_email:
                            sPayload.customer_email,
                        date: sPayload.date,
                        status: sPayload.status,
                        subtotal:
                            sPayload.subtotal,
                        tax_amount:
                            sPayload.tax_amount,
                        total_amount:
                            sPayload.total_amount,
                        amount_paid:
                            sPayload.amount_paid,
                        balance_due:
                            sPayload.balance_due,
                        payment_method:
                            sPayload.payment_method,
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

                const result =
                    await saveSaleToDB(
                        invoiceToEdit
                            ? "update"
                            : "insert",
                        recordId,
                        fullSalePayload
                    );

                if (result.error) {
                    throw result.error;
                }

                // ------------------------------------------------
                // INVENTORY UPDATE
                // ------------------------------------------------

                if (!invoiceToEdit) {
                    const shouldDeduct =
                        settings.deductStockOnlyOnPaid
                            ? values.status === "paid"
                            : true;

                    if (shouldDeduct) {
                        const isValidUUID = (id: any) =>
                            typeof id === "string" &&
                            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

                        for (const item of values.items) {
                            if (!item.description?.trim()) continue;

                            // Only look up in real inventory catalog (dbProducts) with a valid database UUID
                            const product = (dbProducts as any[]).find(
                                (p: any) =>
                                    isValidUUID(p.id) &&
                                    p.name?.trim().toLowerCase() === item.description?.trim().toLowerCase()
                            );

                            if (product && isValidUUID(product.id)) {
                                const qtySold =
                                    Number(item.quantity) || 0;

                                const currentStock =
                                    Number(product.stock_quantity) || 0;

                                const updatedStock =
                                    currentStock - qtySold;

                                try {
                                    await offlineMutate({
                                        table: "products",
                                        action: "update",
                                        recordId: product.id,
                                        payload: {
                                            ...product,
                                            stock_quantity: updatedStock,
                                        },
                                        userId: user.id,
                                    });

                                    queryClient.setQueryData(
                                        ["products", user.id],
                                        (old: any[] | undefined) => {
                                            if (!old) return [];
                                            return old.map((p: any) =>
                                                p.id === product.id
                                                    ? {
                                                        ...p,
                                                        stock_quantity: updatedStock,
                                                    }
                                                    : p
                                            );
                                        }
                                    );
                                } catch (stockErr) {
                                    console.warn(
                                        `[CreateInvoiceDialog] Failed to deduct stock for ${product.name}:`,
                                        stockErr
                                    );
                                }
                            }
                        }
                    }
                }

                return {
                    ...values,
                    ...fullSalePayload,
                    items: processedItems,
                    profile: profileData,
                    discount_amount:
                        calcOverallDiscountAmount,
                    id: recordId,
                    created_at:
                        invoiceToEdit
                            ? invoiceToEdit.created_at
                            : new Date().toISOString(),
                };
            },

            onSuccess: (data: any) => {
                supabase.auth
                    .getSession()
                    .then(
                        ({
                            data: {
                                session,
                            },
                        }) => {
                            const userId =
                                session?.user
                                    ?.id;

                            if (!userId) return;

                            queryClient.setQueryData(
                                [
                                    "sales",
                                    userId,
                                ],
                                (
                                    old:
                                        | any[]
                                        | undefined
                                ) => {
                                    const salesList =
                                        old || [];

                                    if (
                                        invoiceToEdit
                                    ) {
                                        return salesList.map(
                                            (
                                                s: any
                                            ) =>
                                                s.id ===
                                                    data.id
                                                    ? {
                                                        ...s,
                                                        ...data,
                                                    }
                                                    : s
                                        );
                                    }

                                    return [
                                        data,
                                        ...salesList,
                                    ];
                                }
                            );
                        }
                    );

                if (navigator.onLine) {
                    queryClient.invalidateQueries(
                        {
                            queryKey: ["sales"],
                        }
                    );

                    queryClient.invalidateQueries(
                        {
                            queryKey: ["parties"],
                        }
                    );

                    queryClient.invalidateQueries(
                        {
                            queryKey: ["invoice-parties"],
                        }
                    );

                    queryClient.invalidateQueries(
                        {
                            queryKey: [
                                "last-invoice-number",
                            ],
                        }
                    );
                }

                // Background Auto-WhatsApp Dispatch (Zero Modal, Zero Extra Clicks)
                const customerPhone = data.customer_phone?.trim();
                const phoneDigits = (customerPhone || "").replace(/\D/g, "");
                const shouldSendWhatsApp = sendWhatsApp && phoneDigits.length >= 10;

                if (shouldSendWhatsApp) {
                    (async () => {
                        try {
                            const curDue = Number(data.balance_due != null ? data.balance_due : Math.max(0, Number(data.total_amount || 0) - Number(data.amount_paid || 0)));
                            const showPartyBalance = salesSettings?.showPartyPendingBalance ?? salesSettings?.showPartyPreviousBalance ?? false;

                            const base64Uri = await generateInvoicePDF({
                                invoice_number: data.invoice_number,
                                date: data.date || data.created_at,
                                due_date: data.due_date || undefined,
                                status: data.status,
                                amount_paid: Number(data.amount_paid ?? (data.status === "paid" ? data.total_amount : 0)),
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
                                    total: it.total ?? (Number(it.quantity) * Number(it.price)),
                                    hsn_code: it.hsn_code,
                                    unit: it.unit,
                                })),
                                subtotal: data.subtotal ?? data.total_amount,
                                discount_amount: data.discount_amount ?? 0,
                                tax_amount: data.tax_amount ?? 0,
                                total_amount: data.total_amount,
                                tax_rate: (data as any).tax_rate ?? 0,
                                notes: data.notes,
                                business_details: profile ? {
                                    name: profile.business_name,
                                    address: profile.business_address,
                                    phone: profile.business_phone,
                                    gst: profile.gst_number,
                                    logo_url: profile.business_logo,
                                    signature_url: profile.signature_url,
                                } : undefined,
                            }, { action: "base64", documentType: "invoice", showPartyPreviousBalance: showPartyBalance, showPartyPendingBalance: showPartyBalance });

                            await sendInvoiceMutation.mutateAsync({
                                invoice_id: data.id,
                                invoice_number: data.invoice_number,
                                customer_name: data.customer_name || "Customer",
                                customer_phone: customerPhone!,
                                total_amount: Number(data.total_amount || 0),
                                amount_paid: Number(data.amount_paid || 0),
                                balance_due: Number(data.balance_due != null ? data.balance_due : Math.max(0, Number(data.total_amount) - Number(data.amount_paid || 0))),
                                due_date: data.due_date || undefined,
                                document_base64: base64Uri && typeof base64Uri === "string" ? base64Uri : undefined,
                                document_filename: `Invoice_${data.invoice_number}.pdf`,
                            });
                        } catch (err: any) {
                            console.warn("[CreateInvoiceDialog] Background WhatsApp dispatch error:", err);
                        }
                    })();
                }

                toast({
                    title: invoiceToEdit
                        ? "✅ Invoice Updated"
                        : "✅ Invoice Saved",
                    description: shouldSendWhatsApp
                        ? `Invoice ${data.invoice_number} saved & sent via WhatsApp to ${customerPhone}.`
                        : `Invoice ${data.invoice_number} saved successfully.`,
                });

                if (onSuccess) {
                    onSuccess(data);
                }

                // Immediately close dialog and reset - 0 extra clicks for cashier flow
                onOpenChange(false);
                reset();
                setActiveStep("form");
                setSavedInvoiceData(null);
                setDraftPreviewData(null);
            },

            onError: (error: any) => {
                toast({
                    title: "Error",
                    description:
                        error.message,
                    variant: "destructive",
                });
            },
        });
}
