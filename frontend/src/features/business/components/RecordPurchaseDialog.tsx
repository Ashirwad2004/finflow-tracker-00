import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Wand2, CheckCircle2, FileText } from "lucide-react";
import { SmartPurchaseInput } from "./SmartPurchaseInput";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { offlineMutate } from "@/core/offline/apiService";
import { getOverdueDaysThreshold } from "@/core/utils/overdue";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/core/lib/auth";

// Modular Subcomponents
import { PurchaseHeader } from "./purchase/PurchaseHeader";
import { SupplierSection } from "./purchase/SupplierSection";
import { PurchaseDetailsSection } from "./purchase/PurchaseDetailsSection";
import { PurchaseItemsTable, PurchaseItemRowData } from "./purchase/PurchaseItemsTable";
import { PurchaseAdditionalDetails } from "./purchase/PurchaseAdditionalDetails";
import { PurchaseSummarySection } from "./purchase/PurchaseSummarySection";
import { PurchaseStickyFooter } from "./purchase/PurchaseStickyFooter";
import { ProductItem } from "./purchase/ProductCombobox";
import { PurchaseBillScanner, ExtractedPurchaseBill } from "./purchase/PurchaseBillScanner";

interface RecordPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseToEdit?: any;
    startWithScanner?: boolean;
    initialParty?: any;
}

interface PurchaseFormValues {
    vendor_name: string;
    vendor_phone: string;
    vendor_gstin: string;
    place_of_supply: string;
    bill_number: string;
    date: string;
    due_date: string;
    payment_status: "paid" | "partial" | "pending";
    amount_paid: number;
    discount_amount: number;
    tax_rate: number;
    notes: string;
    attachment_url?: string;
    items: PurchaseItemRowData[];
}

