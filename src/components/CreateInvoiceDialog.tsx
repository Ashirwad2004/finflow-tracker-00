import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Calculator } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";

interface CreateInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
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
}

export const CreateInvoiceDialog = ({ open, onOpenChange }: CreateInvoiceDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { currency, formatCurrency } = useCurrency();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<InvoiceFormValues>({
        defaultValues: {
            customer_name: "",
            customer_phone: "",
            customer_email: "",
            invoice_number: `INV-${Date.now().toString().slice(-6)}`, // Simple auto-gen
            date: new Date().toISOString().split("T")[0],
            items: [{ description: "", quantity: 1, price: 0, total: 0 }],
            tax_rate: 0
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const watchItems = watch("items");
    const watchTaxRate = watch("tax_rate");

    // Fetch products for autocomplete
    const { data: products = [] } = useQuery({
        queryKey: ["products", -1],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from("products" as any)
                .select("*")
                .eq("user_id", user.id);

            if (error) {
                console.error("Error fetching products:", error);
                return [];
            }
            return data || [];
        },
        enabled: open
    });

    // Handle product selection
    const handleProductSelect = (index: number, productName: string) => {
        const product = products.find((p: any) => p.name === productName);
        if (product) {
            setValue(`items.${index}.price`, product.price);
        }
    };
    const subtotal = watchItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
    const taxAmount = (subtotal * Number(watchTaxRate)) / 100;
    const totalAmount = subtotal + taxAmount;

    // Fetch User Profile for Business Details
    const { data: profile } = useQuery({
        queryKey: ["profile", -1], // Using -1 or auth user id if available in scope, but we can just fetch it inside mutation or here
        // actually easier to fetch here if we want to pass it immediately without async fetch inside onSuccess
        enabled: false // We'll fetch ad-hoc or rely on the query above if we had the user ID. 
        // Let's simple use fetching inside the mutation or top level.
    });

    const createInvoiceMutation = useMutation({
        mutationFn: async (values: InvoiceFormValues) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Fetch profile details for PDF generation
            const { data: profileData } = await supabase
                .from("profiles")
                .select("business_name, gst_number, business_address, business_phone")
                .eq("user_id", user.id)
                .single();

            const { error } = await supabase.from("sales" as any).insert({
                user_id: user.id,
                invoice_number: values.invoice_number,
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                customer_email: values.customer_email,
                date: values.date,
                items: values.items.map(item => ({
                    ...item,
                    total: Number(item.quantity) * Number(item.price)
                })),
                subtotal: subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                status: "paid", // Default to paid for now, can add status toggle later
                payment_method: "cash"
            });

            if (error) throw error;
            return { ...values, profile: profileData };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            toast({
                title: "Invoice Created",
                description: `Invoice ${data.invoice_number} saved successfully.`
            });

            // Use the new utility for consistent PDF generation
            generateInvoicePDF({
                ...data,
                items: data.items.map(item => ({
                    ...item,
                    total: Number(item.quantity) * Number(item.price)
                })),
                subtotal: subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                // Pass Owner Details
                owner_business_name: (data.profile as any)?.business_name,
                owner_gst: (data.profile as any)?.gst_number,
                owner_address: (data.profile as any)?.business_address,
                owner_phone: (data.profile as any)?.business_phone
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

    // Removed local generatePDF to use the shared utility
    // const generatePDF = (data: InvoiceFormValues) => { ... }

    const onSubmit = (data: InvoiceFormValues) => {
        createInvoiceMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create New Invoice</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-6 py-4">
                            {/* Customer Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Invoice #</Label>
                                    <Input {...register("invoice_number", { required: true })} readOnly className="bg-muted" />
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
                                    <Label>Phone (Optional)</Label>
                                    <Input {...register("customer_phone")} placeholder="Customer phone" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email (Optional)</Label>
                                    <Input {...register("customer_email")} placeholder="Customer email" />
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">Items</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, price: 0, total: 0 })}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Item
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-3 items-start">
                                            <div className="flex-1 space-y-1">
                                                <Input
                                                    {...register(`items.${index}.description` as const, { required: true })}
                                                    placeholder="Product name or description"
                                                    list={`products-list-${index}`}
                                                    onChange={(e) => handleProductSelect(index, e.target.value)}
                                                />
                                                <datalist id={`products-list-${index}`}>
                                                    {products.map((product: any) => (
                                                        <option key={product.id} value={product.name} />
                                                    ))}
                                                </datalist>
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
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span>Tax Rate (%)</span>
                                        <Input
                                            type="number"
                                            className="w-16 h-8 text-right"
                                            {...register("tax_rate")}
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                    <span>{formatCurrency(taxAmount)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                    <span>Total</span>
                                    <span>{formatCurrency(totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={createInvoiceMutation.isPending}>
                            {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create & Print Invoice
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
