import { useState, useEffect, useRef, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Trash2,
    Loader2,
    Percent,
    FileText,
    Wand2,
    Plus,
    Wallet,
    Eye,
    MessageCircle,
} from "lucide-react";
import { InvoicePreview } from "./InvoicePreview";
import { useWhatsAppSendInvoice } from "@/features/whatsapp/hooks/useWhatsApp";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
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
    InvoiceItem,
    InvoiceFormValues,
} from "../hooks/useCreateInvoiceMutation";
import { ProductCombobox, ProductItem } from "@/features/purchases/components/purchase/ProductCombobox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useItemSettings } from "@/core/hooks/use-item-settings";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import { useProductsRealtime } from "@/core/hooks/useProductsRealtime";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/core/lib/auth";
import { invoicesApi, CreateInvoicePayload } from "@/core/api/invoices";

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

    // ============================================================
    // ENTER-TO-ADD-ROW SUPPORT
    // ============================================================

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

    // Focus the newly created row after React mounts it.
    useEffect(() => {
        if (!shouldFocusLastRowRef.current) return;

        shouldFocusLastRowRef.current = false;

        requestAnimationFrame(() => {
            const lastIndex = fields.length - 1;
            descriptionRefs.current[lastIndex]?.focus();
        });
    }, [fields.length]);

    // ============================================================
    // WATCHERS
    // ============================================================

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

    // ============================================================
    // QUICK BILLING
    // ============================================================

    useEffect(() => {
        if (open) {
            setIsQuickBilling(
                invoiceToEdit
                    ? false
                    : (salesSettings?.enableQuickBilling ?? false)
            );
        }
    }, [
        open,
        invoiceToEdit,
        salesSettings?.enableQuickBilling,
    ]);

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
    }, [
        isQuickBilling,
        watchQuickItemName,
        watchQuickTotalAmount,
        watchTaxRate,
        setValue,
    ]);

    // ============================================================
    // FETCH PARTIES
    // ============================================================

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
                // Fall back to React Query cache or SQLite
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

    // ============================================================
    // FETCH SALES FOR ACCURATE PARTY PREVIOUS BALANCE CALCULATION
    // ============================================================

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

    const selectedParty = useMemo(() => {
        const trimmedName = watchCustomerName.trim().toLowerCase();
        if (!trimmedName) return null;
        return (parties as any[]).find(
            (p: any) => p.name?.trim().toLowerCase() === trimmedName
        ) || null;
    }, [watchCustomerName, parties]);

    // CA-Grade Ledger Calculation for Party's Prior Pending Balance
    const partyPreviousBalance = useMemo(() => {
        if (!selectedParty && !watchCustomerName.trim()) return 0;
        const pName = watchCustomerName.trim().toLowerCase();

        const openBal = Number(selectedParty?.opening_balance) || 0;
        const isOpeningReceivable = selectedParty?.opening_balance_type
            ? selectedParty.opening_balance_type === "to_receive"
            : selectedParty?.type !== "vendor";
        let balance = isOpeningReceivable ? openBal : -openBal;

        const currentInvoiceId = invoiceToEdit?.id;

        (userSales as any[]).forEach((s: any) => {
            if (currentInvoiceId && s.id === currentInvoiceId) return;

            const isPartyMatch = (selectedParty?.id && s.party_id === selectedParty.id) ||
                (s.customer_name && s.customer_name.trim().toLowerCase() === pName);

            if (!isPartyMatch) return;

            const total = Number(s.total_amount) || 0;
            const paid = Number(s.amount_paid != null ? s.amount_paid : (s.status === "paid" ? total : 0));
            const due = Number(s.balance_due != null ? s.balance_due : Math.max(0, total - paid));
            const docType = (s.document_type || "invoice").toLowerCase();

            if (docType === "receipt") {
                balance = Math.max(0, balance - (total || paid));
            } else if (docType === "credit_note") {
                balance = balance - total;
            } else if (docType === "debit_note") {
                balance += total;
            } else {
                balance += due;
            }
        });

        return balance;
    }, [selectedParty, watchCustomerName, userSales, invoiceToEdit?.id]);

    const handleCustomerSelect = (customerName: string) => {
        const party = parties.find(
            (p: any) => p.name === customerName
        );

        if (!party) return;

        if (party.phone && !watch("customer_phone")) {
            setValue("customer_phone", party.phone, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }

        if (party.email && !watch("customer_email")) {
            setValue("customer_email", party.email, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }

        if (party.gstin && !watch("customer_gstin")) {
            setValue(
                "customer_gstin",
                party.gstin,
                {
                    shouldValidate: true,
                    shouldDirty: true,
                }
            );
        }
    };

    // ============================================================
    // AI SMART PARSE
    // ============================================================

    const handleSmartParse = (data: {
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        customerGstin?: string;
        status?: "paid" | "pending";
        items?: Array<{
            description: string;
            quantity: number;
            price: number;
            discount?: number;
        }>;
        taxRate?: number;
        overallDiscount?: number;
    }) => {
        if (data.customerName) {
            setValue(
                "customer_name",
                data.customerName,
                {
                    shouldValidate: true,
                    shouldDirty: true,
                }
            );

            handleCustomerSelect(data.customerName);
        }

        if (data.customerPhone) {
            setValue(
                "customer_phone",
                data.customerPhone,
                {
                    shouldValidate: true,
                    shouldDirty: true,
                }
            );
        }

        if (data.customerEmail) {
            setValue(
                "customer_email",
                data.customerEmail,
                {
                    shouldValidate: true,
                    shouldDirty: true,
                }
            );
        }

        if (data.customerGstin) {
            setValue(
                "customer_gstin",
                data.customerGstin.toUpperCase(),
                {
                    shouldValidate: true,
                    shouldDirty: true,
                }
            );
        }

        if (data.status) {
            setValue("status", data.status, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }

        if (data.taxRate !== undefined) {
            setValue("tax_rate", data.taxRate, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }

        if (data.overallDiscount !== undefined) {
            setValue(
                "overall_discount",
                data.overallDiscount,
                {
                    shouldValidate: true,
                    shouldDirty: true,
                }
            );
        }

        if (data.items && data.items.length > 0) {
            const mappedItems = data.items.map((item) => ({
                description: item.description,
                quantity: item.quantity || 1,
                price: item.price || 0,
                discount: item.discount || 0,
                tax_rate:
                    data.taxRate !== undefined
                        ? data.taxRate
                        : (salesSettings?.defaultTaxRate ?? 0),
                total:
                    (item.quantity || 1) *
                    (item.price || 0) *
                    (1 - (item.discount || 0) / 100),
                hsn_code: "",
                unit: "",
            }));

            setValue("items", mappedItems, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }

        toast({
            title: "AI Magic ✨",
            description:
                "Invoice fields populated from your request.",
        });
    };

    // ============================================================
    // PRE-FILL EDIT FORM
    // ============================================================

    useEffect(() => {
        if (open && invoiceToEdit) {
            const items = (invoiceToEdit.items || []).map(
                (it: any) => ({
                    ...it,
                    tax_rate:
                        it.tax_rate !== undefined
                            ? Number(it.tax_rate)
                            : (
                                invoiceToEdit.tax_rate ??
                                salesSettings?.defaultTaxRate ??
                                0
                            ),
                })
            );

            reset({
                customer_name: invoiceToEdit.customer_name,
                customer_phone: invoiceToEdit.customer_phone,
                customer_email: invoiceToEdit.customer_email,
                customer_gstin:
                    invoiceToEdit.customer_gstin || "",
                place_of_supply:
                    invoiceToEdit.place_of_supply || "",
                is_reverse_charge:
                    invoiceToEdit.is_reverse_charge || false,
                document_type:
                    invoiceToEdit.document_type || "invoice",
                original_invoice_id:
                    invoiceToEdit.original_invoice_id || "",
                invoice_number:
                    invoiceToEdit.invoice_number,
                date: invoiceToEdit.date,
                items,
                tax_rate:
                    (invoiceToEdit.tax_amount /
                        (invoiceToEdit.subtotal || 1)) *
                    100,
                overall_discount:
                    invoiceToEdit.overall_discount || 0,
                status:
                    invoiceToEdit.status || "paid",
                amount_paid:
                    Number(invoiceToEdit.amount_paid) || 0,
                irn: invoiceToEdit.irn || "",
                eway_bill_number:
                    invoiceToEdit.eway_bill_number || "",
                qr_code:
                    invoiceToEdit.qr_code || "",
                due_date:
                    invoiceToEdit.due_date || "",
                notes:
                    invoiceToEdit.notes || "",
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
                date: new Date()
                    .toISOString()
                    .split("T")[0],
                items: [
                    {
                        description: "",
                        quantity: 1,
                        price: 0,
                        discount: 0,
                        tax_rate:
                            salesSettings?.defaultTaxRate ?? 0,
                        total: 0,
                        hsn_code: "",
                        unit: "",
                    },
                ],
                tax_rate:
                    salesSettings?.defaultTaxRate ?? 0,
                overall_discount: 0,
                status:
                    salesSettings?.defaultStatus ?? "paid",
                amount_paid: 0,
                irn: "",
                eway_bill_number: "",
                qr_code: "",
                due_date:
                    salesSettings?.defaultPaymentTermsDays
                        ? new Date(
                            new Date().getTime() +
                            salesSettings.defaultPaymentTermsDays *
                            24 *
                            60 *
                            60 *
                            1000
                        )
                            .toISOString()
                            .split("T")[0]
                        : "",
                notes:
                    salesSettings?.defaultTermsAndConditions ||
                    "",
            });
        }
    }, [
        open,
        invoiceToEdit,
        initialParty,
        reset,
        salesSettings,
    ]);

    // ============================================================
    // LAST INVOICE NUMBER
    // ============================================================

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
                        // fallback to DB
                    }
                }
                const { data, error } = await supabase
                    .from("sales" as any)
                    .select("invoice_number")
                    .eq("user_id", user.id)
                    .order("created_at", {
                        ascending: false,
                    })
                    .limit(1)
                    .maybeSingle();

                if (!error && data) {
                    return (data as any).invoice_number;
                }
            } catch {
                // Fall back to cache.
            }

            const cachedSales =
                (queryClient.getQueryData([
                    "sales",
                    user.id,
                ]) as any[]) || [];

            return cachedSales[0]?.invoice_number || null;
        },
        enabled: open && !invoiceToEdit,
    });

    useEffect(() => {
        if (open && !invoiceToEdit) {
            const prefix =
                salesSettings?.invoiceNumberPrefix ?? "";

            if (lastInvoiceNumber) {
                const stripped =
                    lastInvoiceNumber.startsWith(prefix)
                        ? lastInvoiceNumber.slice(prefix.length)
                        : lastInvoiceNumber;

                const numericPart = parseInt(
                    stripped.replace(/\D/g, "")
                );

                if (!isNaN(numericPart)) {
                    setValue(
                        "invoice_number",
                        `${prefix}${numericPart + 1}`
                    );
                } else {
                    setValue(
                        "invoice_number",
                        `${prefix}1`
                    );
                }
            } else {
                setValue(
                    "invoice_number",
                    `${prefix}1`
                );
            }
        }
    }, [
        open,
        lastInvoiceNumber,
        setValue,
        invoiceToEdit,
        salesSettings?.invoiceNumberPrefix,
    ]);

    // ============================================================
    // FETCH PRODUCTS & HISTORICAL SALES FOR AUTOCOMPLETE POOL
    // ============================================================

    const { data: dbProducts = [] } = useQuery({
        queryKey: ["products", currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];
            try {
                const { data, error } = await supabase
                    .from("products" as any)
                    .select("*")
                    .eq("user_id", currentUserId)
                    .order("name", { ascending: true });

                if (!error && data && data.length > 0) {
                    sqliteService.upsertBatch("products", currentUserId, data).catch(() => {});
                    return data;
                }
            } catch (err) {
                console.warn("Failed to fetch products from Supabase, falling back to cache and sqlite", err);
            }

            const cached =
                queryClient.getQueryData<any[]>(["products", currentUserId]) ||
                queryClient.getQueryData<any[]>(["products", authUser?.id]) ||
                queryClient.getQueryData<any[]>(["products"]);

            if (cached && cached.length > 0) return cached;

            const localProducts = await sqliteService.getAll<any>("products", currentUserId);
            if (localProducts && localProducts.length > 0) return localProducts;

            if (authUser?.id && authUser.id !== currentUserId) {
                const altLocal = await sqliteService.getAll<any>("products", authUser.id);
                if (altLocal && altLocal.length > 0) return altLocal;
            }

            return [];
        },
        enabled: !!currentUserId,
    });

    // Fetch Recent Sales to Auto-Learn & Suggest Historically Billed Items
    const { data: historicalSales = [] } = useQuery({
        queryKey: ["sales-history-items", currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];
            try {
                const { data, error } = await supabase
                    .from("sales" as any)
                    .select("items")
                    .eq("user_id", currentUserId)
                    .order("date", { ascending: false })
                    .limit(50);
                if (!error && data) return data;
            } catch (err) {
                console.warn("Failed to fetch historical sales items", err);
            }

            try {
                const localSales = await sqliteService.getAll<any>("sales", currentUserId);
                return localSales || [];
            } catch {
                return [];
            }
        },
        enabled: !!currentUserId,
    });

    // Merge Catalog Products and Historical Items into a Single Rich Autocomplete Pool
    const products: ProductItem[] = useMemo(() => {
        const productMap = new Map<string, ProductItem>();

        // 1. Inventory Products (Highest priority)
        (dbProducts as any[]).forEach((p: any) => {
            if (!p || !p.name || typeof p.name !== "string" || !p.name.trim()) return;
            const key = p.name.toLowerCase().trim();
            productMap.set(key, {
                id: p.id || `prod-${key}`,
                name: p.name.trim(),
                cost_price: Number(p.cost_price ?? p.price ?? 0),
                price: Number(p.price ?? p.cost_price ?? 0),
                stock_quantity: Number(p.stock_quantity ?? 0),
                unit: p.unit || "pc",
                hsn_code: p.hsn_code || "",
                tax_rate: p.tax_rate !== undefined ? Number(p.tax_rate) : (p.tax !== undefined ? Number(p.tax) : undefined),
            });
        });

        // 2. Historical Items (Auto-learned items not yet in catalog)
        (historicalSales as any[]).forEach((record: any) => {
            if (Array.isArray(record?.items)) {
                record.items.forEach((it: any) => {
                    const desc = it?.description || it?.name;
                    if (!desc || typeof desc !== "string" || !desc.trim()) return;
                    const key = desc.toLowerCase().trim();
                    if (!productMap.has(key)) {
                        productMap.set(key, {
                            id: `history-${key}`,
                            name: desc.trim(),
                            price: Number(it.price || it.cost_price || 0),
                            cost_price: Number(it.cost_price || it.price || 0),
                            stock_quantity: undefined,
                            unit: it.unit || "pc",
                            hsn_code: it.hsn_code || "",
                            tax_rate: it.tax_rate !== undefined ? Number(it.tax_rate) : undefined,
                        });
                    }
                });
            }
        });

        return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [dbProducts, historicalSales]);

    // ============================================================
    // PRODUCT SELECTION
    // ============================================================

    const handleProductSelect = (
        index: number,
        product: ProductItem
    ) => {
        if (!product) return;

        setValue(
            `items.${index}.description`,
            product.name,
            {
                shouldValidate: true,
                shouldDirty: true,
            }
        );

        const selPrice = Number(product.price ?? product.cost_price ?? 0);
        setValue(
            `items.${index}.price`,
            selPrice,
            {
                shouldValidate: true,
                shouldDirty: true,
            }
        );

        if (product.hsn_code) {
            setValue(
                `items.${index}.hsn_code`,
                product.hsn_code,
                {
                    shouldDirty: true,
                }
            );
        }

        if (product.unit) {
            setValue(
                `items.${index}.unit`,
                product.unit,
                {
                    shouldDirty: true,
                }
            );
        }

        if (product.tax_rate !== undefined) {
            setValue(
                `items.${index}.tax_rate`,
                Number(
                    product.tax_rate ??
                    salesSettings?.defaultTaxRate ??
                    0
                ),
                {
                    shouldDirty: true,
                }
            );
        }

        // Recalculate line total
        const qty = Number(watch(`items.${index}.quantity`) || 1);
        const disc = Number(watch(`items.${index}.discount`) || 0);
        const lineTotal = Math.max(0, qty * selPrice * (1 - disc / 100));
        setValue(`items.${index}.total`, lineTotal, { shouldDirty: true });

        // Auto append next item row if selecting on the last item
        if (index === fields.length - 1) {
            append({
                description: "",
                quantity: 1,
                price: 0,
                discount: 0,
                tax_rate: salesSettings?.defaultTaxRate ?? 0,
                total: 0,
                hsn_code: "",
                unit: product.unit || "pc",
            });
        }
    };

    const handleQuickAddProduct = async (newProd: ProductItem) => {
        if (!currentUserId) return;
        try {
            const isValidUUID = (id: any) =>
                typeof id === "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const recordId = isValidUUID(newProd.id) ? newProd.id : uuidv4();
            const newRecord = {
                id: recordId,
                user_id: currentUserId,
                name: newProd.name.trim(),
                cost_price: Number(newProd.cost_price || 0),
                price: Number(newProd.price || newProd.cost_price || 0),
                stock_quantity: Number(newProd.stock_quantity || 0),
                unit: newProd.unit || "pc",
                hsn_code: newProd.hsn_code || null,
            };

            await offlineMutate({
                table: "products",
                action: "insert",
                recordId,
                payload: newRecord,
                userId: currentUserId,
            });

            // Update React Query cache immediately for instant dropdown inclusion
            queryClient.setQueryData(["products", currentUserId], (old: any) => {
                return old ? [newRecord, ...old] : [newRecord];
            });

            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast({
                title: "Product saved",
                description: `"${newProd.name}" added to product catalog.`,
            });
        } catch (e) {
            console.error("Failed to quick-add product", e);
        }
    };

    const handleQuickProductSelect = (
        productName: string
    ) => {
        const product = (products as any[]).find(
            (p: any) => p.name === productName
        );

        if (product) {
            setValue(
                "quick_total_amount",
                product.price,
                {
                    shouldValidate: true,
                    shouldDirty: true,
                }
            );
        }
    };

    // ============================================================
    // OUTSTANDING BALANCE
    // ============================================================

    const checkOutstandingBalance = async (
        customerName: string
    ): Promise<boolean> => {
        if (
            !salesSettings?.warnOnOutstandingBalance ||
            !customerName.trim()
        ) {
            return true;
        }

        const user = authUser;

        if (!user) return true;

        let outstanding: any[] = [];

        try {
            const { data } = await supabase
                .from("sales" as any)
                .select(
                    "id, status, total_amount, invoice_number"
                )
                .eq("user_id", user.id)
                .eq("customer_name", customerName)
                .in("status", [
                    "pending",
                    "overdue",
                    "partial",
                ]);

            outstanding =
                (data as any[] | null) ?? [];
        } catch {
            const cachedSales =
                (queryClient.getQueryData([
                    "sales",
                    user.id,
                ]) as any[]) || [];

            outstanding = cachedSales.filter(
                (s: any) =>
                    s.customer_name === customerName &&
                    ["pending", "overdue", "partial"].includes(
                        s.status
                    )
            );
        }

        if (outstanding.length > 0) {
            const total = outstanding.reduce(
                (sum: number, inv: any) =>
                    sum +
                    Number(inv.balance_due != null ? inv.balance_due : inv.total_amount || 0),
                0
            );

            const formatted =
                new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                }).format(total);

            return window.confirm(
                `⚠️ Outstanding Balance Warning\n\n"${customerName}" has ${outstanding.length} unpaid invoice(s) totalling ${formatted}.\n\nDo you still want to create a new invoice for this customer?`
            );
        }

        return true;
    };

    // ============================================================
    // REAL-TIME CALCULATION
    // ============================================================

    const isItemWiseTax =
        !!(salesSettings?.enableItemWiseTax || salesSettings?.showItemTaxRateOnBill);

    const subtotal = watchItems.reduce(
        (sum, item) => {
            const qty =
                Number(item.quantity) || 0;

            const price =
                Number(item.price) || 0;

            const discPercent =
                Number(item.discount) || 0;

            const itemTotal =
                qty *
                price *
                (1 - discPercent / 100);

            return sum + itemTotal;
        },
        0
    );

    const overallDiscountPercent =
        Number(watchOverallDiscount) || 0;

    const overallDiscountAmount =
        (subtotal *
            overallDiscountPercent) /
        100;

    const taxableAmount = Math.max(
        0,
        subtotal - overallDiscountAmount
    );

    let taxAmount = 0;
    let taxRate =
        Number(watchTaxRate) || 0;

    if (isItemWiseTax) {
        const discountFactor =
            subtotal > 0
                ? taxableAmount / subtotal
                : 1;

        taxAmount = watchItems.reduce(
            (sum, item) => {
                const qty =
                    Number(item.quantity) || 0;

                const price =
                    Number(item.price) || 0;

                const discPercent =
                    Number(item.discount) || 0;

                const lineTaxable =
                    qty *
                    price *
                    (1 - discPercent / 100) *
                    discountFactor;

                const itemTaxRate =
                    Number(
                        item.tax_rate ??
                        salesSettings?.defaultTaxRate ??
                        0
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

        taxRate =
            taxableAmount > 0
                ? (taxAmount / taxableAmount) * 100
                : 0;
    } else {
        taxAmount =
            (taxableAmount * taxRate) / 100;
    }

    const rawTotal =
        taxableAmount + taxAmount;

    const roundedTotal =
        salesSettings?.roundOffTotal
            ? Math.round(rawTotal)
            : rawTotal;

    const roundOffDiff =
        salesSettings?.roundOffTotal
            ? roundedTotal - rawTotal
            : 0;

    const totalAmount = roundedTotal;

    const effectiveInvoiceTotal = isQuickBilling ? (Number(watchQuickTotalAmount) || 0) : roundedTotal;

    const currentInvoiceDue = useMemo(() => {
        const paidVal = Number(watchAmountPaid) || 0;
        if (watchStatus === "paid") return 0;
        if (watchStatus === "pending") return effectiveInvoiceTotal;
        return Math.max(0, effectiveInvoiceTotal - paidVal);
    }, [watchStatus, watchAmountPaid, effectiveInvoiceTotal]);

    const partyClosingDue = partyPreviousBalance + currentInvoiceDue;

    const handlePreviewDraft = () => {
        const values = getValues();
        const calculatedOverallDiscount =
            (subtotal * (Number(values.overall_discount) || 0)) / 100;

        let processedDraftItems: any[] = [];
        if (isQuickBilling) {
            const totalVal = Number(values.quick_total_amount) || 0;
            const taxR = Number(values.tax_rate) || 0;
            const priceVal = totalVal / (1 + taxR / 100);
            processedDraftItems = [
                {
                    description:
                        values.quick_item_name?.trim() || "General Sale",
                    quantity: 1,
                    price: priceVal,
                    discount: 0,
                    tax_rate: taxR,
                    total: priceVal,
                    hsn_code: "",
                },
            ];
        } else {
            const valid = values.items.filter(
                (it) => it.description && it.description.trim() !== ""
            );
            const list = valid.length > 0 ? valid : values.items;
            processedDraftItems = list.map((item) => {
                const q = Number(item.quantity) || 1;
                const p = Number(item.price) || 0;
                const d = Number(item.discount) || 0;
                return {
                    ...item,
                    description: item.description || "Item",
                    quantity: q,
                    price: p,
                    discount: d,
                    tax_rate:
                        item.tax_rate !== undefined
                            ? Number(item.tax_rate)
                            : (salesSettings?.defaultTaxRate ?? 0),
                    total: q * p * (1 - d / 100),
                };
            });
        }

        const draftInvoice = {
            id: invoiceToEdit?.id,
            invoice_number:
                values.invoice_number ||
                (lastInvoiceNumber
                    ? `INV-${Number(String(lastInvoiceNumber).replace(/\D/g, "")) + 1}`
                    : "INV-001"),
            customer_name: values.customer_name || "Cash Customer",
            customer_phone: values.customer_phone,
            customer_email: values.customer_email,
            customer_gstin: values.customer_gstin,
            place_of_supply: values.place_of_supply,
            billing_address: values.billing_address,
            shipping_address: values.shipping_address,
            date: values.date,
            due_date: values.due_date,
            status: values.status,
            amount_paid: Number(values.amount_paid) || 0,
            balance_due: currentInvoiceDue,
            items: processedDraftItems,
            subtotal: subtotal,
            discount_amount: calculatedOverallDiscount,
            tax_rate: Number(values.tax_rate) || 0,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            previous_balance: partyPreviousBalance,
            total_due_balance: partyClosingDue,
            party_pending_balance: partyClosingDue,
            notes: values.notes,
            profile: profile,
        };

        setDraftPreviewData(draftInvoice);
        setActiveStep("preview");
    };

    // ============================================================
    // MUTATION
    // ============================================================

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

    // ============================================================
    // SUBMIT
    // ============================================================

    const onSubmit = async (
        data: InvoiceFormValues
    ) => {
        const validItems =
            data.items.filter(
                (item) =>
                    item.description &&
                    item.description.trim() !== ""
            );

        if (validItems.length === 0) {
            toast({
                title: "Validation Error",
                description:
                    "Please enter at least one product description for the invoice.",
                variant: "destructive",
            });

            return;
        }

        // BACKDATE PREVENTION
        if (
            salesSettings?.preventBackdating &&
            !invoiceToEdit
        ) {
            const invoiceDate =
                new Date(data.date);

            const today = new Date();

            today.setHours(
                0,
                0,
                0,
                0
            );

            const diffMs =
                today.getTime() -
                invoiceDate.getTime();

            const diffDays =
                Math.floor(
                    diffMs /
                    (1000 *
                        60 *
                        60 *
                        24)
                );

            if (
                diffDays >
                (
                    salesSettings.backdatingLimitDays ??
                    90
                )
            ) {
                toast({
                    title:
                        "📅 Backdating Not Allowed",
                    description: `Invoice date cannot be more than ${salesSettings.backdatingLimitDays} days in the past. Selected date is ${diffDays} days old.`,
                    variant:
                        "destructive",
                });

                return;
            }
        }

        // NEGATIVE STOCK
        if (
            settings.stopSaleOnNegativeStock &&
            !invoiceToEdit
        ) {
            const violations: string[] = [];

            for (const item of data.items) {
                const product =
                    (
                        products as any[]
                    ).find(
                        (p: any) =>
                            p.name ===
                            item.description
                    );

                if (product) {
                    const qtySold =
                        Number(
                            item.quantity
                        ) || 0;

                    const currentStock =
                        Number(
                            product.stock_quantity
                        ) || 0;

                    if (
                        qtySold >
                        currentStock
                    ) {
                        violations.push(
                            `"${item.description}" — only ${currentStock} ${product.unit || "units"} in stock, you're selling ${qtySold}`
                        );
                    }
                }
            }

            if (
                violations.length > 0
            ) {
                toast({
                    title:
                        "❌ Insufficient Stock",
                    description:
                        violations.join(
                            " • "
                        ),
                    variant:
                        "destructive",
                });

                return;
            }
        }

        // OUTSTANDING BALANCE
        if (!invoiceToEdit) {
            const proceed =
                await checkOutstandingBalance(
                    data.customer_name
                );

            if (!proceed) return;
        }

        createInvoiceMutation.mutate(
            data
        );
    };

    // ============================================================
    // UI
    // ============================================================

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
                                {invoiceToEdit
                                    ? "Edit Invoice"
                                    : "New Invoice"}
                            </DialogTitle>
                        </div>

                        <div className="flex items-center gap-4">
                            {!invoiceToEdit && (
                                <div className="flex items-center space-x-1 border rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsQuickBilling(
                                                true
                                            );

                                            setValue(
                                                "quick_total_amount",
                                                0
                                            );
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
                                        onClick={() =>
                                            setIsQuickBilling(
                                                false
                                            )
                                        }
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
                    onSubmit={handleSubmit(
                        onSubmit
                    )}
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
                            {/* ==================================================
                                AI SMART FILL
                            ================================================== */}

                            {!invoiceToEdit && (
                                <div className="bg-violet-500/5 border border-violet-500/10 p-4 rounded-lg">
                                    <Label className="text-xs font-semibold text-violet-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                                        <Wand2 className="w-3 h-3" />
                                        AI Smart Fill Invoice
                                    </Label>

                                    <SmartSaleInput
                                        onParse={
                                            handleSmartParse
                                        }
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

                            {/* ==================================================
                                CUSTOMER + INVOICE DETAILS
                            ================================================== */}

                            <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-16">
                                {/* Customer / Bill To Section */}
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

                                    {/* Optional addresses collapsible / extra fields */}
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

                                {/* Invoice Details */}
                                <InvoiceDetailsSection
                                    register={register}
                                    watch={watch}
                                    errors={errors}
                                    totalAmount={totalAmount}
                                    formatCurrency={formatCurrency}
                                />
                            </div>

                            {/* ==================================================
                                ITEMS TABLE
                            ================================================== */}

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

                            {/* ==================================================
                                NOTES + TOTALS
                            ================================================== */}

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

                    {/* ==================================================
                        FOOTER
                    ================================================== */}

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