export const RecordPurchaseDialog = ({
    open,
    onOpenChange,
    purchaseToEdit,
    startWithScanner = false,
    initialParty,
}: RecordPurchaseDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const { user } = useAuth();

    const overdueThresholdDays = getOverdueDaysThreshold();
    const [isAiFillOpen, setIsAiFillOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(startWithScanner);
    const [scannedNotification, setScannedNotification] = useState<{
        vendor: string;
        itemCount: number;
        fileName?: string;
        isPdf?: boolean;
    } | null>(null);

    useEffect(() => {
        if (open) {
            setIsScannerOpen(startWithScanner);
            setScannedNotification(null);
        }
    }, [open, startWithScanner]);

    const getDefaultDueDate = (billDateStr?: string) => {
        const baseDate = billDateStr ? new Date(billDateStr) : new Date();
        baseDate.setDate(baseDate.getDate() + overdueThresholdDays);
        return baseDate.toISOString().split("T")[0];
    };

    const {
        control,
        handleSubmit,
        watch,
        reset,
        setValue,
        formState: { errors },
    } = useForm<PurchaseFormValues>({
        defaultValues: {
            vendor_name: "",
            vendor_phone: "",
            vendor_gstin: "",
            place_of_supply: "",
            bill_number: `BILL-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split("T")[0],
            due_date: getDefaultDueDate(),
            payment_status: "paid",
            amount_paid: 0,
            discount_amount: 0,
            tax_rate: 0,
            notes: "",
            attachment_url: "",
            items: [
                {
                    description: "",
                    quantity: 1,
                    price: 0,
                    unit: "pc",
                    discount: 0,
                    tax_rate: 0,
                    total: 0,
                },
            ],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "items",
    });

    // Form Watchers
    const watchItems = watch("items") || [];
    const watchDate = watch("date") || new Date().toISOString().split("T")[0];
    const watchDueDate = watch("due_date") || getDefaultDueDate(watchDate);
    const watchPaymentStatus = watch("payment_status") || "paid";
    const watchAmountPaid = Number(watch("amount_paid") || 0);
    const watchBillDiscount = Number(watch("discount_amount") || 0);
    const watchDefaultTaxRate = Number(watch("tax_rate") || 0);
    const watchVendorName = watch("vendor_name") || "";
    const watchVendorGstin = watch("vendor_gstin") || "";
    const watchVendorPhone = watch("vendor_phone") || "";
    const watchPlaceOfSupply = watch("place_of_supply") || "";
    const watchBillNumber = watch("bill_number") || "";
    const watchNotes = watch("notes") || "";
    const watchAttachmentUrl = watch("attachment_url") || "";

    // Financial Calculations
    const subtotal = watchItems.reduce(
        (sum, item) => sum + Number(item?.quantity || 0) * Number(item?.price || 0),
        0
    );

    const itemDiscounts = watchItems.reduce((sum, item) => {
        const lineVal = Number(item?.quantity || 0) * Number(item?.price || 0);
        return sum + (lineVal * Number(item?.discount || 0)) / 100;
    }, 0);

    const totalTaxAmount = watchItems.reduce((sum, item) => {
        const lineVal = Number(item?.quantity || 0) * Number(item?.price || 0);
        const lineDiscount = (lineVal * Number(item?.discount || 0)) / 100;
        const lineTaxable = Math.max(0, lineVal - lineDiscount);
        const rate = Number(item?.tax_rate ?? watchDefaultTaxRate ?? 0);
        return sum + (lineTaxable * rate) / 100;
    }, 0);

    const finalTotalAmount = Math.max(
        0,
        subtotal - itemDiscounts - watchBillDiscount + totalTaxAmount
    );
    const balanceDue = Math.max(0, finalTotalAmount - watchAmountPaid);

    // Keep amount_paid updated if payment_status is 'paid'
    useEffect(() => {
        if (watchPaymentStatus === "paid") {
            setValue("amount_paid", finalTotalAmount);
        }
    }, [finalTotalAmount, watchPaymentStatus, setValue]);

    // Handle Payment Status Toggle
    const handlePaymentStatusChange = (status: "paid" | "partial" | "pending") => {
        setValue("payment_status", status, { shouldValidate: true, shouldDirty: true });
        if (status === "paid") {
            setValue("amount_paid", finalTotalAmount, { shouldValidate: true, shouldDirty: true });
        } else if (status === "pending") {
            setValue("amount_paid", 0, { shouldValidate: true, shouldDirty: true });
        }
    };

    // Auto-update due date when bill date changes
    const handleBillDateChange = (dateVal: string) => {
        setValue("date", dateVal, { shouldValidate: true, shouldDirty: true });
        if (dateVal) {
            setValue("due_date", getDefaultDueDate(dateVal), {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
    };

    // Reset or hydrate form values
    useEffect(() => {
        if (open && purchaseToEdit) {
            const initialDate = purchaseToEdit.date || new Date().toISOString().split("T")[0];
            const initialTotal = Number(purchaseToEdit.total_amount || 0);
            const initialPaid =
                purchaseToEdit.amount_paid !== undefined
                    ? Number(purchaseToEdit.amount_paid)
                    : purchaseToEdit.status === "paid"
                    ? initialTotal
                    : 0;

            let computedStatus: "paid" | "partial" | "pending" = "paid";
            if (initialPaid >= initialTotal && initialTotal > 0) {
                computedStatus = "paid";
            } else if (initialPaid > 0 && initialPaid < initialTotal) {
                computedStatus = "partial";
            } else {
                computedStatus = "pending";
            }

            reset({
                vendor_name: purchaseToEdit.vendor_name || "",
                vendor_phone: purchaseToEdit.vendor_phone || "",
                vendor_gstin: purchaseToEdit.vendor_gstin || "",
                place_of_supply: purchaseToEdit.place_of_supply || "",
                bill_number: purchaseToEdit.bill_number || "",
                date: initialDate,
                due_date: purchaseToEdit.due_date || getDefaultDueDate(initialDate),
                payment_status: computedStatus,
                amount_paid: initialPaid,
                discount_amount: Number(purchaseToEdit.discount_amount || 0),
                tax_rate: Number(purchaseToEdit.tax_rate || 0),
                notes: purchaseToEdit.notes || "",
                attachment_url: purchaseToEdit.attachment_url || "",
                items:
                    purchaseToEdit.items && purchaseToEdit.items.length > 0
                        ? purchaseToEdit.items.map((it: any) => ({
                              description: it.description || "",
                              quantity: Number(it.quantity || 1),
                              price: Number(it.price || 0),
                              unit: it.unit || "pc",
                              discount: Number(it.discount || 0),
                              tax_rate: Number(it.tax_rate ?? purchaseToEdit.tax_rate ?? 0),
                              total: Number(it.total || 0),
                          }))
                        : [
                              {
                                  description: "",
                                  quantity: 1,
                                  price: 0,
                                  unit: "pc",
                                  discount: 0,
                                  tax_rate: 0,
                                  total: 0,
                              },
                          ],
            });
            setIsAiFillOpen(false);
        } else if (open && !purchaseToEdit) {
            const todayStr = new Date().toISOString().split("T")[0];
            reset({
                vendor_name: initialParty?.name || "",
                vendor_phone: initialParty?.phone || "",
                vendor_gstin: initialParty?.gst_number || "",
                place_of_supply: initialParty?.address || "",
                bill_number: `BILL-${Date.now().toString().slice(-6)}`,
                date: todayStr,
                due_date: getDefaultDueDate(todayStr),
                payment_status: "paid",
                amount_paid: 0,
                discount_amount: 0,
                tax_rate: 0,
                notes: "",
                attachment_url: "",
                items: [
                    {
                        description: "",
                        quantity: 1,
                        price: 0,
                        unit: "pc",
                        discount: 0,
                        tax_rate: 0,
                        total: 0,
                    },
                ],
            });
            setIsAiFillOpen(false);
        }
    }, [open, purchaseToEdit, initialParty, reset]);

    // Fetch Parties for Vendor Autocomplete
    const { data: parties = [] } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data } = await (supabase as any)
                .from("parties")
                .select("*")
                .eq("user_id", user.id);
            return data || [];
        },
        enabled: open && !!user?.id,
    });

    // Fetch Products for Item Autocomplete
    const { data: products = [] } = useQuery({
        queryKey: ["products", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data } = await (supabase as any)
                .from("products")
                .select("*")
                .eq("user_id", user.id);
            return data || [];
        },
        enabled: open && !!user?.id,
    });

    const vendorParties = parties.filter(
        (party: any) => party.type === "vendor" || party.type === "both" || !party.type
    );

    // Handlers for Items
    const handleItemChange = (index: number, field: keyof PurchaseItemRowData, value: any) => {
        setValue(`items.${index}.${field}` as any, value, {
            shouldValidate: true,
            shouldDirty: true,
        });

        // Recalculate row total
        const updatedRow = {
            ...watchItems[index],
            [field]: value,
        };
        const qty = Number(updatedRow.quantity || 0);
        const rate = Number(updatedRow.price || 0);
        const discPercent = Number(updatedRow.discount || 0);
        const taxRate = Number(updatedRow.tax_rate ?? watchDefaultTaxRate ?? 0);
        const lineTotal = Math.max(
            0,
            qty * rate * (1 - discPercent / 100) * (1 + taxRate / 100)
        );
        setValue(`items.${index}.total`, lineTotal);
    };

    const handleProductSelect = (index: number, product: ProductItem) => {
        setValue(`items.${index}.description`, product.name, {
            shouldValidate: true,
            shouldDirty: true,
        });
        const cost = Number(product.cost_price ?? product.price ?? 0);
        if (cost > 0) {
            setValue(`items.${index}.price`, cost, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
        if (product.unit) {
            setValue(`items.${index}.unit`, product.unit, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }

        // Auto append next item row if selecting on the last item
        if (index === fields.length - 1) {
            append({
                description: "",
                quantity: 1,
                price: 0,
                unit: "pc",
                discount: 0,
                tax_rate: watchDefaultTaxRate,
                total: 0,
            });
        }
    };

    const handleAddItem = () => {
        append({
            description: "",
            quantity: 1,
            price: 0,
            unit: "pc",
            discount: 0,
            tax_rate: watchDefaultTaxRate,
            total: 0,
        });
    };

    const handleRemoveItem = (index: number) => {
        if (fields.length > 1) {
            remove(index);
        } else {
            setValue("items.0.description", "");
            setValue("items.0.quantity", 1);
            setValue("items.0.price", 0);
            setValue("items.0.discount", 0);
            setValue("items.0.unit", "pc");
            setValue("items.0.total", 0);
        }
    };

    const handleSmartParse = (data: {
        vendorName?: string;
        billNumber?: string;
        date?: string;
        items?: Array<{ description: string; quantity: number; price: number }>;
    }) => {
        if (data.vendorName) {
            setValue("vendor_name", data.vendorName, { shouldValidate: true, shouldDirty: true });
            const matched = vendorParties.find(
                (p: any) => p.name?.toLowerCase() === data.vendorName?.trim().toLowerCase()
            );
            if (matched) {
                if (matched.gst_number) setValue("vendor_gstin", matched.gst_number);
                if (matched.phone) setValue("vendor_phone", matched.phone);
            }
        }
        if (data.billNumber) {
            setValue("bill_number", data.billNumber, { shouldValidate: true, shouldDirty: true });
        }
        if (data.date) {
            setValue("date", data.date, { shouldValidate: true, shouldDirty: true });
            setValue("due_date", getDefaultDueDate(data.date), { shouldValidate: true, shouldDirty: true });
        }

        if (data.items && data.items.length > 0) {
            const mappedItems = data.items.map((item) => ({
                description: item.description,
                quantity: item.quantity || 1,
                price: item.price || 0,
                unit: "pc",
                discount: 0,
                tax_rate: watchDefaultTaxRate,
                total: (item.quantity || 1) * (item.price || 0),
            }));
            replace(mappedItems);
            setValue("items", mappedItems, { shouldValidate: true, shouldDirty: true });
        }

        toast({
            title: "AI Magic ✨",
            description: "Bill details populated from natural language text.",
        });
        setIsAiFillOpen(false);
    };

    const handleScannerExtract = (data: ExtractedPurchaseBill, autoSaveImmediately?: boolean) => {
        if (data.vendor_name) {
            setValue("vendor_name", data.vendor_name, { shouldValidate: true, shouldDirty: true });
            const matched = vendorParties.find(
                (p: any) =>
                    p.name?.toLowerCase() === data.vendor_name?.trim().toLowerCase() ||
                    (data.vendor_gstin && p.gst_number && p.gst_number.toLowerCase() === data.vendor_gstin.toLowerCase())
            );
            if (matched) {
                if (matched.gst_number) setValue("vendor_gstin", matched.gst_number);
                if (matched.phone) setValue("vendor_phone", matched.phone);
            } else {
                if (data.vendor_gstin) setValue("vendor_gstin", data.vendor_gstin);
                if (data.vendor_phone) setValue("vendor_phone", data.vendor_phone);
            }
        }
        if (data.place_of_supply) {
            setValue("place_of_supply", data.place_of_supply, { shouldValidate: true, shouldDirty: true });
        }
        if (data.bill_number) {
            setValue("bill_number", data.bill_number, { shouldValidate: true, shouldDirty: true });
        }
        if (data.date) {
            setValue("date", data.date, { shouldValidate: true, shouldDirty: true });
            setValue("due_date", data.due_date || getDefaultDueDate(data.date), { shouldValidate: true, shouldDirty: true });
        }
        if (data.discount_amount !== undefined) {
            setValue("discount_amount", data.discount_amount, { shouldValidate: true, shouldDirty: true });
        }
        if (data.tax_rate !== undefined) {
            setValue("tax_rate", data.tax_rate, { shouldValidate: true, shouldDirty: true });
        }
        if (data.notes) {
            setValue("notes", data.notes, { shouldValidate: true, shouldDirty: true });
        }
        if (data.file_name) {
            setValue("attachment_url", data.file_name, { shouldValidate: true, shouldDirty: true });
        }
        if (data.items && data.items.length > 0) {
            replace(data.items);
            setValue("items", data.items, { shouldValidate: true, shouldDirty: true });
            setScannedNotification({
                vendor: data.vendor_name,
                itemCount: data.items.length,
                fileName: data.file_name,
                isPdf: data.is_pdf,
            });
        }

        const calcSubtotal = (data.items || []).reduce(
            (s, it) => s + Number(it.quantity || 1) * Number(it.price || 0),
            0
        );
        const calcDisc = (data.items || []).reduce(
            (s, it) => s + (Number(it.quantity || 1) * Number(it.price || 0) * Number(it.discount || 0)) / 100,
            0
        );
        const calcTax = (data.items || []).reduce((s, it) => {
            const line = Number(it.quantity || 1) * Number(it.price || 0);
            const lineDisc = (line * Number(it.discount || 0)) / 100;
            return s + ((line - lineDisc) * Number(it.tax_rate ?? data.tax_rate ?? 0)) / 100;
        }, 0);
        const finalCalculatedTotal =
            data.total_amount || Math.max(0, calcSubtotal - calcDisc - Number(data.discount_amount || 0) + calcTax);

        const status = data.payment_status || "paid";
        setValue("payment_status", status, { shouldValidate: true, shouldDirty: true });
        if (status === "paid") {
            setValue("amount_paid", finalCalculatedTotal, { shouldValidate: true, shouldDirty: true });
        } else if (status === "partial") {
            setValue("amount_paid", data.amount_paid || 0, { shouldValidate: true, shouldDirty: true });
        } else {
            setValue("amount_paid", 0, { shouldValidate: true, shouldDirty: true });
        }

        if (autoSaveImmediately) {
            const submissionPayload: PurchaseFormValues = {
                vendor_name: data.vendor_name || "Supplier",
                vendor_phone: data.vendor_phone || "",
                vendor_gstin: data.vendor_gstin || "",
                place_of_supply:
                    data.place_of_supply ||
                    (data.vendor_gstin ? data.vendor_gstin.substring(0, 2) : ""),
                bill_number: data.bill_number || `BILL-${Date.now().toString().slice(-6)}`,
                date: data.date || new Date().toISOString().split("T")[0],
                due_date: data.due_date || getDefaultDueDate(data.date),
                payment_status: status,
                amount_paid: status === "paid" ? finalCalculatedTotal : (data.amount_paid || 0),
                discount_amount: data.discount_amount || 0,
                tax_rate: data.tax_rate || 0,
                notes: data.notes || "",
                attachment_url: data.file_name || "",
                items: data.items,
            };
            createPurchaseMutation.mutate(submissionPayload);
        } else {
            toast({
                title: "Items loaded into table! ⚡",
                description: `${(data.items || []).length} products populated with rates. You can edit any field below.`,
            });
        }
    };

    // Save Purchase Mutation
    const createPurchaseMutation = useMutation({
        mutationFn: async (values: PurchaseFormValues) => {
            if (!user) throw new Error("User not authenticated");

            if (!values.vendor_name?.trim()) {
                throw new Error("Supplier / Vendor name is required.");
            }

            // Filter out empty trailing item rows
            const validItems = values.items.filter((it) => it.description.trim() !== "");
            const finalItemsList = validItems.length > 0 ? validItems : values.items;

            if (finalItemsList.length === 0 || !finalItemsList[0].description.trim()) {
                throw new Error("Please add at least one product with a name.");
            }

            const purchaseId = purchaseToEdit ? purchaseToEdit.id : uuidv4();
            const calcSubtotal = finalItemsList.reduce(
                (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
                0
            );

            const calcItemDiscounts = finalItemsList.reduce((sum, item) => {
                const lineVal = Number(item.quantity || 0) * Number(item.price || 0);
                return sum + (lineVal * Number(item.discount || 0)) / 100;
            }, 0);

            const calcTaxAmount = finalItemsList.reduce((sum, item) => {
                const lineVal = Number(item.quantity || 0) * Number(item.price || 0);
                const lineDiscount = (lineVal * Number(item.discount || 0)) / 100;
                const lineTaxable = Math.max(0, lineVal - lineDiscount);
                const rate = Number(item.tax_rate ?? values.tax_rate ?? 0);
                return sum + (lineTaxable * rate) / 100;
            }, 0);

            const calcTotalAmount = Math.max(
                0,
                calcSubtotal - calcItemDiscounts - Number(values.discount_amount || 0) + calcTaxAmount
            );

            const calcAmountPaid = Number(values.amount_paid || 0);
            const calcBalanceDue = Math.max(0, calcTotalAmount - calcAmountPaid);

            let calcStatus: "paid" | "pending" | "overdue" | "partial" = "paid";
            if (calcAmountPaid >= calcTotalAmount && calcTotalAmount > 0) {
                calcStatus = "paid";
            } else if (calcAmountPaid > 0 && calcAmountPaid < calcTotalAmount) {
                calcStatus = "partial";
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(values.due_date || getDefaultDueDate());
                due.setHours(0, 0, 0, 0);
                calcStatus = due < today ? "overdue" : "pending";
            }

            // Auto-Save Vendor to Parties Directory if not already present
            let resolvedPartyId: string | null = null;
            if (values.vendor_name?.trim()) {
                const existingVendor = vendorParties.find(
                    (p: any) => p.name?.toLowerCase() === values.vendor_name.trim().toLowerCase()
                );
                if (existingVendor) {
                    resolvedPartyId = existingVendor.id;
                } else {
                    resolvedPartyId = uuidv4();
                    await offlineMutate({
                        table: "parties",
                        action: "insert",
                        recordId: resolvedPartyId,
                        payload: {
                            id: resolvedPartyId,
                            user_id: user.id,
                            name: values.vendor_name.trim(),
                            type: "vendor",
                            phone: values.vendor_phone || null,
                            gst_number: values.vendor_gstin || null,
                            opening_balance: 0,
                            opening_balance_type: "to_pay",
                        },
                        userId: user.id,
                    });
                }
            }

            const purchaseData = {
                id: purchaseId,
                user_id: user.id,
                party_id: resolvedPartyId,
                bill_number: values.bill_number || `BILL-${Date.now().toString().slice(-6)}`,
                vendor_name: values.vendor_name.trim(),
                vendor_phone: values.vendor_phone || null,
                vendor_gstin: values.vendor_gstin || null,
                place_of_supply:
                    values.place_of_supply ||
                    (values.vendor_gstin ? values.vendor_gstin.substring(0, 2) : null),
                date: values.date,
                due_date: values.due_date,
                amount_paid: calcAmountPaid,
                balance_due: calcBalanceDue,
                status: calcStatus,
                tax_rate: Number(values.tax_rate || 0),
                tax_amount: calcTaxAmount,
                discount_amount: Number(values.discount_amount || 0) + calcItemDiscounts,
                subtotal: calcSubtotal,
                total_amount: calcTotalAmount,
                notes: values.notes || null,
                attachment_url: values.attachment_url || null,
                items: finalItemsList.map((item) => ({
                    description: item.description,
                    quantity: Number(item.quantity || 1),
                    price: Number(item.price || 0),
                    unit: item.unit || "pc",
                    discount: Number(item.discount || 0),
                    tax_rate: Number(item.tax_rate ?? values.tax_rate ?? 0),
                    total:
                        Number(item.quantity || 1) *
                        Number(item.price || 0) *
                        (1 - Number(item.discount || 0) / 100),
                })),
            };

            const productSyncs: any[] = [];
            const cachedProducts: any[] =
                queryClient.getQueryData(["products", user.id]) || products || [];

            // Safe DB Saver with schema fallback (prevents column missing errors on Supabase DB)
            const savePurchaseToDB = async (
                action: "insert" | "update",
                rId: string,
                pData: any
            ) => {
                try {
                    const res = await offlineMutate({
                        table: "purchases",
                        action,
                        recordId: rId,
                        payload: pData,
                        userId: user.id,
                    });
                    if (!res.error) return res;
                } catch (err: any) {
                    console.warn(
                        "Full purchases schema insert threw exception, falling back to core DB schema:",
                        err
                    );
                }

                const corePayload = {
                    id: pData.id,
                    user_id: pData.user_id,
                    bill_number: pData.bill_number,
                    vendor_name: pData.vendor_name,
                    date: pData.date,
                    status: pData.status,
                    subtotal: pData.subtotal,
                    tax_amount: pData.tax_amount,
                    total_amount: pData.total_amount,
                    items: pData.items,
                };

                return await offlineMutate({
                    table: "purchases",
                    action,
                    recordId: rId,
                    payload: corePayload,
                    userId: user.id,
                });
            };

            if (purchaseToEdit) {
                const { error } = await savePurchaseToDB("update", purchaseToEdit.id, purchaseData);
                if (error) throw error;
            } else {
                const { error: purchaseError } = await savePurchaseToDB(
                    "insert",
                    purchaseId,
                    purchaseData
                );
                if (purchaseError) throw purchaseError;

                // Sync inventory stock for purchased items
                for (const item of finalItemsList) {
                    if (!item.description?.trim()) continue;

                    const existingProduct = cachedProducts.find(
                        (p: any) =>
                            p.name?.toLowerCase() === item.description.trim().toLowerCase()
                    );

                    if (existingProduct) {
                        const newQty =
                            Number(existingProduct.stock_quantity || 0) +
                            Number(item.quantity || 1);
                        const { error: updateError } = await offlineMutate({
                            table: "products",
                            action: "update",
                            recordId: existingProduct.id,
                            payload: { stock_quantity: newQty },
                            userId: user.id,
                        });
                        if (updateError) throw updateError;
                        productSyncs.push({
                            id: existingProduct.id,
                            name: item.description.trim(),
                            isNew: false,
                            quantity: Number(item.quantity),
                            price: Number(item.price),
                            unit: item.unit || existingProduct.unit || "pc",
                        });
                    } else {
                        const productId = uuidv4();
                        const { error: insertProdError } = await offlineMutate({
                            table: "products",
                            action: "insert",
                            recordId: productId,
                            payload: {
                                id: productId,
                                user_id: user.id,
                                name: item.description.trim(),
                                price: Number(item.price || 0),
                                cost_price: Number(item.price || 0),
                                stock_quantity: Number(item.quantity || 1),
                                unit: item.unit || "pc",
                            },
                            userId: user.id,
                        });
                        if (insertProdError) throw insertProdError;
                        productSyncs.push({
                            id: productId,
                            name: item.description.trim(),
                            isNew: true,
                            quantity: Number(item.quantity),
                            price: Number(item.price),
                            unit: item.unit || "pc",
                        });
                    }
                }
            }

            return { purchaseId, purchaseData, productSyncs, userId: user.id };
        },
        onSuccess: (data) => {
            const { purchaseData, productSyncs, userId } = data;

            queryClient.setQueryData(["purchases", userId], (old: any) => {
                if (purchaseToEdit) {
                    return old
                        ? old.map((p: any) =>
                              p.id === purchaseToEdit.id ? { ...p, ...purchaseData } : p
                          )
                        : [purchaseData];
                } else {
                    return old ? [purchaseData, ...old] : [purchaseData];
                }
            });

            if (productSyncs.length > 0) {
                queryClient.setQueryData(["products", userId], (old: any) => {
                    const prods = old ? [...old] : [];
                    for (const sync of productSyncs) {
                        if (sync.isNew) {
                            prods.push({
                                id: sync.id,
                                user_id: userId,
                                name: sync.name,
                                price: sync.price,
                                cost_price: sync.price,
                                stock_quantity: sync.quantity,
                                unit: sync.unit,
                            });
                        } else {
                            const idx = prods.findIndex((p: any) => p.id === sync.id);
                            if (idx !== -1) {
                                prods[idx] = {
                                    ...prods[idx],
                                    stock_quantity:
                                        Number(prods[idx].stock_quantity || 0) + sync.quantity,
                                };
                            }
                        }
                    }
                    return prods;
                });
            }

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ["purchases"] });
                queryClient.invalidateQueries({ queryKey: ["products"] });
                queryClient.invalidateQueries({ queryKey: ["parties"] });
            }

            toast({
                title: purchaseToEdit ? "Purchase Bill Updated" : "Purchase Recorded",
                description:
                    purchaseData.balance_due > 0
                        ? `Saved bill. Balance due of ${formatCurrency(
                              purchaseData.balance_due
                          )} added to ${purchaseData.vendor_name}.`
                        : "Purchase saved and paid in full.",
            });

            onOpenChange(false);
            reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error Recording Purchase",
                description: error?.message || "Failed to save purchase bill.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: PurchaseFormValues) => {
        createPurchaseMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full sm:max-w-[1150px] max-h-[94vh] h-[94vh] sm:h-auto p-0 flex flex-col bg-background border-border/80 shadow-2xl rounded-2xl overflow-hidden">
                {/* Header */}
                <PurchaseHeader
                    isEditing={Boolean(purchaseToEdit)}
                    paymentStatus={watchPaymentStatus}
                    isAiFillOpen={isAiFillOpen}
                    isScannerOpen={isScannerOpen}
                    onToggleAiFill={() => {
                        setIsAiFillOpen((prev) => !prev);
                        if (!isAiFillOpen) setIsScannerOpen(false);
                    }}
                    onToggleScanner={() => {
                        setIsScannerOpen((prev) => !prev);
                        if (!isScannerOpen) setIsAiFillOpen(false);
                    }}
                    onClose={() => onOpenChange(false)}
                />

                {/* Form Body */}
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex-1 flex flex-col overflow-hidden min-h-0"
                >
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                        {/* 1-Click AI Purchase Bill Scanner */}
                        {!purchaseToEdit && isScannerOpen && (
                            <PurchaseBillScanner
                                onExtract={handleScannerExtract}
                                onClose={() => setIsScannerOpen(false)}
                            />
                        )}

                        {/* AI Smart Fill Bill Input (Collapsible) */}
                        {!purchaseToEdit && isAiFillOpen && (
                            <div className="bg-violet-500/10 border border-violet-500/30 p-4 rounded-xl space-y-2 animate-in fade-in-0 duration-150">
                                <Label className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 uppercase tracking-wide">
                                    <Wand2 className="w-3.5 h-3.5 text-violet-500 animate-pulse" />{" "}
                                    AI Natural Language Bill Extractor
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Paste raw purchase messages or type naturally, e.g. "Purchased 20 bags of cement from Apex Traders at 380 each, bill ref AT-504".
                                </p>
                                <SmartPurchaseInput onParse={handleSmartParse} />
                            </div>
                        )}

                        {/* Supplier Section */}
                        <SupplierSection
                            vendorName={watchVendorName}
                            vendorGstin={watchVendorGstin}
                            vendorPhone={watchVendorPhone}
                            placeOfSupply={watchPlaceOfSupply}
                            onVendorNameChange={(val) =>
                                setValue("vendor_name", val, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                })
                            }
                            onVendorGstinChange={(val) =>
                                setValue("vendor_gstin", val, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                })
                            }
                            onVendorPhoneChange={(val) =>
                                setValue("vendor_phone", val, {
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
                            userId={user?.id}
                            error={errors.vendor_name?.message}
                        />

                        {/* Purchase Details Section */}
                        <PurchaseDetailsSection
                            billNumber={watchBillNumber}
                            date={watchDate}
                            dueDate={watchDueDate}
                            paymentStatus={watchPaymentStatus}
                            onBillNumberChange={(val) =>
                                setValue("bill_number", val, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                })
                            }
                            onDateChange={handleBillDateChange}
                            onDueDateChange={(val) =>
                                setValue("due_date", val, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                })
                            }
                            onPaymentStatusChange={handlePaymentStatusChange}
                        />

                        {/* Scanned Items Notification Banner */}
                        {scannedNotification && (
                            <div className="flex items-center justify-between gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 animate-in fade-in-0 duration-200">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
                                        {scannedNotification.isPdf ? <FileText className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground flex items-center gap-1.5">
                                            <span>{scannedNotification.itemCount} Items Loaded into Columns</span>
                                            <span className="text-muted-foreground font-normal">
                                                from {scannedNotification.fileName ? `"${scannedNotification.fileName}"` : scannedNotification.vendor}
                                            </span>
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Product names, units, quantities, rates and GST are populated in the columns below. You can edit any field before saving.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setScannedNotification(null)}
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}

                        {/* Items Section */}
                        <PurchaseItemsTable
                            items={watchItems}
                            products={products}
                            defaultTaxRate={watchDefaultTaxRate}
                            onItemChange={handleItemChange}
                            onProductSelect={handleProductSelect}
                            onAddItem={handleAddItem}
                            onRemoveItem={handleRemoveItem}
                        />

                        {/* Additional Details & Supplier Notes */}
                        <PurchaseAdditionalDetails
                            notes={watchNotes}
                            attachmentUrl={watchAttachmentUrl}
                            onNotesChange={(val) =>
                                setValue("notes", val, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                })
                            }
                            onAttachmentUrlChange={(val) =>
                                setValue("attachment_url", val, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                })
                            }
                        />

                        {/* Summary & Ledger Settlement Section */}
                        <PurchaseSummarySection
                            subtotal={subtotal}
                            itemDiscounts={itemDiscounts}
                            overallDiscount={watchBillDiscount}
                            taxAmount={totalTaxAmount}
                            grandTotal={finalTotalAmount}
                            amountPaid={watchAmountPaid}
                            balanceDue={balanceDue}
                            paymentStatus={watchPaymentStatus}
                            vendorName={watchVendorName || "Supplier"}
                            placeOfSupply={watchPlaceOfSupply}
                            onOverallDiscountChange={(val) =>
                                setValue("discount_amount", val, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                })
                            }
                            onAmountPaidChange={(val) => {
                                setValue("amount_paid", val, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                });
                            }}
                            onPaymentStatusChange={handlePaymentStatusChange}
                        />
                    </div>

                    {/* Sticky Footer */}
                    <PurchaseStickyFooter
                        grandTotal={finalTotalAmount}
                        balanceDue={balanceDue}
                        itemsCount={watchItems.length}
                        isEditing={Boolean(purchaseToEdit)}
                        isSubmitting={createPurchaseMutation.isPending}
                        onCancel={() => onOpenChange(false)}
                    />
                </form>
            </DialogContent>
        </Dialog>
    );
};