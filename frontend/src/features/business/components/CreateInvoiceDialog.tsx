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
import { CustomerSection } from "./CustomerSection";
import { ProductCombobox, ProductItem } from "./purchase/ProductCombobox";
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

interface CreateInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceToEdit?: any;
    salesSettings?: SalesSettings;
    initialParty?: any;
    onSuccess?: (savedInvoice: any) => void;
}

interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
    discount: number;
    tax_rate?: number;
    total: number;
    hsn_code?: string;
    unit?: string;
}

interface InvoiceFormValues {
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
        const watchStatus = watch("status");
        const paidVal = Number(watch("amount_paid")) || 0;
        if (watchStatus === "paid") return 0;
        if (watchStatus === "pending") return effectiveInvoiceTotal;
        return Math.max(0, effectiveInvoiceTotal - paidVal);
    }, [watch("status"), watch("amount_paid"), effectiveInvoiceTotal]);

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
            notes: values.notes,
            profile: profile,
        };

        setDraftPreviewData(draftInvoice);
        setActiveStep("preview");
    };

    // ============================================================
    // MUTATION
    // ============================================================

    const createInvoiceMutation =
        useMutation({
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
                            const base64Uri = await generateInvoicePDF({
                                invoice_number: data.invoice_number,
                                date: data.date || data.created_at,
                                due_date: data.due_date || undefined,
                                status: data.status,
                                amount_paid: data.amount_paid,
                                balance_due: data.balance_due,
                                payment_method: data.payment_method,
                                previous_balance: data.previous_balance,
                                total_due_balance: data.total_due_balance,
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
                                subtotal: data.subtotal,
                                discount_amount: data.discount_amount || 0,
                                tax_amount: data.tax_amount || 0,
                                total_amount: data.total_amount,
                                notes: data.notes,
                                business_details: profile ? {
                                    name: profile.business_name,
                                    address: profile.business_address,
                                    phone: profile.business_phone,
                                    gst: profile.gst_number,
                                    logo_url: profile.business_logo,
                                    signature_url: profile.signature_url,
                                } : undefined,
                            }, { action: "base64", documentType: "invoice", showPartyPreviousBalance: salesSettings?.showPartyPreviousBalance });

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
                        <div className="flex-1 px-8 py-6 max-w-xl mx-auto w-full space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-5 shadow-sm">
                                {/* Customer Section */}
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

                                {/* Product */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Product / Service Description
                                    </Label>

                                    <ProductCombobox
                                        value={watchQuickItemName || ""}
                                        products={products}
                                        onChange={(val) => {
                                            setValue("quick_item_name", val, {
                                                shouldDirty: true,
                                            });
                                        }}
                                        onSelectProduct={(p) => {
                                            setValue("quick_item_name", p.name, {
                                                shouldDirty: true,
                                            });
                                            if (p.price) {
                                                setValue(
                                                    "quick_total_amount",
                                                    Number(p.price),
                                                    {
                                                        shouldDirty: true,
                                                        shouldValidate: true,
                                                    }
                                                );
                                            }
                                            if (p.tax_rate !== undefined) {
                                                setValue(
                                                    "tax_rate",
                                                    Number(p.tax_rate),
                                                    {
                                                        shouldDirty: true,
                                                    }
                                                );
                                            }
                                        }}
                                        onQuickAddProduct={handleQuickAddProduct}
                                        placeholder="Search or select product/service..."
                                        mode="sale"
                                        className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950"
                                    />
                                </div>

                                {/* Amount / Tax */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Total Amount (₹){" "}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>

                                        <Input
                                            type="number"
                                            min={0.01}
                                            step="any"
                                            className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950 font-semibold"
                                            {...register(
                                                "quick_total_amount",
                                                {
                                                    required:
                                                        "Amount is required",
                                                    valueAsNumber:
                                                        true,
                                                    validate:
                                                        (
                                                            v
                                                        ) =>
                                                            Number(
                                                                v
                                                            ) >
                                                                0 ||
                                                            "Amount must be greater than 0",
                                                }
                                            )}
                                            placeholder="0.00"
                                        />

                                        {errors.quick_total_amount && (
                                            <span className="text-destructive text-xs block">
                                                {
                                                    errors
                                                        .quick_total_amount
                                                        .message
                                                }
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            GST Tax Rate (%)
                                        </Label>

                                        <select
                                            {...register(
                                                "tax_rate"
                                            )}
                                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm font-semibold"
                                        >
                                            <option value="0">
                                                0% (Exempt)
                                            </option>
                                            <option value="5">
                                                5% GST
                                            </option>
                                            <option value="12">
                                                12% GST
                                            </option>
                                            <option value="18">
                                                18% GST
                                            </option>
                                            <option value="28">
                                                28% GST
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                {/* Invoice Number / Date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">
                                            Invoice Number
                                        </Label>

                                        <Input
                                            className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950"
                                            {...register(
                                                "invoice_number",
                                                {
                                                    required:
                                                        "Required",
                                                }
                                            )}
                                        />

                                        {errors.invoice_number && (
                                            <span className="text-destructive text-xs block">
                                                {
                                                    errors
                                                        .invoice_number
                                                        .message
                                                }
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">
                                            Date
                                        </Label>

                                        <Input
                                            type="date"
                                            className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950"
                                            {...register(
                                                "date"
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-slate-950 border-slate-200 mt-2">
                                    <div>
                                        <Label className="text-sm font-semibold">
                                            Payment Status
                                        </Label>

                                        <p className="text-[11px] text-slate-400">
                                            Mark this invoice as immediately paid, partial, or pending.
                                        </p>
                                    </div>

                                    <select
                                        {...register(
                                            "status"
                                        )}
                                        className="h-9 rounded-md border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm font-semibold"
                                    >
                                        <option value="paid">
                                            Paid
                                        </option>
                                        <option value="partial">
                                            Partial
                                        </option>
                                        <option value="pending">
                                            Pending
                                        </option>
                                    </select>
                                </div>

                                {/* Amount Paid (shown only for Partial status) */}
                                {watch("status") === "partial" && (
                                    <div className="space-y-3 p-4 rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-800">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                                Amount Paid Now (₹){" "}
                                                <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="any"
                                                className="h-10 rounded-md border-blue-300 bg-white dark:bg-slate-950 font-semibold"
                                                {...register("amount_paid", {
                                                    valueAsNumber: true,
                                                    min: { value: 0, message: "Cannot be negative" },
                                                })}
                                                placeholder="0.00"
                                            />
                                            {errors.amount_paid && (
                                                <span className="text-destructive text-xs block">
                                                    {errors.amount_paid.message}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-sm pt-1 border-t border-blue-200">
                                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Balance Due</span>
                                            <span className="font-bold text-rose-600">
                                                {formatCurrency(
                                                    Math.max(
                                                        0,
                                                        (Number(watchQuickTotalAmount) || 0) -
                                                        (Number(watch("amount_paid")) || 0)
                                                    )
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* FinFlow CA-Grade Party Previous Due & Net Balance Box */}
                                {salesSettings?.showPartyPreviousBalance && watchCustomerName.trim() && (
                                    <div className="p-3.5 rounded-lg border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-slate-50 dark:from-indigo-950/20 dark:to-slate-900 dark:border-indigo-800/60 shadow-xs space-y-2 mt-3">
                                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/50 pb-1.5">
                                            <span className="flex items-center gap-1.5">
                                                <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                                                Party Balance (Ledger Status)
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-500 lowercase truncate max-w-[140px]">
                                                {selectedParty?.name || watchCustomerName}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-600 dark:text-slate-400">Previous Balance:</span>
                                            <span className={`font-semibold ${partyPreviousBalance > 0 ? "text-rose-600 dark:text-rose-400" : partyPreviousBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700"}`}>
                                                {partyPreviousBalance > 0 
                                                    ? `${formatCurrency(partyPreviousBalance)} Dr (Pending)` 
                                                    : partyPreviousBalance < 0 
                                                        ? `${formatCurrency(Math.abs(partyPreviousBalance))} Cr (Advance)` 
                                                        : formatCurrency(0)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-600 dark:text-slate-400">Current Bill Due:</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {formatCurrency(currentInvoiceDue)}
                                            </span>
                                        </div>

                                        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                                            <div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight block">
                                                    Total Closing Balance:
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    (Previous + Current Bill)
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                                                    partyClosingDue > 0 
                                                        ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800" 
                                                        : partyClosingDue < 0 
                                                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                                }`}>
                                                    {partyClosingDue > 0 
                                                        ? `${formatCurrency(partyClosingDue)} Dr` 
                                                        : partyClosingDue < 0 
                                                            ? `${formatCurrency(Math.abs(partyClosingDue))} Cr` 
                                                            : "₹0.00 (Settled)"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
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
                                <div className="w-full md:w-[280px] space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-100 pb-2">
                                        Invoice Details
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium">
                                                Doc Type
                                            </Label>

                                            <select
                                                {...register(
                                                    "document_type"
                                                )}
                                                className="flex h-9 w-[140px] rounded-sm border border-slate-300 bg-white px-3 py-1 text-sm"
                                            >
                                                <option value="invoice">
                                                    Tax Invoice
                                                </option>
                                                <option value="credit_note">
                                                    Credit Note
                                                </option>
                                                <option value="debit_note">
                                                    Debit Note
                                                </option>
                                            </select>
                                        </div>

                                        {watch(
                                            "document_type"
                                        ) !==
                                            "invoice" && (
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-medium">
                                                    Original Inv UUID
                                                </Label>

                                                <Input
                                                    {...register(
                                                        "original_invoice_id"
                                                    )}
                                                    placeholder="Optional UUID"
                                                    className="h-9 w-[140px] text-xs font-mono"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium">
                                                Is Amendment?
                                            </Label>

                                            <input
                                                type="checkbox"
                                                {...register(
                                                    "is_amendment"
                                                )}
                                                className="w-4 h-4"
                                            />
                                        </div>

                                        {watch(
                                            "is_amendment"
                                        ) && (
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-medium">
                                                    Amended UUID
                                                </Label>

                                                <Input
                                                    {...register(
                                                        "amended_invoice_id"
                                                    )}
                                                    placeholder="Target UUID"
                                                    className="h-9 w-[140px] text-xs font-mono"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium">
                                                {watch(
                                                    "document_type"
                                                ) ===
                                                "invoice"
                                                    ? "Invoice No."
                                                    : "Note No."}
                                            </Label>

                                            <Input
                                                {...register(
                                                    "invoice_number",
                                                    {
                                                        required:
                                                            "Required",
                                                    }
                                                )}
                                                className="h-9 w-[140px] text-right font-medium"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium">
                                                Date
                                            </Label>

                                            <Input
                                                type="date"
                                                {...register(
                                                    "date"
                                                )}
                                                className="h-9 w-[140px]"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium">
                                                Due Date
                                            </Label>

                                            <Input
                                                type="date"
                                                {...register(
                                                    "due_date"
                                                )}
                                                className="h-9 w-[140px]"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium">
                                                Status
                                            </Label>

                                            <select
                                                {...register(
                                                    "status"
                                                )}
                                                className="flex h-9 w-[140px] rounded-sm border border-slate-300 bg-white px-3 py-1 text-sm"
                                            >
                                                <option value="pending">
                                                    Pending
                                                </option>
                                                <option value="partial">
                                                    Partial
                                                </option>
                                                <option value="paid">
                                                    Paid
                                                </option>
                                            </select>
                                        </div>

                                        {/* Amount Paid — shown only for Partial status */}
                                        {watch("status") === "partial" && (
                                            <div className="space-y-2 p-3 rounded-sm border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 mt-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                        Amount Paid (₹)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        className="h-9 w-[140px] text-right font-semibold border-blue-300"
                                                        {...register("amount_paid", {
                                                            valueAsNumber: true,
                                                            min: { value: 0, message: "Cannot be negative" },
                                                        })}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                {errors.amount_paid && (
                                                    <p className="text-destructive text-[10px] text-right">
                                                        {errors.amount_paid.message}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between pt-1 border-t border-blue-200">
                                                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Balance Due</span>
                                                    <span className="text-xs font-bold text-rose-600">
                                                        {formatCurrency(
                                                            Math.max(
                                                                0,
                                                                totalAmount -
                                                                (Number(watch("amount_paid")) || 0)
                                                            )
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {watch(
                                            "customer_gstin"
                                        )?.length ===
                                            15 && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium">
                                                        IRN
                                                    </Label>

                                                    <Input
                                                        className="h-9"
                                                        {...register(
                                                            "irn"
                                                        )}
                                                        placeholder="64-char hash"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium">
                                                        E-Way Bill No
                                                    </Label>

                                                    <Input
                                                        className="h-9"
                                                        {...register(
                                                            "eway_bill_number"
                                                        )}
                                                        placeholder="e.g. 123456789"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ==================================================
                                ITEMS TABLE
                            ================================================== */}

                            <div className="space-y-2">
                                {errors.items &&
                                    !Array.isArray(
                                        errors.items
                                    ) && (
                                        <p className="text-destructive text-sm mb-2">
                                            {
                                                (
                                                    errors.items as any
                                                ).message
                                            }
                                        </p>
                                    )}

                                <div className="border border-slate-200 rounded-lg">
                                    {/* Header */}
                                    <div
                                        className={`hidden sm:grid ${
                                            salesSettings?.enableHsnCode &&
                                            (salesSettings?.enableItemWiseTax || salesSettings?.showItemTaxRateOnBill)
                                                ? "grid-cols-[1fr_90px_80px_90px_80px_80px_100px_40px]"
                                                : salesSettings?.enableHsnCode
                                                    ? "grid-cols-[1fr_100px_100px_100px_100px_120px_40px]"
                                                    : (salesSettings?.enableItemWiseTax || salesSettings?.showItemTaxRateOnBill)
                                                        ? "grid-cols-[1fr_80px_100px_80px_80px_100px_40px]"
                                                        : "grid-cols-[1fr_100px_120px_100px_120px_40px]"
                                        } gap-0 border-b border-slate-200 bg-slate-100/50 text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-t-lg`}
                                    >
                                        <div className="py-2.5 px-3">
                                             Item Description
                                        </div>

                                        {salesSettings?.enableHsnCode && (
                                            <div className="py-2.5 px-3 border-l border-slate-200">
                                                HSN
                                            </div>
                                        )}

                                        <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                                            Qty
                                        </div>

                                        <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                                            Rate
                                        </div>

                                        <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                                            Disc %
                                        </div>

                                        {(salesSettings?.enableItemWiseTax || salesSettings?.showItemTaxRateOnBill) && (
                                            <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                                                Tax %
                                            </div>
                                        )}

                                        <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                                            Amount
                                        </div>

                                        <div className="py-2.5 px-0 border-l border-slate-200" />
                                    </div>

                                    {/* ==================================================
                                        TABLE BODY
                                    ================================================== */}

                                    <div className="divide-y divide-slate-100">
                                        {fields.map(
                                            (
                                                field,
                                                index
                                            ) => {
                                                const qty =
                                                    watch(
                                                        `items.${index}.quantity`
                                                    ) || 0;

                                                const price =
                                                    watch(
                                                        `items.${index}.price`
                                                    ) || 0;

                                                const disc =
                                                    watch(
                                                        `items.${index}.discount`
                                                    ) || 0;

                                                const lineTotal =
                                                    qty *
                                                    price *
                                                    (1 -
                                                        disc /
                                                        100);

                                                const hsnEnabled =
                                                    !!salesSettings?.enableHsnCode;

                                                const itemTaxEnabled =
                                                    !!(salesSettings?.enableItemWiseTax || salesSettings?.showItemTaxRateOnBill);

                                                return (
                                                    <div
                                                        key={
                                                            field.id
                                                        }
                                                        style={{ zIndex: fields.length - index + 20 }}
                                                        className={`relative grid grid-cols-1 ${
                                                            hsnEnabled &&
                                                            itemTaxEnabled
                                                                ? "sm:grid-cols-[1fr_90px_80px_90px_80px_80px_100px_40px]"
                                                                : hsnEnabled
                                                                    ? "sm:grid-cols-[1fr_100px_100px_100px_100px_120px_40px]"
                                                                    : itemTaxEnabled
                                                                        ? "sm:grid-cols-[1fr_80px_100px_80px_80px_100px_40px]"
                                                                        : "sm:grid-cols-[1fr_100px_120px_100px_120px_40px]"
                                                        } gap-1 sm:gap-0 p-3 sm:p-0 items-start sm:items-stretch bg-white`}
                                                    >
                                                        {/* DESCRIPTION */}
                                                        <div className="sm:p-0 relative">
                                                            <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                                                Item Description
                                                            </div>

                                                            <ProductCombobox
                                                                value={watch(`items.${index}.description`) ?? watchItems?.[index]?.description ?? ""}
                                                                products={products}
                                                                onChange={(val) => {
                                                                    setValue(
                                                                        `items.${index}.description`,
                                                                        val,
                                                                        {
                                                                            shouldValidate: true,
                                                                            shouldDirty: true,
                                                                        }
                                                                    );
                                                                }}
                                                                onSelectProduct={(p) =>
                                                                    handleProductSelect(
                                                                        index,
                                                                        p
                                                                    )
                                                                }
                                                                onQuickAddProduct={
                                                                    handleQuickAddProduct
                                                                }
                                                                inputRef={(el) => {
                                                                    descriptionRefs.current[
                                                                        index
                                                                    ] = el;
                                                                }}
                                                                onKeyDown={(e) =>
                                                                    handleItemKeyDown(
                                                                        e,
                                                                        index
                                                                    )
                                                                }
                                                                placeholder="Type or select product..."
                                                                mode="sale"
                                                                className={`h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 bg-transparent ${
                                                                    errors
                                                                        .items?.[
                                                                        index
                                                                    ]
                                                                        ?.description
                                                                        ? "border-destructive sm:border-destructive"
                                                                        : ""
                                                                }`}
                                                            />
                                                        </div>

                                                        {/* HSN */}
                                                        {hsnEnabled && (
                                                            <div className="sm:p-0">
                                                                <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                                                    HSN
                                                                </div>

                                                                <Input
                                                                    className="h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 bg-transparent"
                                                                    {...register(
                                                                        `items.${index}.hsn_code` as const
                                                                    )}
                                                                    placeholder="HSN"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* QUANTITY */}
                                                        <div className="sm:p-0 flex items-center border-slate-200 sm:border-r bg-transparent">
                                                            <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                                                Quantity
                                                            </div>

                                                            <Input
                                                                type="number"
                                                                className="h-9 sm:h-auto border-0 flex-1 px-2 text-right bg-transparent focus-visible:ring-0"
                                                                {...register(
                                                                    `items.${index}.quantity` as const,
                                                                    {
                                                                        valueAsNumber:
                                                                            true,
                                                                        min: 1,
                                                                    }
                                                                )}
                                                                min="1"
                                                                onKeyDown={(
                                                                    e
                                                                ) =>
                                                                    handleItemKeyDown(
                                                                        e,
                                                                        index
                                                                    )
                                                                }
                                                            />

                                                            <Input
                                                                type="text"
                                                                className="h-9 sm:h-auto border-0 w-12 px-1 text-center bg-transparent text-slate-500 text-xs border-l border-slate-100"
                                                                {...register(
                                                                    `items.${index}.unit` as const
                                                                )}
                                                                placeholder="Unit"
                                                            />
                                                        </div>

                                                        {/* RATE */}
                                                        <div className="sm:p-0">
                                                            <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                                                Rate
                                                            </div>

                                                            <Input
                                                                type="number"
                                                                className={`h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 text-right bg-transparent ${
                                                                    errors
                                                                        .items?.[
                                                                        index
                                                                    ]
                                                                        ?.price
                                                                        ? "border-destructive"
                                                                        : ""
                                                                }`}
                                                                {...register(
                                                                    `items.${index}.price` as const,
                                                                    {
                                                                        required:
                                                                            true,
                                                                        valueAsNumber:
                                                                            true,
                                                                        min: 0,
                                                                    }
                                                                )}
                                                                min="0"
                                                                step="0.01"
                                                                onKeyDown={(
                                                                    e
                                                                ) =>
                                                                    handleItemKeyDown(
                                                                        e,
                                                                        index
                                                                    )
                                                                }
                                                            />
                                                        </div>

                                                        {/* DISCOUNT */}
                                                        <div className="sm:p-0 relative">
                                                            <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                                                Discount %
                                                            </div>

                                                            <Input
                                                                type="number"
                                                                className="h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 text-right pr-6 bg-transparent"
                                                                {...register(
                                                                    `items.${index}.discount` as const
                                                                )}
                                                                min="0"
                                                                max="100"
                                                                onKeyDown={(
                                                                    e
                                                                ) =>
                                                                    handleItemKeyDown(
                                                                        e,
                                                                        index
                                                                    )
                                                                }
                                                            />

                                                            <Percent className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none hidden sm:block" />
                                                        </div>

                                                        {/* ITEM TAX */}
                                                        {itemTaxEnabled && (
                                                            <div className="sm:p-0 relative">
                                                                <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                                                    Tax %
                                                                </div>

                                                                <Input
                                                                    type="number"
                                                                    className="h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 text-right pr-6 bg-transparent"
                                                                    {...register(
                                                                        `items.${index}.tax_rate` as const,
                                                                        {
                                                                            valueAsNumber:
                                                                                true,
                                                                            min: 0,
                                                                            max: 100,
                                                                        }
                                                                    )}
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.1"
                                                                />

                                                                <Percent className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none hidden sm:block" />
                                                            </div>
                                                        )}

                                                        {/* AMOUNT */}
                                                        <div className="flex items-center justify-end px-3 sm:border-r border-slate-200 font-medium text-slate-800 text-sm h-9 sm:h-auto bg-slate-50/50">
                                                            {
                                                                formatCurrency(
                                                                    lineTotal
                                                                )
                                                            }
                                                        </div>

                                                        {/* DELETE */}
                                                        <div className="flex items-center justify-center p-1 sm:p-0">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-sm"
                                                                onClick={() =>
                                                                    remove(
                                                                        index
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addEmptyItemRow}
                                        className="text-xs flex items-center gap-1.5 border-dashed border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 bg-white shadow-none h-8"
                                    >
                                        <Plus className="w-3.5 h-3.5 text-primary" />
                                        Add Line Item
                                    </Button>
                                    <span className="text-[11px] text-slate-400">
                                        Press <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono">Enter</kbd> to add next row or jump fields
                                    </span>
                                </div>
                            </div>

                            {/* ==================================================
                                NOTES + TOTALS
                            ================================================== */}

                            <div className="flex flex-col md:flex-row justify-between gap-8 pt-4 pb-8 border-t border-slate-100">
                                <div className="flex-1 max-w-sm space-y-1.5">
                                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-primary" />
                                        Seller Notes & Terms
                                    </Label>

                                    <textarea
                                        {...register(
                                            "notes"
                                        )}
                                        placeholder="Add payment terms, bank details, or thank-you note for customer..."
                                        rows={3}
                                        className="w-full text-xs p-2.5 rounded-sm border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 resize-none"
                                    />

                                    <p className="text-[10px] text-slate-400">
                                        These notes will be printed on the invoice PDF.
                                    </p>
                                </div>

                                <div className="w-full md:w-[320px]">
                                    <div className="space-y-2.5">
                                        {/* SUBTOTAL */}
                                        <div className="flex justify-between items-center text-sm px-2">
                                            <span className="text-slate-600">
                                                Subtotal
                                            </span>

                                            <span className="font-medium text-slate-800">
                                                {formatCurrency(
                                                    subtotal
                                                )}
                                            </span>
                                        </div>

                                        {/* DISCOUNT */}
                                        <div className="flex justify-between items-center text-sm px-2">
                                            <span className="text-slate-600">
                                                Discount
                                            </span>

                                            <div className="relative w-24">
                                                <Input
                                                    type="number"
                                                    className="h-8 rounded-sm text-right pr-6 border-slate-300"
                                                    {...register(
                                                        "overall_discount"
                                                    )}
                                                    min="0"
                                                    max="100"
                                                />

                                                <Percent className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                        </div>

                                        {overallDiscountAmount >
                                            0 && (
                                            <div className="flex justify-between text-xs px-2 pb-2 border-b">
                                                <span />
                                                <span className="text-destructive font-medium">
                                                    -
                                                    {formatCurrency(
                                                        overallDiscountAmount
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        {/* TAX */}
                                        <div className="flex justify-between items-center text-sm px-2 pt-1 border-b border-slate-100 pb-3">
                                            <span className="text-slate-600">
                                                {isItemWiseTax
                                                    ? "Item-wise Tax"
                                                    : salesSettings?.gstMode ===
                                                        "igst"
                                                        ? "IGST"
                                                        : salesSettings?.gstMode ===
                                                            "cgst_sgst"
                                                            ? "Tax (CGST+SGST)"
                                                            : "Tax"}
                                            </span>

                                            {isItemWiseTax ? (
                                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                    {taxAmount >
                                                        0
                                                        ? `Avg ~${taxRate.toFixed(
                                                            1
                                                        )}%`
                                                        : "0%"}
                                                </span>
                                            ) : (
                                                <div className="relative w-24">
                                                    <Input
                                                        type="number"
                                                        className="h-8 rounded-sm text-right pr-6 border-slate-300"
                                                        {...register(
                                                            "tax_rate"
                                                        )}
                                                        min="0"
                                                        max="100"
                                                    />

                                                    <Percent className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                                </div>
                                            )}
                                        </div>

                                        {taxAmount >
                                            0 && (
                                            <div className="flex justify-between items-center text-xs px-2 pb-2 border-b">
                                                <span className="text-slate-400 text-[10px]">
                                                    {salesSettings?.gstMode ===
                                                        "cgst_sgst"
                                                        ? `CGST ${formatCurrency(
                                                            taxAmount /
                                                            2
                                                        )} + SGST ${formatCurrency(
                                                            taxAmount /
                                                            2
                                                        )}`
                                                        : salesSettings?.gstMode ===
                                                            "igst"
                                                            ? `IGST @ ${taxRate}%`
                                                            : ""}
                                                </span>

                                                <span className="text-emerald-600 font-medium">
                                                    +
                                                    {formatCurrency(
                                                        taxAmount
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        {/* ROUND OFF */}
                                        {salesSettings?.roundOffTotal &&
                                            Math.abs(
                                                roundOffDiff
                                            ) >
                                            0.001 && (
                                                <div className="flex justify-between items-center text-xs px-2 pb-2">
                                                    <span className="text-slate-500">
                                                        Round Off
                                                    </span>

                                                    <span
                                                        className={
                                                            roundOffDiff >
                                                                0
                                                                ? "text-emerald-600 font-medium"
                                                                : "text-rose-500 font-medium"
                                                        }
                                                    >
                                                        {roundOffDiff >
                                                            0
                                                            ? "+"
                                                            : ""}
                                                        {formatCurrency(
                                                            roundOffDiff
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                    </div>

                                    {/* TOTAL */}
                                    <div className="pt-4 border-t mt-4 bg-slate-100 p-4 rounded-b-sm border-x border-b border-slate-200">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                                                Total Amount
                                            </span>

                                            <span className="text-xl font-bold text-slate-900 tracking-tight">
                                                {formatCurrency(
                                                    totalAmount
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* FinFlow CA-Grade Party Previous Due & Net Balance Box */}
                                    {salesSettings?.showPartyPreviousBalance && watchCustomerName.trim() && (
                                        <div className="mt-3 p-3.5 rounded-lg border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-slate-50 dark:from-indigo-950/20 dark:to-slate-900 dark:border-indigo-800/60 shadow-xs space-y-2">
                                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/50 pb-1.5">
                                                <span className="flex items-center gap-1.5">
                                                    <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                                                    Party Balance (Ledger Status)
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-500 lowercase truncate max-w-[140px]">
                                                    {selectedParty?.name || watchCustomerName}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-600 dark:text-slate-400">Previous Balance:</span>
                                                <span className={`font-semibold ${partyPreviousBalance > 0 ? "text-rose-600 dark:text-rose-400" : partyPreviousBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700"}`}>
                                                    {partyPreviousBalance > 0 
                                                        ? `${formatCurrency(partyPreviousBalance)} Dr (Pending)` 
                                                        : partyPreviousBalance < 0 
                                                            ? `${formatCurrency(Math.abs(partyPreviousBalance))} Cr (Advance)` 
                                                            : formatCurrency(0)}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-600 dark:text-slate-400">Current Bill Due:</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {formatCurrency(currentInvoiceDue)}
                                                </span>
                                            </div>

                                            <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight block">
                                                        Total Closing Balance:
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        (Previous + Current Bill)
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                                                        partyClosingDue > 0 
                                                            ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800" 
                                                            : partyClosingDue < 0 
                                                                ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                                                                : "bg-slate-100 text-slate-700 border border-slate-200"
                                                    }`}>
                                                        {partyClosingDue > 0 
                                                            ? `${formatCurrency(partyClosingDue)} Dr` 
                                                            : partyClosingDue < 0 
                                                                ? `${formatCurrency(Math.abs(partyClosingDue))} Cr` 
                                                                : "₹0.00 (Settled)"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================================================
                        FOOTER
                    ================================================== */}

                    <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 sticky bottom-0 z-20 mt-auto rounded-b-md flex-wrap">
                        {/* Auto-WhatsApp on Save Toggle */}
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition-colors bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                            <input
                                type="checkbox"
                                checked={sendWhatsApp}
                                onChange={(e) => setSendWhatsApp(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600"
                            />
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                            <span>Send WhatsApp on Save</span>
                        </label>

                        <div className="flex items-center gap-2.5 ml-auto">
                            <Button
                                type="button"
                                variant="outline"
                                className="min-w-[90px] border-slate-300 bg-white"
                                onClick={() =>
                                    onOpenChange(
                                        false
                                    )
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                                onClick={handlePreviewDraft}
                            >
                                <Eye className="w-4 h-4 mr-1.5 text-slate-500" />
                                Preview
                            </Button>

                            <Button
                                type="submit"
                                className="min-w-[130px] bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
                                disabled={
                                    createInvoiceMutation.isPending
                                }
                            >
                                {createInvoiceMutation.isPending && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}

                                {invoiceToEdit
                                    ? "Update Invoice"
                                    : "Save Invoice"}
                            </Button>
                        </div>
                    </div>
                </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};