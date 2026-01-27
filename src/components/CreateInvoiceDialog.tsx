import { useState, useEffect } from "react";
import { PartySelect } from "@/components/PartySelect";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Calendar, User, Phone, Mail, Hash, Receipt, Box, Percent } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";


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
    party_id?: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    invoice_number: string;
    date: string;
    items: InvoiceItem[];
    tax_rate: number;
    overall_discount: number;
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
            overall_discount: 0
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    // --- Watchers ---
    const watchItems = watch("items");
    const watchTaxRate = watch("tax_rate");
    const watchOverallDiscount = watch("overall_discount");

    // --- Effects & Queries ---
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
                overall_discount: invoiceToEdit.overall_discount || 0
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
                overall_discount: 0
            });
        }
    }, [open, invoiceToEdit, reset]);

    const { data: lastInvoiceNumber } = useQuery({
        queryKey: ["last-invoice-number"],
        queryFn: async () => {
            if (invoiceToEdit) return null;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase
                .from("sales")
                .select("invoice_number")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            return data?.invoice_number;
        },
        enabled: open && !invoiceToEdit,
    });

    useEffect(() => {
        if (open && !invoiceToEdit) {
            if (lastInvoiceNumber) {
                const numericPart = parseInt(lastInvoiceNumber.replace(/\D/g, ""));
                setValue("invoice_number", !isNaN(numericPart) ? (numericPart + 1).toString() : "1");
            } else {
                setValue("invoice_number", "1");
            }
        }
    }, [open, lastInvoiceNumber, setValue, invoiceToEdit]);

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

    // --- Calculations ---
    const subtotal = watchItems.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const discPercent = Number(item.discount) || 0;
        return sum + ((qty * price) * (1 - (discPercent / 100)));
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
                .select("business_name, gst_number, business_address, business_phone, signature_url")
                .eq("user_id", user.id)
                .single();

            const processedItems = values.items.map(item => ({
                ...item,
                total: (Number(item.quantity) * Number(item.price)) * (1 - (Number(item.discount) / 100))
            }));

            const saleData = {
                user_id: user.id,
                party_id: values.party_id,
                invoice_number: values.invoice_number,
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                customer_email: values.customer_email,
                date: values.date,
                items: processedItems,
                subtotal: subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                status: "paid",
                payment_method: "cash",
            };

            const businessDetails = profileData ? {
                name: profileData.business_name || "Business Name",
                address: profileData.business_address,
                phone: profileData.business_phone,
                gst: profileData.gst_number,
                signature_url: profileData.signature_url
            } : undefined;

            const pdfData = {
                invoice_number: values.invoice_number,
                date: values.date,
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                customer_email: values.customer_email,
                items: processedItems,
                subtotal: subtotal,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                business_details: businessDetails
            };

            if (invoiceToEdit) {
                const { error } = await supabase.from("sales" as any).update(saleData).eq("id", invoiceToEdit.id);
                if (error) throw error;
                return { ...values, pdfData };
            } else {
                const { error } = await supabase.from("sales" as any).insert(saleData);
                if (error) throw error;
                for (const item of values.items) {
                    const product = (products as any[]).find((p: any) => p.name === item.description);
                    if (product) {
                        const newStock = (Number(product.stock_quantity) || 0) - (Number(item.quantity) || 0);
                        await supabase.from("products" as any).update({ stock_quantity: newStock }).eq("id", product.id);
                    }
                }
                return { ...values, pdfData };
            }
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["last-invoice-number"] });

            toast({
                title: invoiceToEdit ? "✅ Updated" : "✅ Created",
                description: `Invoice ${data.invoice_number} processed.`,
            });
            onOpenChange(false);
            reset();
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const onSubmit = (data: InvoiceFormValues) => {
        createInvoiceMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* FIXED: Added h-[90vh] to force a fixed height so internal scroll works */}
            <DialogContent className="w-full sm:max-w-5xl h-[90vh] flex flex-col p-0 bg-background gap-0 overflow-hidden">

                {/* 1. Header (Sticky Top) */}
                <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <Receipt className="w-5 h-5 text-primary" />
                        {invoiceToEdit ? "Edit Invoice" : "New Invoice"}
                    </DialogTitle>
                </DialogHeader>

                {/* 2. Scrollable Content Area */}
                {/* min-h-0 is CRITICAL for flexbox nested scrolling */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">

                    {/* The Scroll Container: Removed ScrollArea, used native overflow-y-auto */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* --- SECTION 1: Top Inputs (Grid Layout) --- */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Invoice Info (Left Col) */}
                            <div className="md:col-span-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <Hash className="w-3 h-3" /> Invoice No.
                                        </Label>
                                        <Input
                                            {...register("invoice_number", { required: "Required" })}
                                            className="font-mono font-bold bg-muted/30"
                                            placeholder="001"
                                        />
                                        {errors.invoice_number && <span className="text-red-500 text-xs">{errors.invoice_number.message}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Date
                                        </Label>
                                        <Input type="date" {...register("date")} />
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info (Right Col) */}
                            <div className="md:col-span-8 space-y-4 border rounded-lg p-4 bg-muted/10">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                        <User className="w-3 h-3" /> Customer Details
                                    </Label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="flex-1">
                                            <PartySelect
                                                type="customer"
                                                value={watch("party_id")}
                                                onChange={(id, party) => {
                                                    setValue("party_id", id);
                                                    if (party) {
                                                        setValue("customer_name", party.name);
                                                        setValue("customer_phone", party.phone || "");
                                                        setValue("customer_email", party.email || "");
                                                    }
                                                }}
                                                placeholder="Search or Select Customer"
                                            />
                                        </div>
                                        <Input
                                            className="flex-1"
                                            {...register("customer_name", { required: true })}
                                            placeholder="Customer Name"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="relative">
                                        <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-9" {...register("customer_phone")} placeholder="Phone Number" />
                                    </div>
                                    <div className="relative">
                                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-9" {...register("customer_email")} placeholder="Email (Optional)" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* --- SECTION 2: Items (Responsive Grid) --- */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-bold flex items-center gap-2">
                                    <Box className="w-4 h-4" /> Items
                                </Label>
                                <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => append({ description: "", quantity: 1, price: 0, discount: 0, total: 0 })}>
                                    <Plus className="w-3 h-3 mr-2" /> Add Item
                                </Button>
                            </div>

                            {/* Desktop Header */}
                            <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-2 bg-muted/50 rounded-md text-xs font-semibold uppercase text-muted-foreground">
                                <div className="col-span-5">Product / Description</div>
                                <div className="col-span-2">Qty</div>
                                <div className="col-span-2">Price</div>
                                <div className="col-span-2">Disc %</div>
                                <div className="col-span-1 text-center">Action</div>
                            </div>

                            <div className="space-y-4 md:space-y-2">
                                {fields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="grid grid-cols-12 gap-3 p-3 border rounded-lg md:border-none md:p-0 bg-card md:bg-transparent items-start shadow-sm md:shadow-none"
                                    >
                                        <div className="col-span-12 md:col-span-5 space-y-1">
                                            <Label className="md:hidden text-xs text-muted-foreground">Description</Label>
                                            <Input
                                                {...register(`items.${index}.description` as const, { required: true })}
                                                placeholder="Item name"
                                                list={`products-list-${index}`}
                                                onChange={(e) => handleProductSelect(index, e.target.value)}
                                            />
                                            <datalist id={`products-list-${index}`}>
                                                {products.map((product: any) => <option key={product.id} value={product.name} />)}
                                            </datalist>
                                        </div>

                                        <div className="col-span-4 md:col-span-2 space-y-1">
                                            <Label className="md:hidden text-xs text-muted-foreground">Qty</Label>
                                            <Input type="number" {...register(`items.${index}.quantity` as const)} placeholder="1" min="1" />
                                        </div>

                                        <div className="col-span-4 md:col-span-2 space-y-1">
                                            <Label className="md:hidden text-xs text-muted-foreground">Price</Label>
                                            <Input type="number" {...register(`items.${index}.price` as const)} placeholder="0.00" min="0" step="0.01" />
                                        </div>

                                        <div className="col-span-3 md:col-span-2 space-y-1">
                                            <Label className="md:hidden text-xs text-muted-foreground">Disc %</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    {...register(`items.${index}.discount` as const)}
                                                    placeholder="0"
                                                    min="0" max="100"
                                                    className="pr-5"
                                                />
                                                <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">%</span>
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-1 flex justify-center pt-6 md:pt-0">
                                            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-9 w-9" onClick={() => remove(index)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- SECTION 3: Footer & Totals (Sticky Bottom) --- */}
                    {/* shrink-0 ensures this doesn't get squashed if screen is tiny */}
                    <div className="shrink-0 border-t bg-muted/20 p-6">
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            <div className="hidden lg:block flex-1 text-sm text-muted-foreground">
                                <p>Ensure all product details are correct before saving.</p>
                                <p>Stock will be deducted automatically.</p>
                            </div>

                            <Card className="w-full lg:w-96 shadow-sm border-none ring-1 ring-border bg-card">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                                    </div>

                                    <div className="flex justify-between items-center gap-4 text-sm">
                                        <span className="text-muted-foreground whitespace-nowrap">Discount</span>
                                        <div className="flex items-center gap-2 justify-end w-full">
                                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                                -{formatCurrency(overallDiscountAmount)}
                                            </span>
                                            <div className="relative w-24">
                                                <Input
                                                    type="number"
                                                    className="h-8 pr-7 text-right"
                                                    {...register("overall_discount")}
                                                    min="0" max="100"
                                                />
                                                <Percent className="w-3 h-3 absolute right-2.5 top-2.5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center gap-4 text-sm">
                                        <span className="text-muted-foreground">Tax</span>
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                                +{formatCurrency(taxAmount)}
                                            </span>
                                            <div className="relative w-24">
                                                <Input
                                                    type="number"
                                                    className="h-8 pr-7 text-right"
                                                    {...register("tax_rate")}
                                                    min="0" max="100"
                                                />
                                                <Percent className="w-3 h-3 absolute right-2.5 top-2.5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="my-2" />

                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg">Total</span>
                                        <span className="font-bold text-xl text-primary">{formatCurrency(totalAmount)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
                            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                size="lg"
                                disabled={createInvoiceMutation.isPending}
                                className="w-full sm:w-auto"
                            >
                                {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {invoiceToEdit ? "Update Invoice" : "Create Invoice"}
                            </Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>

        </Dialog>
    );
};