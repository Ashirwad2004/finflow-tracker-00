import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { offlineMutate } from "@/core/offline/apiService";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/core/lib/auth";

interface RecordPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseToEdit?: any; // Add purchaseToEdit prop
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
    items: PurchaseItem[];
    attachment_url?: string;
}

export const RecordPurchaseDialog = ({ open, onOpenChange, purchaseToEdit }: RecordPurchaseDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const { user } = useAuth();

    const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<PurchaseFormValues>({
        defaultValues: {
            vendor_name: "",
            bill_number: "",
            date: new Date().toISOString().split("T")[0],
            items: [{ description: "", quantity: 1, price: 0, total: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    // Reset loop
    useEffect(() => {
        if (open && purchaseToEdit) {
            reset({
                vendor_name: purchaseToEdit.vendor_name,
                bill_number: purchaseToEdit.bill_number,
                date: purchaseToEdit.date,
                items: purchaseToEdit.items || []
            });
        } else if (open && !purchaseToEdit) {
            reset({
                vendor_name: "",
                bill_number: "",
                date: new Date().toISOString().split("T")[0],
                items: [{ description: "", quantity: 1, price: 0, total: 0 }]
            });
        }
    }, [open, purchaseToEdit, reset]);

    const watchItems = watch("items");
    const totalAmount = watchItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);

    // Fetch Parties for Auto-complete
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

    const vendorParties = parties.filter((party: any) => 
        party.type === "vendor" || party.type === "both"
    );


    const createPurchaseMutation = useMutation({
        mutationFn: async (values: PurchaseFormValues) => {
            if (!user) throw new Error("User not authenticated");

            const purchaseId = purchaseToEdit ? purchaseToEdit.id : uuidv4();
            const purchaseData = {
                id: purchaseId,
                user_id: user.id,
                bill_number: values.bill_number,
                vendor_name: values.vendor_name,
                date: values.date,
                items: values.items.map(item => ({
                    ...item,
                    total: Number(item.quantity) * Number(item.price)
                })),
                subtotal: totalAmount,
                tax_amount: 0,
                total_amount: totalAmount,
                status: "paid"
            };

            const productSyncs: any[] = [];
            const cachedProducts: any[] = queryClient.getQueryData(["products", user.id]) || [];

            if (purchaseToEdit) {
                // UPDATE existing purchase (no inventory change)
                const { error } = await offlineMutate({
                    table: "purchases",
                    action: "update",
                    recordId: purchaseToEdit.id,
                    payload: purchaseData,
                    userId: user.id
                });
                if (error) throw error;
            } else {
                // INSERT new purchase
                const { error: purchaseError } = await offlineMutate({
                    table: "purchases",
                    action: "insert",
                    recordId: purchaseId,
                    payload: purchaseData,
                    userId: user.id
                });
                if (purchaseError) throw purchaseError;

                // Sync inventory for each purchased item
                for (const item of values.items) {
                    if (!item.description.trim()) continue;

                    const existingProduct = cachedProducts.find(p => p.name?.toLowerCase() === item.description.trim().toLowerCase());

                    if (existingProduct) {
                        // Existing product → increase stock
                        const newQty = Number(existingProduct.stock_quantity) + Number(item.quantity);
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
                        // New product → create inventory entry
                        const productId = uuidv4();
                        const { error: insertProdError } = await offlineMutate({
                            table: "products",
                            action: "insert",
                            recordId: productId,
                            payload: {
                                id: productId,
                                user_id: user.id,
                                name: item.description.trim(),
                                price: Number(item.price),
                                cost_price: 0,
                                stock_quantity: Number(item.quantity),
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
            const { purchaseId, purchaseData, productSyncs, userId } = data;

            // Optimistic update for purchases
            queryClient.setQueryData(["purchases", userId], (old: any) => {
                if (purchaseToEdit) {
                    return old ? old.map((p: any) => p.id === purchaseToEdit.id ? { ...p, ...purchaseData } : p) : [purchaseData];
                } else {
                    return old ? [purchaseData, ...old] : [purchaseData];
                }
            });

            // Optimistic update for products
            if (productSyncs.length > 0) {
                queryClient.setQueryData(["products", userId], (old: any) => {
                    const products = old ? [...old] : [];
                    for (const sync of productSyncs) {
                        if (sync.isNew) {
                            products.push({
                                id: sync.id,
                                user_id: userId,
                                name: sync.name,
                                price: sync.price,
                                cost_price: 0,
                                stock_quantity: sync.quantity,
                                unit: "pc"
                            });
                        } else {
                            const idx = products.findIndex(p => p.id === sync.id);
                            if (idx !== -1) {
                                products[idx] = {
                                    ...products[idx],
                                    stock_quantity: Number(products[idx].stock_quantity) + sync.quantity
                                };
                            }
                        }
                    }
                    return products;
                });
            }

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ["purchases"] });
                queryClient.invalidateQueries({ queryKey: ["products"] });
            }

            toast({
                title: purchaseToEdit ? "Purchase Updated" : "Purchase Recorded",
                description: purchaseToEdit
                    ? "Bill has been updated successfully."
                    : "Purchase saved and inventory updated successfully."
            });
            onOpenChange(false);
            reset();
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const onSubmit = (data: PurchaseFormValues) => {
        createPurchaseMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{purchaseToEdit ? "Edit Purchase/Bill" : "Record New Purchase/Bill"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-6 py-4">
                            {/* Bill Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Bill Number / Ref</Label>
                                    <Input {...register("bill_number")} placeholder="e.g. BILL-001" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input type="date" {...register("date")} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Vendor / Supplier Name *</Label>
                                <Input
                                    {...register("vendor_name", { required: "Vendor name is required" })}
                                    placeholder="Enter vendor name"
                                    list="vendor-list"
                                />
                                <datalist id="vendor-list">
                                    {vendorParties.map((party: any) => (
                                        <option key={party.id} value={party.name} />
                                    ))}
                                </datalist>
                                {errors.vendor_name && <span className="text-red-500 text-xs">{errors.vendor_name.message}</span>}
                            </div>

                            {/* Items */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">Items / Services</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, price: 0, total: 0 })}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Item
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-3 items-start">
                                            <div className="flex-1 space-y-1">
                                                <Input {...register(`items.${index}.description` as const, { required: true })} placeholder="Item description" />
                                            </div>
                                            <div className="w-20 space-y-1">
                                                <Input type="number" {...register(`items.${index}.quantity` as const)} placeholder="Qty" min="1" step="1" />
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <Input type="number" {...register(`items.${index}.price` as const)} placeholder="Price" min="0" step="0.01" />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive mt-0.5" onClick={() => remove(index)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total Amount</span>
                                    <span>{formatCurrency(totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={createPurchaseMutation.isPending}>
                            {createPurchaseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {purchaseToEdit ? "Update Purchase" : "Save Purchase"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};