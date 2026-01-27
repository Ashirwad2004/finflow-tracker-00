import { useState, useEffect } from "react";
import { PartySelect } from "@/components/PartySelect";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    party_id?: string;
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

    const createPurchaseMutation = useMutation({
        mutationFn: async (values: PurchaseFormValues) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const purchaseData = {
                user_id: user.id,
                party_id: values.party_id,
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

            if (purchaseToEdit) {
                // UPDATE existing
                const { error } = await supabase
                    .from("purchases" as any)
                    .update(purchaseData)
                    .eq("id", purchaseToEdit.id);
                if (error) throw error;
            } else {
                // INSERT new
                const { error } = await supabase.from("purchases" as any).insert(purchaseData);
                if (error) throw error;
            }

            return values;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            toast({
                title: purchaseToEdit ? "Purchase Updated" : "Purchase Recorded",
                description: `Bill has been ${purchaseToEdit ? "updated" : "saved"} successfully.`
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
                                <div className="space-y-2">
                                    <PartySelect
                                        type="vendor"
                                        value={watch("party_id")}
                                        onChange={(id, party) => {
                                            setValue("party_id", id);
                                            if (party) setValue("vendor_name", party.name);
                                        }}
                                        placeholder="Select Vendor"
                                    />
                                    <Input {...register("vendor_name", { required: "Vendor name is required" })} placeholder="Vendor Name" />
                                </div>
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
