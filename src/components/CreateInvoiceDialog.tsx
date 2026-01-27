import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react"; // Removed unused imports
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CreateInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceToEdit?: any;
}

interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
    discount: number;
    total: number;
}

interface InvoiceFormValues {
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    invoice_number: string;
    date: string;
    items: InvoiceItem[];
    tax_rate: number;
    overall_discount: number;
    status: "paid" | "pending"; // [NEW] Added status field
}

export const CreateInvoiceDialog = ({ open, onOpenChange, invoiceToEdit }: CreateInvoiceDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<InvoiceFormValues>({
        defaultValues: {
            customer_name: "",
            customer_phone: "",
            customer_email: "",
            invoice_number: "",
            date: new Date().toISOString().split("T")[0],
            items: [{ description: "", quantity: 1, price: 0, discount: 0, total: 0 }],
            tax_rate: 0,
            overall_discount: 0,
            status: "paid" // [NEW] Default status
        },
        mode: "onBlur" // Validate fields when the user leaves the input
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    // --- Watchers for Real-time Calculation ---
    const watchItems = watch("items");
    const watchTaxRate = watch("tax_rate");
    const watchOverallDiscount = watch("overall_discount");

    // Pre-fill form when editing
    useEffect(() => {
        if (open && invoiceToEdit) {
            const items = invoiceToEdit.items || [];
            reset({
                customer_name: invoiceToEdit.customer_name,
                customer_phone: invoiceToEdit.customer_phone,
                customer_email: invoiceToEdit.customer_email,
                invoice_number: invoiceToEdit.invoice_number,
                date: invoiceToEdit.date,
                items: items,
                tax_rate: (invoiceToEdit.tax_amount / (invoiceToEdit.subtotal || 1)) * 100,
                overall_discount: invoiceToEdit.overall_discount || 0,
                status: invoiceToEdit.status || "paid" // [NEW] Load status
            });
        } else if (open && !invoiceToEdit) {
            reset({
                customer_name: "",
                customer_phone: "",
                customer_email: "",
                invoice_number: "",
                date: new Date().toISOString().split("T")[0],
                items: [{ description: "", quantity: 1, price: 0, discount: 0, total: 0 }],
                tax_rate: 0,
                overall_discount: 0,
                status: "paid" // [NEW] Reset to default
            });
        }
    }, [open, invoiceToEdit, reset]);

    // Fetch Last Invoice Number (Only if NOT editing)
    const { data: lastInvoiceNumber } = useQuery({
        queryKey: ["last-invoice-number"],
        queryFn: async () => {
            if (invoiceToEdit) return null;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data, error } = await supabase
                .from("sales")
                .select("invoice_number")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) return null;
            return data?.invoice_number;
        },
        enabled: open && !invoiceToEdit,
    });

    // Auto-increment Invoice Number
    useEffect(() => {
        if (open && !invoiceToEdit) {
            if (lastInvoiceNumber) {
                const numericPart = parseInt(lastInvoiceNumber.replace(/\D/g, ""));
                if (!isNaN(numericPart)) {
                    setValue("invoice_number", (numericPart + 1).toString());
                } else {
                    setValue("invoice_number", "1");
                }
            } else {
                setValue("invoice_number", "1");
            }
        }
    }, [open, lastInvoiceNumber, setValue, invoiceToEdit]);

    // Fetch Products
    const { data: products = [] } = useQuery({
        queryKey: ["products", -1],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const { data } = await supabase.from("products" as any).select("*").eq("user_id", user.id);
            return data || [];
        },
        enabled: open
    });

    const handleProductSelect = (index: number, productName: string) => {
        const product = (products as any[]).find((p: any) => p.name === productName);
        if (product) setValue(`items.${index}.price`, product.price);
    };

    // --- UPDATED CALCULATIONS ---
    const subtotal = watchItems.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const discPercent = Number(item.discount) || 0;
        const itemTotal = (qty * price) * (1 - (discPercent / 100));
        return sum + itemTotal;
    }, 0);

    const overallDiscountPercent = Number(watchOverallDiscount) || 0;
    const overallDiscountAmount = (subtotal * overallDiscountPercent) / 100;
    const taxableAmount = Math.max(0, subtotal - overallDiscountAmount);
    const taxRate = Number(watchTaxRate) || 0;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const totalAmount = taxableAmount + taxAmount;

    // --- Mutation ---
    const createInvoiceMutation = useMutation({
        mutationFn: async (values: InvoiceFormValues) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data: profileData } = await supabase
                .from("profiles")
                .select("business_name, gst_number, business_address, business_phone")
                .eq("user_id", user.id)
                .single();

            const processedItems = values.items.map(item => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;
                const disc = Number(item.discount) || 0;
                return {
                    ...item,
                    total: (qty * price) * (1 - (disc / 100))
                };
            });

            const saleData = {
                user_id: user.id,
                invoice_number: values.invoice_number,
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                customer_email: values.customer_email,
                date: values.date,
                items: processedItems,
                subtotal: subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                status: values.status, // [NEW] Use selected status
                payment_method: values.status === 'paid' ? "cash" : null,
            };

            if (invoiceToEdit) {
                const { error } = await supabase.from("sales" as any).update(saleData).eq("id", invoiceToEdit.id);
                if (error) throw error;
                return { ...values, items: processedItems, profile: profileData, discountAmountVal: overallDiscountAmount, id: invoiceToEdit.id };
            } else {
                const { error } = await supabase.from("sales" as any).insert(saleData);
                if (error) throw error;

                // Update Inventory
                for (const item of values.items) {
                    const product = (products as any[]).find((p: any) => p.name === item.description);
                    if (product) {
                        const qtySold = Number(item.quantity) || 0;
                        const currentStock = Number(product.stock_quantity) || 0;
                        await supabase.from("products" as any).update({ stock_quantity: currentStock - qtySold }).eq("id", product.id);
                    }
                }
                return { ...values, items: processedItems, profile: profileData, discountAmountVal: overallDiscountAmount };
            }
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["last-invoice-number"] });
            toast({
                title: invoiceToEdit ? "✅ Invoice Updated" : "✅ Invoice Created",
                description: `Invoice ${data.invoice_number} saved successfully.`,
            });
            onOpenChange(false);
            reset();
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const onSubmit = (data: InvoiceFormValues) => {
        // Validation: Ensure there is at least one item
        if (data.items.length === 0) {
            toast({
                title: "Validation Error",
                description: "You must add at least one item to the invoice.",
                variant: "destructive"
            });
            return;
        }

        // Additional Safety Check: Ensure total isn't zero (optional, depends on your business logic)
        // If you allow 100% discount, remove this check.
        // if (totalAmount <= 0) { ... }

        createInvoiceMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{invoiceToEdit ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden gap-4">
                    {/* Customer Section */}
                    <div className="space-y-4 px-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Invoice #</Label>
                                <Input {...register("invoice_number", { required: "Invoice Number is required" })} placeholder="1" />
                                {errors.invoice_number && <span className="text-red-500 text-xs">{errors.invoice_number.message}</span>}
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" {...register("date")} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Customer Name *</Label>
                            <Input {...register("customer_name", { required: "Customer name is required" })} placeholder="Enter customer name" />
                            {errors.customer_name && <span className="text-red-500 text-xs">{errors.customer_name.message}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input {...register("customer_phone")} placeholder="Customer phone" />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input {...register("customer_email")} placeholder="Customer email" />
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Items Section */}
                    <div className="flex-1 overflow-y-auto -mr-4 pr-4 px-1 min-h-0">
                        <div className="space-y-6 pb-4 pt-2">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">Items</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, price: 0, discount: 0, total: 0 })}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Item
                                    </Button>
                                </div>

                                {/* Global Error for Items array */}
                                {errors.items && !Array.isArray(errors.items) && (
                                    <p className="text-red-500 text-sm">{(errors.items as any).message}</p>
                                )}

                                <div className="space-y-3">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-3 items-start flex-col sm:flex-row bg-muted/20 p-2 rounded-md">

                                            {/* Description Input */}
                                            <div className="flex-1 space-y-1 w-full">
                                                <Input
                                                    {...register(`items.${index}.description` as const, {
                                                        required: "Product name is required"
                                                    })}
                                                    placeholder="Product Name *"
                                                    list={`products-list-${index}`}
                                                    onChange={(e) => {
                                                        register(`items.${index}.description`).onChange(e); // Maintain react-hook-form wiring
                                                        handleProductSelect(index, e.target.value);
                                                    }}
                                                    className={errors.items?.[index]?.description ? "border-red-500" : ""}
                                                />
                                                <datalist id={`products-list-${index}`}>
                                                    {products.map((product: any) => (
                                                        <option key={product.id} value={product.name} />
                                                    ))}
                                                </datalist>
                                                {errors.items?.[index]?.description && (
                                                    <span className="text-red-500 text-[10px] block">{errors.items[index].description.message}</span>
                                                )}
                                            </div>

                                            <div className="flex gap-2 w-full sm:w-auto">
                                                {/* Quantity */}
                                                <div className="w-16 space-y-1">
                                                    <Input
                                                        type="number"
                                                        {...register(`items.${index}.quantity` as const, { required: true, min: 1 })}
                                                        placeholder="Qty"
                                                        min="1"
                                                    />
                                                </div>

                                                {/* Price - Validated Required */}
                                                <div className="w-24 space-y-1">
                                                    <Input
                                                        type="number"
                                                        {...register(`items.${index}.price` as const, {
                                                            required: "Required",
                                                            valueAsNumber: true,
                                                            min: { value: 0.01, message: "> 0" }
                                                        })}
                                                        placeholder="Price *"
                                                        min="0"
                                                        step="0.01"
                                                        className={errors.items?.[index]?.price ? "border-red-500" : ""}
                                                    />
                                                    {/* Display Price Error in a tiny font due to space */}
                                                    {errors.items?.[index]?.price && (
                                                        <span className="text-red-500 text-[10px] block truncate">
                                                            {errors.items[index].price.message}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Item Discount % */}
                                                <div className="w-16 space-y-1">
                                                    <Input
                                                        type="number"
                                                        {...register(`items.${index}.discount` as const)}
                                                        placeholder="Disc %"
                                                        min="0"
                                                        max="100"
                                                        className="bg-blue-50/50"
                                                    />
                                                </div>

                                                <Button type="button" variant="ghost" size="icon" className="text-destructive mt-0.5" onClick={() => remove(index)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals Section */}
                            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                                </div>

                                {/* Overall Discount */}
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span>Overall Discount (%)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-xs">({formatCurrency(overallDiscountAmount)})</span>
                                        <Input
                                            type="number"
                                            className="w-20 h-8 text-right bg-white"
                                            {...register("overall_discount")}
                                            min="0"
                                            max="100"
                                            placeholder="0%"
                                        />
                                    </div>
                                </div>

                                {/* Tax */}
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span>Tax Rate (%)</span>
                                        <Input
                                            type="number"
                                            className="w-16 h-8 text-right bg-white"
                                            {...register("tax_rate")}
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                    <span>{formatCurrency(taxAmount)}</span>
                                </div>

                                {/* Final Total */}
                                <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-200">
                                    <span>Grand Total</span>
                                    <span className="text-primary">{formatCurrency(totalAmount)}</span>
                                </div>

                                {/* [NEW] Payment Status Selection */}
                                <div className="pt-3 border-t border-gray-200">
                                    <Label className="mb-2 block">Payment Status</Label>
                                    <RadioGroup
                                        defaultValue="paid"
                                        value={watch("status")}
                                        onValueChange={(val) => setValue("status", val as "paid" | "pending")}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="paid" id="status-paid" />
                                            <Label htmlFor="status-paid" className="cursor-pointer text-green-600 font-medium">Paid</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="pending" id="status-pending" />
                                            <Label htmlFor="status-pending" className="cursor-pointer text-orange-500 font-medium">Pending</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t mt-auto text-sm sm:justify-between">
                        <div className="hidden sm:block text-muted-foreground text-xs self-center">
                            * Scroll to add more items
                        </div>
                        <div className="flex gap-2 justify-end w-full sm:w-auto">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={createInvoiceMutation.isPending}>
                                {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create & Print
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};