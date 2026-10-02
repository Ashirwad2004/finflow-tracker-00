import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2 } from "lucide-react";
import { InvoicePreview } from "./InvoicePreview";
import { useWhatsAppSendInvoice } from "@/features/whatsapp/hooks/useWhatsApp";
import { SmartSaleInput } from "./SmartSaleInput";
import {
    CustomerSection,
    InvoiceTotalsFooter,
    InvoiceItemsTable,
    InvoiceDetailsSection,
    InvoiceSummaryTotals,
    QuickInvoiceFormSection,
} from "./create-invoice";
import {
    useCreateInvoiceMutation,
    InvoiceFormValues,
    useInvoiceProducts,
    useInvoiceCalculations,
    useInvoiceValidation,
} from "../hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useItemSettings } from "@/core/hooks/use-item-settings";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { sqliteService } from "@/core/offline/sqliteService";
import { useProductsRealtime } from "@/core/hooks/useProductsRealtime";
import { useAuth } from "@/core/lib/auth";
import { invoicesApi } from "@/core/api/invoices";

interface CreateInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceToEdit?: any;
    salesSettings?: SalesSettings;
    initialParty?: any;
    onSuccess?: (savedInvoice: any) => void;
}

export const CreateInvoiceDialog = ({
    open,
    onOpenChange,
    invoiceToEdit,
    salesSettings,
    initialParty,
    onSuccess,
}: CreateInvoiceDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const { user: authUser } = useAuth();
    const currentUserId = authUser?.id;

    const { settings } = useItemSettings(currentUserId);
    useProductsRealtime(currentUserId);

    const [isQuickBilling, setIsQuickBilling] = useState(
        salesSettings?.enableQuickBilling ?? false
    );

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        getValues,
        reset,
        formState: { errors },
    } = useForm<InvoiceFormValues>({
        defaultValues: {
            customer_name: "",
            customer_phone: "",
            customer_email: "",
            customer_gstin: "",
            place_of_supply: "",
            is_reverse_charge: false,
            document_type: "invoice",
            original_invoice_id: "",
            invoice_number: "",
            date: new Date().toISOString().split("T")[0],
            due_date: "",
            items: [
                {
                    description: "",
                    quantity: 1,
                    price: 0,
                    discount: 0,
                    tax_rate: salesSettings?.defaultTaxRate ?? 0,
                    total: 0,
                    hsn_code: "",
                    unit: "",
                },
            ],
            tax_rate: salesSettings?.defaultTaxRate ?? 0,
            overall_discount: 0,
            status: "paid",
            amount_paid: 0,
            quick_item_name: "General Sale",
            quick_total_amount: 0,
        },
        mode: "onBlur",
    });

    const [activeStep, setActiveStep] = useState<"form" | "preview">("form");
    const [savedInvoiceData, setSavedInvoiceData] = useState<any | null>(null);
    const [draftPreviewData, setDraftPreviewData] = useState<any | null>(null);
    const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(
        salesSettings?.autoSendWhatsAppOnInvoice ?? false
    );
    const sendInvoiceMutation = useWhatsAppSendInvoice();

    // Fetch Business Profile
    const { data: profile } = useQuery({
        queryKey: ["profile", currentUserId],
        queryFn: async () => {
            if (!currentUserId) return null;
            try {
                const { data } = await (supabase as any)
                    .from("profiles")
                    .select("*")
                    .eq("user_id", currentUserId)
                    .single();
                if (data) return data;
            } catch {
                // fallback
            }
            return queryClient.getQueryData<any>(["profile", currentUserId]) || null;
        },
        enabled: !!currentUserId,
    });

    useEffect(() => {
        if (open) {
            setSendWhatsApp(salesSettings?.autoSendWhatsAppOnInvoice ?? false);
        } else {
            setActiveStep("form");
            setSavedInvoiceData(null);
            setDraftPreviewData(null);
        }
    }, [open, salesSettings?.autoSendWhatsAppOnInvoice]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    // Enter-to-add-row support
    const descriptionRefs = useRef<(HTMLInputElement | null)[]>([]);
    const shouldFocusLastRowRef = useRef(false);

    const addEmptyItemRow = () => {
        shouldFocusLastRowRef.current = true;
        append({
            description: "",
            quantity: 1,
            price: 0,
            discount: 0,
            tax_rate: salesSettings?.defaultTaxRate ?? 0,
            total: 0,
            hsn_code: "",
            unit: "",
        });
    };

    const handleItemKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number
    ) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.stopPropagation();

        if (index === fields.length - 1) {
            addEmptyItemRow();
        } else {
            descriptionRefs.current[index + 1]?.focus();
        }
    };

    useEffect(() => {
        if (!shouldFocusLastRowRef.current) return;
        shouldFocusLastRowRef.current = false;
        requestAnimationFrame(() => {
            const lastIndex = fields.length - 1;
            descriptionRefs.current[lastIndex]?.focus();
        });
    }, [fields.length]);

    // Form watchers
    const watchItems = watch("items");
    const watchTaxRate = watch("tax_rate");
    const watchOverallDiscount = watch("overall_discount");
    const watchQuickItemName = watch("quick_item_name");
    const watchQuickTotalAmount = watch("quick_total_amount");
    const watchCustomerName = watch("customer_name") || "";
    const watchCustomerPhone = watch("customer_phone") || "";
    const watchCustomerEmail = watch("customer_email") || "";
    const watchCustomerGstin = watch("customer_gstin") || "";
    const watchPlaceOfSupply = watch("place_of_supply") || "";
    const watchStatus = watch("status") || "paid";
    const watchAmountPaid = watch("amount_paid") || 0;

    // Quick billing syncing
    useEffect(() => {
        if (open) {
            setIsQuickBilling(
                invoiceToEdit
                    ? false
                    : (salesSettings?.enableQuickBilling ?? false)
            );
        }
    }, [open, invoiceToEdit, salesSettings?.enableQuickBilling]);

    useEffect(() => {
        if (!isQuickBilling) return;

        const tax = Number(watchTaxRate) || 0;
        const total = Number(watchQuickTotalAmount) || 0;
        const price = total / (1 + tax / 100);

        setValue(
            "items",
            [
                {
                    description: watchQuickItemName || "General Sale",
                    quantity: 1,
                    price,
                    discount: 0,
                    tax_rate: tax,
                    total: price,
                    hsn_code: "",
                    unit: "",
                },
            ],
            {
                shouldValidate: true,
                shouldDirty: true,
            }
        );
    }, [isQuickBilling, watchQuickItemName, watchQuickTotalAmount, watchTaxRate, setValue]);

    // Fetch Parties
    const { data: parties = [] } = useQuery({
        queryKey: ["parties", currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];
            try {
                const { data } = await supabase
                    .from("parties" as any)
                    .select("*")
                    .eq("user_id", currentUserId)
                    .order("name", { ascending: true });

                if (data && data.length > 0) {
                    sqliteService.upsertBatch("parties", currentUserId, data).catch(() => {});
                    return data;
                }
            } catch {
                // Fall back
            }

            const cachedParties =
                (queryClient.getQueryData(["parties", currentUserId]) as any[]) ||
                (queryClient.getQueryData(["parties", authUser?.id]) as any[]) ||
                (queryClient.getQueryData(["parties"]) as any[]) ||
                [];

            if (cachedParties.length > 0) return cachedParties;
            const localParties = await sqliteService.getAll<any>("parties", currentUserId);
            return localParties || [];
        },
        enabled: !!currentUserId,
    });

    // Fetch Sales for accurate party previous balance
    const { data: userSales = [] } = useQuery({
        queryKey: ["sales", currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];
            try {
                const { data } = await supabase
                    .from("sales" as any)
                    .select("id, customer_name, total_amount, amount_paid, balance_due, status, date, document_type, party_id")
                    .eq("user_id", currentUserId)
                    .neq("status", "draft");
                if (data && data.length > 0) return data;
            } catch {
                // offline fallback
            }
            const cached = (queryClient.getQueryData(["sales", currentUserId]) as any[]) || [];
            if (cached.length > 0) return cached;
            return (await sqliteService.getAll<any>("sales", currentUserId)) || [];
        },
        enabled: !!currentUserId,
    });

    const selectedParty = parties.find(
        (p: any) => p.name?.trim().toLowerCase() === watchCustomerName.trim().toLowerCase()
    ) || null;

    // Modular Hook: Products Catalog & Autocomplete
    const {
        dbProducts,
        products,
        handleProductSelect: onProductSelectInternal,
        handleQuickAddProduct,
    } = useInvoiceProducts({
        currentUserId,
        authUserId: authUser?.id,
        defaultTaxRate: salesSettings?.defaultTaxRate ?? 0,
    });

    const handleProductSelect = (index: number, product: any) => {
        onProductSelectInternal(index, product, setValue, watch, append, fields.length);
    };

    // Modular Hook: Invoice Calculations & Draft Generator
    const {
        isItemWiseTax,
        subtotal,
        overallDiscountAmount,
        taxAmount,
        taxRate,
        roundOffDiff,
        totalAmount,
        currentInvoiceDue,
        partyPreviousBalance,
        partyClosingDue,
        buildDraftInvoice,
    } = useInvoiceCalculations({
        watchItems,
        watchTaxRate,
        watchOverallDiscount,
        watchQuickTotalAmount,
        watchStatus,
        watchAmountPaid,
        isQuickBilling,
        salesSettings,
        userSales,
        selectedParty,
        watchCustomerName,
        invoiceToEditId: invoiceToEdit?.id,
    });

    // Modular Hook: Invoice Validations
    const { validateInvoice } = useInvoiceValidation({
        salesSettings,
        itemSettings: settings,
        invoiceToEdit,
        products,
        authUser,
        queryClient,
        toast,
    });

    const handleCustomerSelect = (customerName: string) => {
        const party = parties.find((p: any) => p.name === customerName);
        if (!party) return;

        if (party.phone && !watch("customer_phone")) {
            setValue("customer_phone", party.phone, { shouldValidate: true, shouldDirty: true });
        }
        if (party.email && !watch("customer_email")) {
            setValue("customer_email", party.email, { shouldValidate: true, shouldDirty: true });
        }
        if (party.gstin && !watch("customer_gstin")) {
            setValue("customer_gstin", party.gstin, { shouldValidate: true, shouldDirty: true });
        }
    };

    // AI Smart Parse
    const handleSmartParse = (data: any) => {
        if (data.customerName) {
            setValue("customer_name", data.customerName, { shouldValidate: true, shouldDirty: true });
            handleCustomerSelect(data.customerName);
        }
        if (data.customerPhone) {
            setValue("customer_phone", data.customerPhone, { shouldValidate: true, shouldDirty: true });
        }
        if (data.customerEmail) {
            setValue("customer_email", data.customerEmail, { shouldValidate: true, shouldDirty: true });
        }
        if (data.customerGstin) {
            setValue("customer_gstin", data.customerGstin.toUpperCase(), { shouldValidate: true, shouldDirty: true });
        }
        if (data.status) {
            setValue("status", data.status, { shouldValidate: true, shouldDirty: true });
        }
        if (data.taxRate !== undefined) {
            setValue("tax_rate", data.taxRate, { shouldValidate: true, shouldDirty: true });
        }
        if (data.overallDiscount !== undefined) {
            setValue("overall_discount", data.overallDiscount, { shouldValidate: true, shouldDirty: true });
        }
        if (data.items && data.items.length > 0) {
            const mappedItems = data.items.map((item: any) => ({
                description: item.description,
                quantity: item.quantity || 1,
                price: item.price || 0,
                discount: item.discount || 0,
                tax_rate: data.taxRate !== undefined ? data.taxRate : (salesSettings?.defaultTaxRate ?? 0),
                total: (item.quantity || 1) * (item.price || 0) * (1 - (item.discount || 0) / 100),
                hsn_code: "",
                unit: "",
            }));
            setValue("items", mappedItems, { shouldValidate: true, shouldDirty: true });
        }
        toast({ title: "AI Magic ✨", description: "Invoice fields populated from your request." });
    };

    // Pre-fill Edit Form
    useEffect(() => {
        if (open && invoiceToEdit) {
            const items = (invoiceToEdit.items || []).map((it: any) => ({
                ...it,
                tax_rate: it.tax_rate !== undefined ? Number(it.tax_rate) : (invoiceToEdit.tax_rate ?? salesSettings?.defaultTaxRate ?? 0),
            }));

            reset({
                customer_name: invoiceToEdit.customer_name,
                customer_phone: invoiceToEdit.customer_phone,
                customer_email: invoiceToEdit.customer_email,
                customer_gstin: invoiceToEdit.customer_gstin || "",
                place_of_supply: invoiceToEdit.place_of_supply || "",
                is_reverse_charge: invoiceToEdit.is_reverse_charge || false,
                document_type: invoiceToEdit.document_type || "invoice",
                original_invoice_id: invoiceToEdit.original_invoice_id || "",
                invoice_number: invoiceToEdit.invoice_number,
                date: invoiceToEdit.date,
                items,
                tax_rate: (invoiceToEdit.tax_amount / (invoiceToEdit.subtotal || 1)) * 100,
                overall_discount: invoiceToEdit.overall_discount || 0,
                status: invoiceToEdit.status || "paid",
                amount_paid: Number(invoiceToEdit.amount_paid) || 0,
                irn: invoiceToEdit.irn || "",
                eway_bill_number: invoiceToEdit.eway_bill_number || "",
                qr_code: invoiceToEdit.qr_code || "",
                due_date: invoiceToEdit.due_date || "",
                notes: invoiceToEdit.notes || "",
            });
        } else if (open && !invoiceToEdit) {
            reset({
                customer_name: initialParty?.name || "",
                customer_phone: initialParty?.phone || "",
                customer_email: initialParty?.email || "",
                customer_gstin: initialParty?.gst_number || "",
                place_of_supply: initialParty?.gst_number ? initialParty.gst_number.trim().substring(0, 2) : "",
                billing_address: initialParty?.address || "",
                shipping_address: initialParty?.address || "",
                is_reverse_charge: false,
                document_type: "invoice",
                original_invoice_id: "",
                invoice_number: "",
                date: new Date().toISOString().split("T")[0],
                items: [
                    {
                        description: "",
                        quantity: 1,
                        price: 0,
                        discount: 0,
                        tax_rate: salesSettings?.defaultTaxRate ?? 0,
                        total: 0,
                        hsn_code: "",
                        unit: "",
                    },
                ],
                tax_rate: salesSettings?.defaultTaxRate ?? 0,
                overall_discount: 0,
                status: salesSettings?.defaultStatus ?? "paid",
                amount_paid: 0,
                irn: "",
                eway_bill_number: "",
                qr_code: "",
                due_date: salesSettings?.defaultPaymentTermsDays
                    ? new Date(new Date().getTime() + salesSettings.defaultPaymentTermsDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
                    : "",
                notes: salesSettings?.defaultTermsAndConditions || "",
            });
        }
    }, [open, invoiceToEdit, initialParty, reset, salesSettings]);

    // Next Invoice Number
    const { data: lastInvoiceNumber } = useQuery({
        queryKey: ["last-invoice-number"],
        queryFn: async () => {
            if (invoiceToEdit) return null;
            const user = authUser;
            if (!user) return null;

            try {
                if (navigator.onLine) {
                    try {
                        const nextNum = await invoicesApi.getNextInvoiceNumber(salesSettings?.invoiceNumberPrefix ?? "INV-");
                        if (nextNum) return nextNum;
                    } catch {
                        // fallback
                    }
                }
                const { data, error } = await supabase
                    .from("sales" as any)
                    .select("invoice_number")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!error && data) return (data as any).invoice_number;
            } catch {
                // cache fallback
            }

            const cachedSales = (queryClient.getQueryData(["sales", user.id]) as any[]) || [];
            return cachedSales[0]?.invoice_number || null;
        },
        enabled: open && !invoiceToEdit,
    });

    useEffect(() => {
        if (open && !invoiceToEdit) {
            const prefix = salesSettings?.invoiceNumberPrefix ?? "";
            if (lastInvoiceNumber) {
                const stripped = lastInvoiceNumber.startsWith(prefix) ? lastInvoiceNumber.slice(prefix.length) : lastInvoiceNumber;
                const numericPart = parseInt(stripped.replace(/\D/g, ""));
                setValue("invoice_number", !isNaN(numericPart) ? `${prefix}${numericPart + 1}` : `${prefix}1`);
            } else {
                setValue("invoice_number", `${prefix}1`);
            }
        }
    }, [open, lastInvoiceNumber, setValue, invoiceToEdit, salesSettings?.invoiceNumberPrefix]);

    const handlePreviewDraft = () => {
        const values = getValues();
        const draft = buildDraftInvoice(values, lastInvoiceNumber, profile, invoiceToEdit);
        setDraftPreviewData(draft);
        setActiveStep("preview");
    };

    // Mutation
    const createInvoiceMutation = useCreateInvoiceMutation({
        authUser,
        profile,
        invoiceToEdit,
        salesSettings,
        itemSettings: settings,
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
    });

    const onSubmit = async (data: InvoiceFormValues) => {
        const isValid = await validateInvoice(data);
        if (!isValid) return;
        createInvoiceMutation.mutate(data);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setActiveStep("form");
                    setSavedInvoiceData(null);
                    setDraftPreviewData(null);
                    reset();
                }
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="sm:max-w-[1100px] max-h-[92vh] p-0 flex flex-col bg-background border-slate-200 shadow-xl overflow-hidden rounded-md">
                {activeStep === "preview" ? (
                    <InvoicePreview
                        invoice={savedInvoiceData || draftPreviewData}
                        profile={profile}
                        salesSettings={salesSettings}
                        onEdit={() => setActiveStep("form")}
                        onClose={() => {
                            setActiveStep("form");
                            setSavedInvoiceData(null);
                            setDraftPreviewData(null);
                            reset();
                            onOpenChange(false);
                        }}
                        isDraft={!savedInvoiceData}
                        onSave={!savedInvoiceData ? handleSubmit(onSubmit) : undefined}
                    />
                ) : (
                    <>
                        <DialogHeader className="px-8 py-5 border-b border-border/60 bg-slate-50/50">
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-800">
                                        {invoiceToEdit ? "Edit Invoice" : "New Invoice"}
                                    </DialogTitle>
                                </div>

                                <div className="flex items-center gap-4">
                                    {!invoiceToEdit && (
                                        <div className="flex items-center space-x-1 border rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsQuickBilling(true);
                                                    setValue("quick_total_amount", 0);
                                                }}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                                    isQuickBilling
                                                        ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                                                        : "text-slate-500 hover:text-slate-700"
                                                }`}
                                            >
                                                Quick Billing
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setIsQuickBilling(false)}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                                    !isQuickBilling
                                                        ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                                                        : "text-slate-500 hover:text-slate-700"
                                                }`}
                                            >
                                                Full Billing
                                            </button>
                                        </div>
                                    )}

                                    <span
                                        className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${
                                            watch("status") === "paid"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : watch("status") === "partial"
                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                    : "bg-orange-50 text-orange-700 border-orange-200"
                                        }`}
                                    >
                                        {watch("status") === "paid"
                                            ? "PAID"
                                            : watch("status") === "partial"
                                                ? "PARTIAL"
                                                : "PENDING"}
                                    </span>
                                </div>
                            </div>
                        </DialogHeader>

                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="flex-1 overflow-y-auto flex flex-col"
                        >
                            {isQuickBilling ? (
                                <QuickInvoiceFormSection
                                    watchCustomerName={watchCustomerName}
                                    watchCustomerPhone={watchCustomerPhone}
                                    watchCustomerEmail={watchCustomerEmail}
                                    watchCustomerGstin={watchCustomerGstin}
                                    watchPlaceOfSupply={watchPlaceOfSupply}
                                    watchQuickItemName={watchQuickItemName}
                                    watchQuickTotalAmount={watchQuickTotalAmount}
                                    watch={watch}
                                    register={register}
                                    setValue={setValue}
                                    errors={errors}
                                    parties={parties}
                                    products={products}
                                    currentUserId={currentUserId}
                                    salesSettings={salesSettings}
                                    selectedParty={selectedParty}
                                    partyPreviousBalance={partyPreviousBalance}
                                    currentInvoiceDue={currentInvoiceDue}
                                    partyClosingDue={partyClosingDue}
                                    handleCustomerSelect={handleCustomerSelect}
                                    handleQuickAddProduct={handleQuickAddProduct}
                                    formatCurrency={formatCurrency}
                                />
                            ) : (
                                <div className="flex-1 px-8 py-6 space-y-10">
                                    {/* AI SMART FILL */}
                                    {!invoiceToEdit && (
                                        <div className="bg-violet-500/5 border border-violet-500/10 p-4 rounded-lg">
                                            <Label className="text-xs font-semibold text-violet-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                                                <Wand2 className="w-3 h-3" />
                                                AI Smart Fill Invoice
                                            </Label>
                                            <SmartSaleInput
                                                onParse={handleSmartParse}
                                                products={products.map((p) => ({
                                                    name: p.name,
                                                    price: Number(p.price ?? p.cost_price ?? 0),
                                                }))}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
                                                Try typing: "Sold 3 cups at 200 each to Rahul, unpaid"
                                            </p>
                                        </div>
                                    )}

                                    {/* CUSTOMER + INVOICE DETAILS */}
                                    <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-16">
                                        <div className="flex-1 space-y-4">
                                            <CustomerSection
                                                customerName={watchCustomerName}
                                                customerPhone={watchCustomerPhone}
                                                customerEmail={watchCustomerEmail}
                                                customerGstin={watchCustomerGstin}
                                                placeOfSupply={watchPlaceOfSupply}
                                                onCustomerNameChange={(val) => {
                                                    setValue("customer_name", val, {
                                                        shouldValidate: true,
                                                        shouldDirty: true,
                                                    });
                                                    handleCustomerSelect(val);
                                                }}
                                                onCustomerPhoneChange={(val) =>
                                                    setValue("customer_phone", val, {
                                                        shouldValidate: true,
                                                        shouldDirty: true,
                                                    })
                                                }
                                                onCustomerEmailChange={(val) =>
                                                    setValue("customer_email", val, {
                                                        shouldValidate: true,
                                                        shouldDirty: true,
                                                    })
                                                }
                                                onCustomerGstinChange={(val) =>
                                                    setValue("customer_gstin", val, {
                                                        shouldValidate: true,
                                                        shouldDirty: true,
                                                    })
                                                }
                                                onPlaceOfSupplyChange={(val) =>
                                                    setValue("place_of_supply", val, {
                                                        shouldValidate: true,
                                                        shouldDirty: true,
                                                    })
                                                }
                                                parties={parties}
                                                userId={currentUserId}
                                                error={errors.customer_name?.message}
                                                onPartySelected={(party) => {
                                                    if (party.phone) setValue("customer_phone", party.phone, { shouldDirty: true });
                                                    if (party.email) setValue("customer_email", party.email, { shouldDirty: true });
                                                    const gst = party.gst_number || party.gstin;
                                                    if (gst) {
                                                        setValue("customer_gstin", gst, { shouldDirty: true });
                                                        if (!watchPlaceOfSupply && gst.length >= 2) {
                                                            setValue("place_of_supply", gst.slice(0, 2), { shouldDirty: true });
                                                        }
                                                    }
                                                    if (party.address) {
                                                        setValue("billing_address", party.address, { shouldDirty: true });
                                                        setValue("shipping_address", party.address, { shouldDirty: true });
                                                    }
                                                }}
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-500">
                                                        Billing Address (Optional)
                                                    </Label>
                                                    <Input
                                                        {...register("billing_address")}
                                                        placeholder="Street address, city, pin code"
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-500">
                                                        Shipping Address (Optional)
                                                    </Label>
                                                    <Input
                                                        {...register("shipping_address")}
                                                        placeholder="Leave blank if same as billing"
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        {...register("is_reverse_charge")}
                                                        className="rounded border-slate-300 w-4 h-4 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-xs font-medium">
                                                        Reverse Charge (RCM)
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        <InvoiceDetailsSection
                                            register={register}
                                            watch={watch}
                                            errors={errors}
                                            totalAmount={totalAmount}
                                            formatCurrency={formatCurrency}
                                        />
                                    </div>

                                    {/* ITEMS TABLE */}
                                    <InvoiceItemsTable
                                        fields={fields}
                                        register={register}
                                        errors={errors}
                                        watch={watch}
                                        watchItems={watchItems}
                                        setValue={setValue}
                                        products={products}
                                        salesSettings={salesSettings}
                                        handleProductSelect={handleProductSelect}
                                        handleQuickAddProduct={handleQuickAddProduct}
                                        descriptionRefs={descriptionRefs}
                                        handleItemKeyDown={handleItemKeyDown}
                                        remove={remove}
                                        addEmptyItemRow={addEmptyItemRow}
                                        formatCurrency={formatCurrency}
                                    />

                                    {/* NOTES + TOTALS */}
                                    <InvoiceSummaryTotals
                                        register={register}
                                        subtotal={subtotal}
                                        overallDiscountAmount={overallDiscountAmount}
                                        isItemWiseTax={isItemWiseTax}
                                        salesSettings={salesSettings}
                                        taxRate={taxRate}
                                        taxAmount={taxAmount}
                                        roundOffDiff={roundOffDiff}
                                        totalAmount={totalAmount}
                                        watchCustomerName={watchCustomerName}
                                        selectedParty={selectedParty}
                                        partyPreviousBalance={partyPreviousBalance}
                                        currentInvoiceDue={currentInvoiceDue}
                                        partyClosingDue={partyClosingDue}
                                        formatCurrency={formatCurrency}
                                    />
                                </div>
                            )}

                            {/* FOOTER */}
                            <InvoiceTotalsFooter
                                sendWhatsApp={sendWhatsApp}
                                onSendWhatsAppChange={setSendWhatsApp}
                                onCancel={() => onOpenChange(false)}
                                onPreview={handlePreviewDraft}
                                isPending={createInvoiceMutation.isPending}
                                isEditing={Boolean(invoiceToEdit)}
                            />
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default CreateInvoiceDialog;