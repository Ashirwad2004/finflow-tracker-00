import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { SmartSaleInput } from "./SmartSaleInput";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useItemSettings } from "@/core/hooks/use-item-settings";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { offlineMutate } from "@/core/offline/apiService";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/core/lib/auth";

interface CreateInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceToEdit?: any;
    salesSettings?: SalesSettings;
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
    status: "paid" | "pending";
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
}: CreateInvoiceDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const { user: authUser } = useAuth();
    const currentUserId = authUser?.id;

    const { settings } = useItemSettings(currentUserId);

    const [isQuickBilling, setIsQuickBilling] = useState(
        salesSettings?.enableQuickBilling ?? false
    );

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
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
            quick_item_name: "General Sale",
            quick_total_amount: 0,
        },
        mode: "onBlur",
    });

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
        queryKey: ["invoice-parties"],
        queryFn: async () => {
            const user = authUser;

            if (!user) return [];

            try {
                const { data } = await supabase
                    .from("parties" as any)
                    .select("*")
                    .eq("user_id", user.id)
                    .in("type", ["customer", "both"]);

                if (data) return data;
            } catch {
                // Fall back to React Query cache.
            }

            const cachedParties =
                (queryClient.getQueryData([
                    "parties",
                    user.id,
                ]) as any[]) || [];

            return cachedParties.filter((p: any) =>
                ["customer", "both"].includes(p.type)
            );
        },
        enabled: open,
    });

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
                customer_name: "",
                customer_phone: "",
                customer_email: "",
                customer_gstin: "",
                place_of_supply: "",
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
    // FETCH PRODUCTS
    // ============================================================

    const { data: products = [] } = useQuery({
        queryKey: [
            "products-invoice-picker",
            currentUserId,
        ],
        queryFn: async () => {
            if (!currentUserId) return [];

            try {
                const { data } = await supabase
                    .from("products" as any)
                    .select("*")
                    .eq("user_id", currentUserId);

                if (data) return data || [];
            } catch {
                // Fall back to cache.
            }

            return (
                (queryClient.getQueryData([
                    "products",
                    currentUserId,
                ]) as any[]) || []
            );
        },
        enabled: open && !!currentUserId,
    });

    // ============================================================
    // PRODUCT SELECTION
    // ============================================================

    const handleProductSelect = (
        index: number,
        productName: string
    ) => {
        const product = (products as any[]).find(
            (p: any) => p.name === productName
        );

        // IMPORTANT:
        // Do nothing when typed value doesn't exactly match
        // an existing product.
        //
        // This prevents typing the first letter from changing
        // or creating rows.
        if (!product) return;

        setValue(
            `items.${index}.price`,
            Number(product.price) || 0,
            {
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

        if (
            product.tax_rate !== undefined ||
            product.tax !== undefined
        ) {
            setValue(
                `items.${index}.tax_rate`,
                Number(
                    product.tax_rate ??
                    product.tax ??
                    salesSettings?.defaultTaxRate ??
                    0
                ),
                {
                    shouldDirty: true,
                }
            );
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
                    ["pending", "overdue"].includes(
                        s.status
                    )
            );
        }

        if (outstanding.length > 0) {
            const total = outstanding.reduce(
                (sum: number, inv: any) =>
                    sum +
                    Number(inv.total_amount || 0),
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
        !!salesSettings?.enableItemWiseTax;

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

                const saleData = {
                    user_id: user.id,
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
                    place_of_supply:
                        values.place_of_supply ||
                        (
                            values.customer_gstin
                                ? values.customer_gstin
                                    .trim()
                                    .substring(
                                        0,
                                        2
                                    )
                                : null
                        ),
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
                    status: values.status,
                    payment_method:
                        values.status === "paid"
                            ? "cash"
                            : null,
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
                // AUTO ADD CUSTOMER
                // ------------------------------------------------

                try {
                    const autoAddParties =
                        localStorage.getItem(
                            "rupeebill_auto_add_parties"
                        ) === "true";

                    if (
                        autoAddParties &&
                        values.customer_name?.trim()
                    ) {
                        const partyExists =
                            parties.some(
                                (p: any) =>
                                    p.name
                                        .toLowerCase() ===
                                    values.customer_name
                                        .trim()
                                        .toLowerCase()
                            );

                        if (!partyExists) {
                            const newPartyId =
                                uuidv4();

                            const partyPayload = {
                                id: newPartyId,
                                user_id: user.id,
                                name: values.customer_name.trim(),
                                phone:
                                    values.customer_phone?.trim() ||
                                    null,
                                email:
                                    values.customer_email?.trim() ||
                                    null,
                                address: null,
                                gst_number:
                                    values.customer_gstin?.trim() ||
                                    null,
                                type: "customer",
                                created_at:
                                    new Date().toISOString(),
                            };

                            await offlineMutate({
                                table: "parties",
                                action: "insert",
                                recordId:
                                    newPartyId,
                                payload:
                                    partyPayload,
                                userId: user.id,
                            });

                            queryClient.setQueryData(
                                [
                                    "parties",
                                    user.id,
                                ],
                                (old: any) => {
                                    const prev =
                                        old || [];

                                    return [
                                        ...prev,
                                        partyPayload,
                                    ];
                                }
                            );

                            queryClient.setQueryData(
                                ["invoice-parties"],
                                (old: any) => {
                                    const prev =
                                        old || [];

                                    return [
                                        ...prev,
                                        partyPayload,
                                    ];
                                }
                            );
                        }
                    }
                } catch (partyErr) {
                    console.error(
                        "Error auto-adding party:",
                        partyErr
                    );
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
                        for (const item of values.items) {
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

                                const updatedStock =
                                    currentStock -
                                    qtySold;

                                await offlineMutate(
                                    {
                                        table: "products",
                                        action: "update",
                                        recordId:
                                            product.id,
                                        payload: {
                                            ...product,
                                            stock_quantity:
                                                updatedStock,
                                        },
                                        userId:
                                            user.id,
                                    }
                                );

                                queryClient.setQueryData(
                                    [
                                        "products",
                                        user.id,
                                    ],
                                    (
                                        old:
                                            | any[]
                                            | undefined
                                    ) => {
                                        if (!old)
                                            return [];

                                        return old.map(
                                            (
                                                p: any
                                            ) =>
                                                p.id ===
                                                    product.id
                                                    ? {
                                                        ...p,
                                                        stock_quantity:
                                                            updatedStock,
                                                    }
                                                    : p
                                        );
                                    }
                                );
                            }
                        }
                    }
                }

                return {
                    ...values,
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
                            queryKey: [
                                "last-invoice-number",
                            ],
                        }
                    );
                }

                toast({
                    title: invoiceToEdit
                        ? "✅ Invoice Updated"
                        : "✅ Invoice Created",
                    description: `Invoice ${data.invoice_number} saved successfully.`,
                });

                onOpenChange(false);
                reset();
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
            onOpenChange={
                onOpenChange
            }
        >
            <DialogContent className="sm:max-w-[1100px] max-h-[90vh] p-0 flex flex-col bg-background border-slate-200 shadow-xl overflow-hidden rounded-md">
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
                                    watch(
                                        "status"
                                    ) ===
                                    "paid"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-orange-50 text-orange-700 border-orange-200"
                                }`}
                            >
                                {watch(
                                    "status"
                                ) ===
                                "paid"
                                    ? "PAID"
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
                                {/* Customer */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Customer Name{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>

                                    <Input
                                        className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950"
                                        {...register(
                                            "customer_name",
                                            {
                                                required:
                                                    "Customer name is required",
                                            }
                                        )}
                                        placeholder="Select or enter customer"
                                        list="quick-customer-list"
                                        onChange={(
                                            e
                                        ) => {
                                            setValue(
                                                "customer_name",
                                                e.target
                                                    .value,
                                                {
                                                    shouldValidate:
                                                        true,
                                                    shouldDirty:
                                                        true,
                                                }
                                            );

                                            handleCustomerSelect(
                                                e
                                                    .target
                                                    .value
                                            );
                                        }}
                                    />

                                    <datalist id="quick-customer-list">
                                        {parties.map(
                                            (
                                                party: any
                                            ) => (
                                                <option
                                                    key={
                                                        party.id
                                                    }
                                                    value={
                                                        party.name
                                                    }
                                                />
                                            )
                                        )}
                                    </datalist>

                                    {errors.customer_name && (
                                        <span className="text-destructive text-xs block">
                                            {
                                                errors
                                                    .customer_name
                                                    .message
                                            }
                                        </span>
                                    )}
                                </div>

                                {/* Product */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Product / Service Description
                                    </Label>

                                    <Input
                                        className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950"
                                        {...register(
                                            "quick_item_name"
                                        )}
                                        placeholder="e.g. General Sale, Service Charge"
                                        list="quick-product-list"
                                        onChange={(
                                            e
                                        ) => {
                                            setValue(
                                                "quick_item_name",
                                                e.target
                                                    .value,
                                                {
                                                    shouldDirty:
                                                        true,
                                                }
                                            );

                                            handleQuickProductSelect(
                                                e
                                                    .target
                                                    .value
                                            );
                                        }}
                                    />

                                    <datalist id="quick-product-list">
                                        {products.map(
                                            (
                                                p: any
                                            ) => (
                                                <option
                                                    key={
                                                        p.id
                                                    }
                                                    value={
                                                        p.name
                                                    }
                                                />
                                            )
                                        )}
                                    </datalist>
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
                                            Mark this invoice as immediately paid or pending.
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
                                        <option value="pending">
                                            Pending
                                        </option>
                                    </select>
                                </div>
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
                                        products={
                                            products
                                        }
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
                                <div className="flex-1 max-w-md space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-100 pb-2">
                                        Bill To
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">
                                                Customer Name{" "}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>

                                            <Input
                                                className="h-9 rounded-sm border-slate-300 bg-white"
                                                {...register(
                                                    "customer_name",
                                                    {
                                                        required:
                                                            "Customer name is required",
                                                    }
                                                )}
                                                placeholder="Select or enter customer"
                                                list="customer-list"
                                                onChange={(
                                                    e
                                                ) => {
                                                    setValue(
                                                        "customer_name",
                                                        e.target
                                                            .value,
                                                        {
                                                            shouldValidate:
                                                                true,
                                                            shouldDirty:
                                                                true,
                                                        }
                                                    );

                                                    handleCustomerSelect(
                                                        e
                                                            .target
                                                            .value
                                                    );
                                                }}
                                            />

                                            <datalist id="customer-list">
                                                {parties.map(
                                                    (
                                                        party: any
                                                    ) => (
                                                        <option
                                                            key={
                                                                party.id
                                                            }
                                                            value={
                                                                party.name
                                                            }
                                                        />
                                                    )
                                                )}
                                            </datalist>

                                            {errors.customer_name && (
                                                <span className="text-destructive text-xs block">
                                                    {
                                                        errors
                                                            .customer_name
                                                            .message
                                                    }
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">
                                                    Phone
                                                </Label>

                                                <Input
                                                    className="h-9 rounded-sm border-slate-300 bg-white"
                                                    {...register(
                                                        "customer_phone"
                                                    )}
                                                    placeholder="Phone number"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">
                                                    Email
                                                </Label>

                                                <Input
                                                    className="h-9 rounded-sm border-slate-300 bg-white"
                                                    {...register(
                                                        "customer_email"
                                                    )}
                                                    placeholder="Email address"
                                                />
                                            </div>
                                        </div>

                                        {/* GSTIN */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-medium">
                                                    Customer GSTIN
                                                </Label>

                                                {watch(
                                                    "customer_gstin"
                                                )?.length ===
                                                    15 ? (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                                        ✓ B2B Invoice
                                                    </span>
                                                ) : watch(
                                                    "customer_gstin"
                                                )?.length >
                                                    0 ? (
                                                    <span className="text-[10px] text-amber-600">
                                                        {
                                                            watch(
                                                                "customer_gstin"
                                                            )
                                                                .length
                                                        }
                                                        /15 chars
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">
                                                        B2C — leave blank if unregistered
                                                    </span>
                                                )}
                                            </div>

                                            <Input
                                                className="h-9 rounded-sm border-slate-300 bg-white font-mono uppercase tracking-widest text-sm"
                                                {...register(
                                                    "customer_gstin",
                                                    {
                                                        validate:
                                                            (
                                                                v
                                                            ) =>
                                                                !v ||
                                                                v.length ===
                                                                0 ||
                                                                /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
                                                                    v
                                                                ) ||
                                                                "Invalid GSTIN format or checksum",
                                                    }
                                                )}
                                                placeholder="e.g. 29AABCD1234E1Z5"
                                                maxLength={
                                                    15
                                                }
                                                onChange={(
                                                    e
                                                ) => {
                                                    setValue(
                                                        "customer_gstin",
                                                        e.target
                                                            .value
                                                            .toUpperCase(),
                                                        {
                                                            shouldValidate:
                                                                true,
                                                            shouldDirty:
                                                                true,
                                                        }
                                                    );
                                                }}
                                            />

                                            {errors.customer_gstin && (
                                                <span className="text-destructive text-xs block">
                                                    {
                                                        errors
                                                            .customer_gstin
                                                            .message
                                                    }
                                                </span>
                                            )}
                                        </div>

                                        {/* POS / RCM */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">
                                                    Place of Supply (POS)
                                                </Label>

                                                <select
                                                    {...register(
                                                        "place_of_supply"
                                                    )}
                                                    className="flex h-9 w-full rounded-sm border border-slate-300 bg-white px-3 py-1 text-sm"
                                                >
                                                    <option value="">
                                                        Default (Auto)
                                                    </option>
                                                    <option value="27">
                                                        27 - Maharashtra
                                                    </option>
                                                    <option value="29">
                                                        29 - Karnataka
                                                    </option>
                                                    <option value="07">
                                                        07 - Delhi
                                                    </option>
                                                    <option value="09">
                                                        09 - Uttar Pradesh
                                                    </option>
                                                    <option value="33">
                                                        33 - Tamil Nadu
                                                    </option>
                                                    <option value="24">
                                                        24 - Gujarat
                                                    </option>
                                                    <option value="08">
                                                        08 - Rajasthan
                                                    </option>
                                                    <option value="19">
                                                        19 - West Bengal
                                                    </option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5 flex flex-col justify-end">
                                                <label className="flex items-center space-x-2 h-9 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        {...register(
                                                            "is_reverse_charge"
                                                        )}
                                                        className="w-4 h-4 rounded border-slate-300"
                                                    />

                                                    <span className="text-xs font-medium">
                                                        Reverse Charge (RCM)
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
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
                                                <option value="paid">
                                                    Paid
                                                </option>
                                            </select>
                                        </div>

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

                                <div className="border border-slate-200 rounded-sm bg-white overflow-hidden">
                                    {/* Header */}
                                    <div
                                        className={`hidden sm:grid ${
                                            salesSettings?.enableHsnCode &&
                                            salesSettings?.enableItemWiseTax
                                                ? "grid-cols-[1fr_90px_80px_90px_80px_80px_100px_40px]"
                                                : salesSettings?.enableHsnCode
                                                    ? "grid-cols-[1fr_100px_100px_100px_100px_120px_40px]"
                                                    : salesSettings?.enableItemWiseTax
                                                        ? "grid-cols-[1fr_80px_100px_80px_80px_100px_40px]"
                                                        : "grid-cols-[1fr_100px_120px_100px_120px_40px]"
                                        } gap-0 border-b border-slate-200 bg-slate-100/50 text-xs font-semibold text-slate-600 uppercase tracking-wider`}
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

                                        {salesSettings?.enableItemWiseTax && (
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
                                                    !!salesSettings?.enableItemWiseTax;

                                                // IMPORTANT:
                                                // Destructure RHF's ref so we can
                                                // combine it with our own ref.
                                                const {
                                                    ref: descRhfRef,
                                                    ...descRegister
                                                } =
                                                    register(
                                                        `items.${index}.description` as const
                                                    );

                                                return (
                                                    <div
                                                        key={
                                                            field.id
                                                        }
                                                        className={`grid grid-cols-1 ${
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
                                                        <div className="sm:p-0">
                                                            <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                                                Item Description
                                                            </div>

                                                            <Input
                                                                className={`h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 bg-transparent focus-visible:ring-1 focus-visible:ring-inset ${
                                                                    errors
                                                                        .items?.[
                                                                        index
                                                                    ]
                                                                        ?.description
                                                                        ? "border-destructive sm:border-destructive"
                                                                        : ""
                                                                }`}
                                                                {...descRegister}
                                                                ref={(
                                                                    el
                                                                ) => {
                                                                    descRhfRef(
                                                                        el
                                                                    );

                                                                    descriptionRefs.current[
                                                                        index
                                                                    ] =
                                                                        el;
                                                                }}
                                                                placeholder="Enter item Name"
                                                                list={`products-list-${index}`}
                                                                onChange={(
                                                                    e
                                                                ) => {
                                                                    descRegister.onChange(
                                                                        e
                                                                    );

                                                                    handleProductSelect(
                                                                        index,
                                                                        e
                                                                            .target
                                                                            .value
                                                                    );
                                                                }}
                                                                onKeyDown={(
                                                                    e
                                                                ) =>
                                                                    handleItemKeyDown(
                                                                        e,
                                                                        index
                                                                    )
                                                                }
                                                            />

                                                            <datalist
                                                                id={`products-list-${index}`}
                                                            >
                                                                {(
                                                                    products as any[]
                                                                ).map(
                                                                    (
                                                                        p: any
                                                                    ) => (
                                                                        <option
                                                                            key={
                                                                                p.id
                                                                            }
                                                                            value={
                                                                                p.name
                                                                            }
                                                                            label={
                                                                                settings.showStockInItemPicker
                                                                                    ? `Stock: ${p.stock_quantity} ${p.unit || ""}`.trim()
                                                                                    : undefined
                                                                            }
                                                                        />
                                                                    )
                                                                )}
                                                            </datalist>
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
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================================================
                        FOOTER
                    ================================================== */}

                    <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-20 mt-auto rounded-b-md">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-w-[100px] border-slate-300 bg-white"
                            onClick={() =>
                                onOpenChange(
                                    false
                                )
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            className="min-w-[140px] bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
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
                </form>
            </DialogContent>
        </Dialog>
    );
};