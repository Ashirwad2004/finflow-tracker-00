import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Wand2, CheckCircle2, Clock, DollarSign, UserCheck } from "lucide-react";
import { SmartPurchaseInput } from "./SmartPurchaseInput";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { offlineMutate } from "@/core/offline/apiService";
import { getOverdueDaysThreshold } from "@/core/utils/overdue";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/core/lib/auth";

interface RecordPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseToEdit?: any;
}

interface PurchaseItem {
    description: string;
    quantity: number;
    price: number;
    total: number;
}

interface PurchaseFormValues {
    vendor_name: string;
    bill_number: string;
    date: string;
    due_date: string;
    payment_status: 'paid' | 'unpaid';
    amount_paid: number;
    tax_rate: number;
    discount_amount: number;
    items: PurchaseItem[];
    attachment_url?: string;
    vendor_gstin?: string;
    place_of_supply?: string;
}

export const RecordPurchaseDialog = ({ open, onOpenChange, purchaseToEdit }: RecordPurchaseDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency, currency } = useCurrency();
    const { user } = useAuth();

    const overdueThresholdDays = getOverdueDaysThreshold();

    const getDefaultDueDate = (billDateStr?: string) => {
        const baseDate = billDateStr ? new Date(billDateStr) : new Date();
        baseDate.setDate(baseDate.getDate() + overdueThresholdDays);
        return baseDate.toISOString().split("T")[0];
    };

    const { register, control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<PurchaseFormValues>({
        defaultValues: {
            vendor_name: "",
            bill_number: "",
            date: new Date().toISOString().split("T")[0],
            due_date: getDefaultDueDate(),
            payment_status: "paid",
            amount_paid: 0,
            tax_rate: 0,
            discount_amount: 0,
            items: [{ description: "", quantity: 1, price: 0, total: 0 }],
            vendor_gstin: "",
            place_of_supply: ""
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    // Form Watchers
    const watchItems = watch("items") || [];
    const watchDate = watch("date") || new Date().toISOString().split("T")[0];
    const watchDueDate = watch("due_date") || getDefaultDueDate(watchDate);
    const watchPaymentStatus = watch("payment_status") || "paid";
    const watchAmountPaid = Number(watch("amount_paid") || 0);
    const watchTaxRate = Number(watch("tax_rate") || 0);
    const watchDiscount = Number(watch("discount_amount") || 0);

    // Financial calculations
    const subtotal = watchItems.reduce((sum, item) => sum + (Number(item?.quantity || 0) * Number(item?.price || 0)), 0);
    const taxAmount = (subtotal * watchTaxRate) / 100;
    const finalTotalAmount = Math.max(0, subtotal + taxAmount - watchDiscount);
    const balanceDue = Math.max(0, finalTotalAmount - watchAmountPaid);

    // Keep amount_paid updated when payment_status is 'paid'
    useEffect(() => {
        if (watchPaymentStatus === 'paid') {
            setValue("amount_paid", finalTotalAmount);
        }
    }, [finalTotalAmount, watchPaymentStatus, setValue]);

    // Handle Payment Status Toggle
    const handleStatusToggle = (status: 'paid' | 'unpaid') => {
        setValue("payment_status", status, { shouldValidate: true, shouldDirty: true });
        if (status === 'paid') {
            setValue("amount_paid", finalTotalAmount, { shouldValidate: true, shouldDirty: true });
        } else {
            setValue("amount_paid", 0, { shouldValidate: true, shouldDirty: true });
        }
    };

    // Auto-update due date when bill date changes
    const handleBillDateChange = (dateVal: string) => {
        setValue("date", dateVal, { shouldValidate: true, shouldDirty: true });
        if (dateVal) {
            setValue("due_date", getDefaultDueDate(dateVal), { shouldValidate: true, shouldDirty: true });
        }
    };

    // Reset form values on edit or open
    useEffect(() => {
        if (open && purchaseToEdit) {
            const initialDate = purchaseToEdit.date || new Date().toISOString().split("T")[0];
            const initialTotal = Number(purchaseToEdit.total_amount || 0);
            const initialPaid = purchaseToEdit.amount_paid !== undefined 
                ? Number(purchaseToEdit.amount_paid)
                : (purchaseToEdit.status === 'paid' ? initialTotal : 0);

            const isPaid = initialPaid >= initialTotal && initialTotal > 0;

            reset({
                vendor_name: purchaseToEdit.vendor_name || "",
                bill_number: purchaseToEdit.bill_number || "",
                date: initialDate,
                due_date: purchaseToEdit.due_date || getDefaultDueDate(initialDate),
                payment_status: isPaid ? "paid" : "unpaid",
                amount_paid: initialPaid,
                tax_rate: Number(purchaseToEdit.tax_rate || 0),
                discount_amount: Number(purchaseToEdit.discount_amount || 0),
                items: purchaseToEdit.items && purchaseToEdit.items.length > 0 
                    ? purchaseToEdit.items.map((it: any) => ({
                        description: it.description || "",
                        quantity: Number(it.quantity || 1),
                        price: Number(it.price || 0),
                        total: Number(it.total || (Number(it.quantity || 1) * Number(it.price || 0)))
                    })) 
                    : [{ description: "", quantity: 1, price: 0, total: 0 }],
                vendor_gstin: purchaseToEdit.vendor_gstin || "",
                place_of_supply: purchaseToEdit.place_of_supply || ""
            });
        } else if (open && !purchaseToEdit) {
            const todayStr = new Date().toISOString().split("T")[0];
            reset({
                vendor_name: "",
                bill_number: "",
                date: todayStr,
                due_date: getDefaultDueDate(todayStr),
                payment_status: "paid",
                amount_paid: 0,
                tax_rate: 0,
                discount_amount: 0,
                items: [{ description: "", quantity: 1, price: 0, total: 0 }],
                vendor_gstin: "",
                place_of_supply: ""
            });
        }
    }, [open, purchaseToEdit, reset]);

    // Fetch Parties for Vendor Auto-complete
    const { data: parties = [] } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data } = await supabase.from("parties" as any)
                .select("*")
                .eq("user_id", user.id);
            return data || [];
        },
        enabled: open && !!user?.id
    });

    // Fetch Products for Item Auto-complete
    const { data: products = [] } = useQuery({
        queryKey: ["products", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data } = await supabase.from("products" as any)
                .select("*")
                .eq("user_id", user.id);
            return data || [];
        },
        enabled: open && !!user?.id
    });

    const vendorParties = parties.filter((party: any) => 
        party.type === "vendor" || party.type === "both" || !party.type
    );

    // Auto-Match Product Cost & AUTOMATICALLY ADD NEXT ITEM COLUMN when typing last row
    const handleItemDescriptionChange = (index: number, description: string) => {
        setValue(`items.${index}.description`, description, { shouldValidate: true, shouldDirty: true });
        
        const matchedProduct = (products as any[]).find((p: any) => p.name?.toLowerCase() === description.trim().toLowerCase());
        if (matchedProduct) {
            const productPrice = Number(matchedProduct.cost_price || matchedProduct.price || 0);
            if (productPrice > 0) {
                setValue(`items.${index}.price`, productPrice, { shouldValidate: true, shouldDirty: true });
            }
        }

        // Automatic Next Item Column Row Addition
        if (description.trim() !== "" && index === fields.length - 1) {
            append({ description: "", quantity: 1, price: 0, total: 0 });
        }
    };

    const handleSmartParse = (data: {
        vendorName?: string;
        billNumber?: string;
        date?: string;
        items?: Array<{ description: string; quantity: number; price: number }>;
    }) => {
        if (data.vendorName) setValue("vendor_name", data.vendorName, { shouldValidate: true, shouldDirty: true });
        if (data.billNumber) setValue("bill_number", data.billNumber, { shouldValidate: true, shouldDirty: true });
        if (data.date) {
            setValue("date", data.date, { shouldValidate: true, shouldDirty: true });
            setValue("due_date", getDefaultDueDate(data.date), { shouldValidate: true, shouldDirty: true });
        }

        if (data.items && data.items.length > 0) {
            const mappedItems = data.items.map(item => ({
                description: item.description,
                quantity: item.quantity || 1,
                price: item.price || 0,
                total: (item.quantity || 1) * (item.price || 0)
            }));
            setValue("items", mappedItems, { shouldValidate: true, shouldDirty: true });
        }

        toast({
            title: "AI Magic ✨",
            description: "Bill fields populated from your request.",
        });
    };

    const createPurchaseMutation = useMutation({
        mutationFn: async (values: PurchaseFormValues) => {
            if (!user) throw new Error("User not authenticated");

            // Filter out empty trailing item rows
            const validItems = values.items.filter(it => it.description.trim() !== "");
            const finalItemsList = validItems.length > 0 ? validItems : values.items;

            const purchaseId = purchaseToEdit ? purchaseToEdit.id : uuidv4();
            const calcSubtotal = finalItemsList.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
            const calcTaxAmount = (calcSubtotal * Number(values.tax_rate || 0)) / 100;
            const calcTotalAmount = Math.max(0, calcSubtotal + calcTaxAmount - Number(values.discount_amount || 0));
            
            // Amount Paid Calculation: Blank / 0 = Unpaid
            const calcAmountPaid = Number(values.amount_paid || 0);
            const calcBalanceDue = Math.max(0, calcTotalAmount - calcAmountPaid);
            
            let calcStatus: 'paid' | 'pending' | 'overdue' = 'paid';
            if (calcAmountPaid >= calcTotalAmount && calcTotalAmount > 0) {
                calcStatus = 'paid';
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(values.due_date || getDefaultDueDate());
                due.setHours(0, 0, 0, 0);
                calcStatus = due < today ? 'overdue' : 'pending';
            }

            const purchaseData = {
                id: purchaseId,
                user_id: user.id,
                bill_number: values.bill_number || `BILL-${Date.now().toString().slice(-6)}`,
                vendor_name: values.vendor_name,
                vendor_gstin: values.vendor_gstin || null,
                place_of_supply: values.place_of_supply || (values.vendor_gstin ? values.vendor_gstin.substring(0, 2) : null),
                date: values.date,
                due_date: values.due_date,
                amount_paid: calcAmountPaid,
                balance_due: calcBalanceDue,
                status: calcStatus,
                tax_rate: Number(values.tax_rate || 0),
                tax_amount: calcTaxAmount,
                discount_amount: Number(values.discount_amount || 0),
                subtotal: calcSubtotal,
                total_amount: calcTotalAmount,
                items: finalItemsList.map(item => ({
                    ...item,
                    quantity: Number(item.quantity || 1),
                    price: Number(item.price || 0),
                    total: Number(item.quantity || 1) * Number(item.price || 0)
                }))
            };

            // Auto-Save Vendor to Parties Directory if not already present
            if (values.vendor_name?.trim()) {
                const existingVendor = vendorParties.find((p: any) => p.name?.toLowerCase() === values.vendor_name.trim().toLowerCase());
                if (!existingVendor) {
                    const partyId = uuidv4();
                    await offlineMutate({
                        table: "parties",
                        action: "insert",
                        recordId: partyId,
                        payload: {
                            id: partyId,
                            user_id: user.id,
                            name: values.vendor_name.trim(),
                            type: "vendor",
                            gst_number: values.vendor_gstin || null
                        },
                        userId: user.id
                    });
                }
            }

            const productSyncs: any[] = [];
            const cachedProducts: any[] = queryClient.getQueryData(["products", user.id]) || products || [];

            // Safe DB Saver with schema fallback (prevents column missing errors on Supabase DB)
            const savePurchaseToDB = async (action: "insert" | "update", rId: string, pData: any) => {
                try {
                    const res = await offlineMutate({
                        table: "purchases",
                        action,
                        recordId: rId,
                        payload: pData,
                        userId: user.id
                    });
                    if (!res.error) return res;
                } catch (err: any) {
                    console.warn("Full purchases schema insert threw exception, falling back to core DB schema:", err);
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
                    items: pData.items
                };

                return await offlineMutate({
                    table: "purchases",
                    action,
                    recordId: rId,
                    payload: corePayload,
                    userId: user.id
                });
            };

            if (purchaseToEdit) {
                const { error } = await savePurchaseToDB("update", purchaseToEdit.id, purchaseData);
                if (error) throw error;
            } else {
                const { error: purchaseError } = await savePurchaseToDB("insert", purchaseId, purchaseData);
                if (purchaseError) throw purchaseError;

                // Sync inventory stock for purchased items
                for (const item of finalItemsList) {
                    if (!item.description?.trim()) continue;

                    const existingProduct = cachedProducts.find((p: any) => p.name?.toLowerCase() === item.description.trim().toLowerCase());

                    if (existingProduct) {
                        const newQty = Number(existingProduct.stock_quantity || 0) + Number(item.quantity || 1);
                        const { error: updateError } = await offlineMutate({
                            table: "products",
                            action: "update",
                            recordId: existingProduct.id,
                            payload: { stock_quantity: newQty },
                            userId: user.id
                        });
                        if (updateError) throw updateError;
                        productSyncs.push({
                            id: existingProduct.id,
                            name: item.description.trim(),
                            isNew: false,
                            quantity: Number(item.quantity),
                            price: Number(item.price)
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
                                unit: "pc",
                            },
                            userId: user.id
                        });
                        if (insertProdError) throw insertProdError;
                        productSyncs.push({
                            id: productId,
                            name: item.description.trim(),
                            isNew: true,
                            quantity: Number(item.quantity),
                            price: Number(item.price)
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
                    return old ? old.map((p: any) => p.id === purchaseToEdit.id ? { ...p, ...purchaseData } : p) : [purchaseData];
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
                                unit: "pc"
                            });
                        } else {
                            const idx = prods.findIndex((p: any) => p.id === sync.id);
                            if (idx !== -1) {
                                prods[idx] = {
                                    ...prods[idx],
                                    stock_quantity: Number(prods[idx].stock_quantity || 0) + sync.quantity
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
                description: purchaseData.balance_due > 0 
                    ? `Saved bill. Balance due of ${formatCurrency(purchaseData.balance_due)} added to ${purchaseData.vendor_name}.`
                    : "Purchase saved and paid in full."
            });
            onOpenChange(false);
            reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error Recording Purchase",
                description: error?.message || "Failed to save purchase bill.",
                variant: "destructive"
            });
        }
    });

    const onSubmit = (data: PurchaseFormValues) => {
        createPurchaseMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[92vh] flex flex-col p-6">
                <DialogHeader className="pb-3 border-b">
                    <DialogTitle className="text-xl font-bold flex items-center justify-between">
                        <span>{purchaseToEdit ? "Edit Purchase Bill" : "Record New Purchase"}</span>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 pr-3 -mr-3 my-2">
                        <div className="space-y-6 py-2">
                            {/* AI Smart Fill */}
                            {!purchaseToEdit && (
                                <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 p-3.5 rounded-xl">
                                    <Label className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                                        <Wand2 className="w-3.5 h-3.5 text-violet-500 animate-pulse" /> AI Smart Fill Bill
                                    </Label>
                                    <SmartPurchaseInput onParse={handleSmartParse} />
                                </div>
                            )}

                            {/* Bill Header Info (Ref, Bill Date, Due Date) */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Bill Ref / Inv #</Label>
                                    <Input {...register("bill_number")} placeholder="e.g. BILL-001" className="h-9 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Bill Date *</Label>
                                    <Input 
                                        type="date" 
                                        {...register("date", { required: true })} 
                                        onChange={(e) => handleBillDateChange(e.target.value)}
                                        className="h-9 text-xs" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Payment Due Date</Label>
                                    <Input type="date" {...register("due_date")} className="h-9 text-xs" />
                                </div>
                            </div>

                            {/* Vendor Name (Auto-adds to Parties) */}
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Vendor / Supplier Name *</Label>
                                <Input
                                    {...register("vendor_name", { required: "Vendor name is required" })}
                                    placeholder="Enter or select vendor name"
                                    list="vendor-list"
                                    className="h-9 text-xs"
                                />
                                <datalist id="vendor-list">
                                    {vendorParties.map((party: any) => (
                                        <option key={party.id} value={party.name} />
                                    ))}
                                </datalist>
                                {errors.vendor_name && <span className="text-rose-500 text-xs font-medium">{errors.vendor_name.message}</span>}
                            </div>
                            
                            {/* Vendor GST & Place of Supply */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Vendor GSTIN (Optional)</Label>
                                    <Input 
                                        {...register("vendor_gstin")} 
                                        placeholder="15-digit GSTIN" 
                                        maxLength={15}
                                        className="h-9 text-xs uppercase"
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            setValue("vendor_gstin", val);
                                            if (val.length >= 2 && !watch("place_of_supply")) {
                                                setValue("place_of_supply", val.substring(0, 2));
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Place of Supply (State Code)</Label>
                                    <Input {...register("place_of_supply")} placeholder="e.g. 27, 07, 29" maxLength={2} className="h-9 text-xs" />
                                </div>
                            </div>

                            {/* Items / Services Table with Auto-Append Next Row */}
                            <div className="space-y-2.5 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Purchase Items</Label>
                                        <p className="text-[10px] text-slate-400">Typing a product name automatically adds the next item row</p>
                                    </div>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => append({ description: "", quantity: 1, price: 0, total: 0 })}
                                        className="h-7 text-xs font-bold gap-1 border-dashed"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Row
                                    </Button>
                                </div>

                                <datalist id="products-list">
                                    {products.map((prod: any) => (
                                        <option key={prod.id} value={prod.name}>
                                            {formatCurrency(prod.cost_price || prod.price || 0)}
                                        </option>
                                    ))}
                                </datalist>

                                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                    <div className="col-span-5">Product Name</div>
                                    <div className="col-span-2 text-center">Qty</div>
                                    <div className="col-span-2 text-right">Price</div>
                                    <div className="col-span-2 text-right">Total</div>
                                    <div className="col-span-1"></div>
                                </div>

                                <div className="space-y-2">
                                    {fields.map((field, index) => {
                                        const qty = Number(watchItems[index]?.quantity || 0);
                                        const price = Number(watchItems[index]?.price || 0);
                                        const itemTotal = qty * price;

                                        return (
                                            <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <div className="col-span-5">
                                                    <Input 
                                                        {...register(`items.${index}.description` as const)} 
                                                        placeholder={`Item ${index + 1} product name`} 
                                                        list="products-list"
                                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                                        onChange={(e) => handleItemDescriptionChange(index, e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input 
                                                        type="number" 
                                                        {...register(`items.${index}.quantity` as const, { valueAsNumber: true })} 
                                                        placeholder="Qty" 
                                                        min="1" 
                                                        step="1" 
                                                        className="h-8 text-xs text-center bg-white dark:bg-slate-900"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input 
                                                        type="number" 
                                                        {...register(`items.${index}.price` as const, { valueAsNumber: true })} 
                                                        placeholder="Price" 
                                                        min="0" 
                                                        step="0.01" 
                                                        className="h-8 text-xs text-right bg-white dark:bg-slate-900"
                                                    />
                                                </div>
                                                <div className="col-span-2 text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {formatCurrency(itemTotal)}
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40" 
                                                        onClick={() => {
                                                            if (fields.length > 1) {
                                                                remove(index);
                                                            } else {
                                                                setValue(`items.${index}.description`, "");
                                                                setValue(`items.${index}.quantity`, 1);
                                                                setValue(`items.${index}.price`, 0);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tax & Discount Breakdown */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">GST Tax Rate (%)</Label>
                                    <select
                                        {...register("tax_rate", { valueAsNumber: true })}
                                        className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value={0}>0% (Exempt)</option>
                                        <option value={5}>5% GST</option>
                                        <option value={12}>12% GST</option>
                                        <option value={18}>18% GST</option>
                                        <option value={28}>28% GST</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Discount Amount ({currency.symbol})</Label>
                                    <Input 
                                        type="number" 
                                        {...register("discount_amount", { valueAsNumber: true })} 
                                        placeholder="0.00" 
                                        min="0" 
                                        step="0.01"
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Payment Status Option (Paid or Unpaid) */}
                            <div className="bg-slate-50 dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Payment Status</Label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleStatusToggle('paid')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                                watchPaymentStatus === 'paid'
                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 border text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                            }`}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleStatusToggle('unpaid')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                                watchPaymentStatus === 'unpaid'
                                                    ? 'bg-amber-500 text-white shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 border text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Clock className="w-3.5 h-3.5" /> Unpaid / Non-Paid
                                        </button>
                                    </div>
                                </div>

                                {/* Amount Paid Field with Partial Payment Support */}
                                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs font-bold">Amount Paid ({currency.symbol})</Label>
                                        <span className="text-[11px] text-slate-400">Leave blank / 0 for Unpaid, or enter partial payment</span>
                                    </div>
                                    <Input 
                                        type="number"
                                        {...register("amount_paid", { valueAsNumber: true })}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className="h-9 text-sm font-bold bg-white dark:bg-slate-900"
                                    />
                                </div>

                                {/* Dynamic Settlement Breakdown */}
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Subtotal</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(subtotal)}</span>
                                    </div>
                                    {watchTaxRate > 0 && (
                                        <div className="flex justify-between text-slate-500">
                                            <span>GST ({watchTaxRate}%)</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">+{formatCurrency(taxAmount)}</span>
                                        </div>
                                    )}
                                    {watchDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                            <span>Discount</span>
                                            <span className="font-semibold">-{formatCurrency(watchDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-extrabold text-sm pt-1.5 text-slate-900 dark:text-white">
                                        <span>Grand Total</span>
                                        <span className="text-primary text-base">{formatCurrency(finalTotalAmount)}</span>
                                    </div>
                                    
                                    {/* Remaining Balance Due info */}
                                    <div className="flex justify-between items-center font-bold text-xs pt-1.5 border-t border-dashed">
                                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                                            Balance Added to Party Ledger:
                                        </span>
                                        <span className={balanceDue > 0 ? "text-amber-600 dark:text-amber-400 text-sm" : "text-emerald-600 dark:text-emerald-400"}>
                                            {formatCurrency(balanceDue)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="pt-3 border-t gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs font-bold">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createPurchaseMutation.isPending} className="h-9 text-xs font-bold gap-1.5">
                            {createPurchaseMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            {purchaseToEdit ? "Update Purchase" : "Save Purchase"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};