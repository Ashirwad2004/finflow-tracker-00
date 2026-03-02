import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, User, Calendar, Receipt, DollarSign, Percent, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
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

    // Fetch Parties for Auto-complete
    const { data: parties = [] } = useQuery({
        queryKey: ["invoice-parties"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const { data } = await supabase.from("parties" as any)
                .select("*")
                .eq("user_id", user.id)
                .in("type", ["customer", "both"]);
            return data || [];
        },
        enabled: open
    });

    const handleCustomerSelect = (customerName: string) => {
        const party = parties.find((p: any) => p.name === customerName);
        if (party) {
            if (party.phone && !watch("customer_phone")) setValue("customer_phone", party.phone, { shouldValidate: true, shouldDirty: true });
            if (party.email && !watch("customer_email")) setValue("customer_email", party.email, { shouldValidate: true, shouldDirty: true });
        }
    };

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
                // If editing, check if changed invoice number conflicts with an existing one
                if (invoiceToEdit.invoice_number !== values.invoice_number) {
                    const { data: existingInvoice } = await supabase
                        .from("sales")
                        .select("id")
                        .eq("user_id", user.id)
                        .eq("invoice_number", values.invoice_number)
                        .limit(1);

                    if (existingInvoice && existingInvoice.length > 0) {
                        throw new Error(`An invoice with number "${values.invoice_number}" already exists.`);
                    }
                }

                const { error } = await supabase.from("sales" as any).update(saleData).eq("id", invoiceToEdit.id);
                if (error) throw error;
                return { ...values, items: processedItems, profile: profileData, discountAmountVal: overallDiscountAmount, id: invoiceToEdit.id };
            } else {
                // If creating, check if invoice number conflicts
                const { data: existingInvoice } = await supabase
                    .from("sales")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("invoice_number", values.invoice_number)
                    .limit(1);

                if (existingInvoice && existingInvoice.length > 0) {
                    throw new Error(`An invoice with number "${values.invoice_number}" already exists.`);
                }

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
            <DialogContent className="sm:max-w-[1100px] max-h-[90vh] p-0 flex flex-col bg-background border-slate-200 shadow-xl overflow-hidden rounded-md">
                <DialogHeader className="px-8 py-5 border-b border-border/60 bg-slate-50/50">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-800">
                            {invoiceToEdit ? "Edit Invoice" : "New Invoice"}
                        </DialogTitle>
                        <div className="flex items-center space-x-3">
                            <span className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${watch("status") === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                {watch("status") === 'paid' ? 'PAID' : 'PENDING'}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto flex flex-col">
                    <div className="flex-1 px-8 py-6 space-y-10">
                        {/* Header Section: Customer & Meta */}
                        <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-16">
                            {/* Bill To */}
                            <div className="flex-1 max-w-md space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-100 pb-2">Bill To</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-700">Customer Name <span className="text-destructive">*</span></Label>
                                        <Input
                                            className="h-9 rounded-sm border-slate-300 bg-white"
                                            {...register("customer_name", { required: "Customer name is required" })}
                                            placeholder="Select or enter customer"
                                            list="customer-list"
                                            onChange={(e) => {
                                                register("customer_name").onChange(e);
                                                handleCustomerSelect(e.target.value);
                                            }}
                                        />
                                        <datalist id="customer-list">
                                            {parties.map((party: any) => (
                                                <option key={party.id} value={party.name} />
                                            ))}
                                        </datalist>
                                        {errors.customer_name && <span className="text-destructive text-xs block">{errors.customer_name.message}</span>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-slate-700">Phone</Label>
                                            <Input className="h-9 rounded-sm border-slate-300 bg-white" {...register("customer_phone")} placeholder="Phone number" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-slate-700">Email</Label>
                                            <Input className="h-9 rounded-sm border-slate-300 bg-white" {...register("customer_email")} placeholder="Email address" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Meta */}
                            <div className="w-full md:w-[280px] space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-100 pb-2">Invoice Details</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium text-slate-600">Invoice No.</Label>
                                        <div className="w-[140px] relative">
                                            <span className="absolute left-2.5 top-2 text-slate-400 text-sm">#</span>
                                            <Input
                                                {...register("invoice_number", { required: "Required" })}
                                                className="h-9 pl-6 rounded-sm border-slate-300 bg-white text-right font-medium"
                                            />
                                            {errors.invoice_number && <span className="text-destructive text-[10px] absolute -bottom-4 right-0">{errors.invoice_number.message}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium text-slate-600">Date</Label>
                                        <div className="w-[140px]">
                                            <Input
                                                type="date"
                                                {...register("date")}
                                                className="h-9 rounded-sm border-slate-300 bg-white text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <Label className="text-xs font-medium text-slate-600">Status</Label>
                                        <div className="w-[140px]">
                                            <select
                                                {...register("status")}
                                                className="flex h-9 w-full rounded-sm border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="paid">Paid</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="space-y-2">
                            {errors.items && !Array.isArray(errors.items) && (
                                <p className="text-destructive text-sm mb-2">{(errors.items as any).message}</p>
                            )}

                            <div className="border border-slate-200 rounded-sm bg-white overflow-hidden">
                                {/* Table Header */}
                                <div className="hidden sm:grid grid-cols-[1fr_100px_120px_100px_120px_40px] gap-0 border-b border-slate-200 bg-slate-100/50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <div className="py-2.5 px-3">Item Description</div>
                                    <div className="py-2.5 px-3 border-l border-slate-200 text-right">Qty</div>
                                    <div className="py-2.5 px-3 border-l border-slate-200 text-right">Rate</div>
                                    <div className="py-2.5 px-3 border-l border-slate-200 text-right">Disc %</div>
                                    <div className="py-2.5 px-3 border-l border-slate-200 text-right">Amount</div>
                                    <div className="py-2.5 px-0 border-l border-slate-200 text-center"></div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-slate-100">
                                    {fields.map((field, index) => {
                                        const qty = watch(`items.${index}.quantity`) || 0;
                                        const price = watch(`items.${index}.price`) || 0;
                                        const disc = watch(`items.${index}.discount`) || 0;
                                        const lineTotal = (qty * price) * (1 - disc / 100);

                                        return (
                                            <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_100px_120px_40px] gap-1 sm:gap-0 p-3 sm:p-0 items-start sm:items-stretch bg-white">

                                                {/* Mobile Labels */}
                                                <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">Item Description</div>
                                                <div className="sm:p-0">
                                                    <Input
                                                        className={`h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 bg-transparent focus-visible:ring-1 focus-visible:ring-inset ${errors.items?.[index]?.description ? "border-destructive sm:border-destructive sm:ring-1 sm:ring-inset sm:ring-destructive/50" : ""}`}
                                                        {...register(`items.${index}.description` as const, { required: true })}
                                                        placeholder="Enter item description"
                                                        list={`products-list-${index}`}
                                                        onChange={(e) => {
                                                            register(`items.${index}.description`).onChange(e);
                                                            handleProductSelect(index, e.target.value);
                                                        }}
                                                    />
                                                    <datalist id={`products-list-${index}`}>
                                                        {products.map((p: any) => <option key={p.id} value={p.name} />)}
                                                    </datalist>
                                                </div>

                                                <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">Quantity</div>
                                                <div className="sm:p-0">
                                                    <Input
                                                        type="number"
                                                        className="h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 text-right bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                                                        {...register(`items.${index}.quantity` as const, { required: true, min: 1 })}
                                                        min="1"
                                                    />
                                                </div>

                                                <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">Rate</div>
                                                <div className="sm:p-0">
                                                    <Input
                                                        type="number"
                                                        className={`h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 text-right bg-transparent focus-visible:ring-1 focus-visible:ring-inset ${errors.items?.[index]?.price ? "border-destructive" : ""}`}
                                                        {...register(`items.${index}.price` as const, { required: true, valueAsNumber: true, min: 0 })}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>

                                                <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">Discount %</div>
                                                <div className="sm:p-0 relative">
                                                    <Input
                                                        type="number"
                                                        className="h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 text-right pr-6 bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                                                        {...register(`items.${index}.discount` as const)}
                                                        min="0"
                                                        max="100"
                                                    />
                                                    <Percent className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none hidden sm:block" />
                                                </div>

                                                <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">Amount</div>
                                                <div className="flex items-center justify-end px-3 sm:border-r border-slate-200 font-medium text-slate-800 text-sm h-9 sm:h-auto bg-slate-50/50">
                                                    {formatCurrency(lineTotal)}
                                                </div>

                                                <div className="flex items-center justify-center p-1 sm:p-0">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-sm"
                                                        onClick={() => remove(index)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-primary hover:bg-primary/5 text-sm font-medium px-2 h-8"
                                    onClick={() => append({ description: "", quantity: 1, price: 0, discount: 0, total: 0 })}>
                                    <Plus className="w-4 h-4 mr-1.5" /> Add Line
                                </Button>
                            </div>
                        </div>

                        {/* Bottom Section: Notes & Totals */}
                        <div className="flex flex-col md:flex-row justify-between gap-8 pt-4 pb-8 border-t border-slate-100">
                            <div className="flex-1 max-w-sm">
                                {/* Optional: Add Notes or Terms area here later if needed */}
                                <div className="p-4 bg-slate-50 rounded-sm border border-slate-100 text-xs text-slate-500 italic">
                                    Notes and payment terms will appear on the final generated document.
                                </div>
                            </div>

                            <div className="w-full md:w-[320px]">
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center text-sm px-2">
                                        <span className="text-slate-600">Subtotal</span>
                                        <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm px-2">
                                        <span className="text-slate-600">Discount</span>
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-24">
                                                <Input
                                                    type="number"
                                                    className="h-8 rounded-sm text-right pr-6 border-slate-300"
                                                    {...register("overall_discount")}
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                />
                                                <Percent className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                    {overallDiscountAmount > 0 && (
                                        <div className="flex justify-between items-center text-xs px-2 -mt-1.5 pb-2 border-b border-slate-100">
                                            <span></span>
                                            <span className="text-destructive font-medium">-{formatCurrency(overallDiscountAmount)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-sm px-2 pt-1 border-b border-slate-100 pb-3">
                                        <span className="text-slate-600">Tax</span>
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-24">
                                                <Input
                                                    type="number"
                                                    className="h-8 rounded-sm text-right pr-6 border-slate-300"
                                                    {...register("tax_rate")}
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                />
                                                <Percent className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                    {taxAmount > 0 && (
                                        <div className="flex justify-between items-center text-xs px-2 -mt-1.5 pb-2 border-b border-slate-100">
                                            <span></span>
                                            <span className="text-emerald-600 font-medium">+{formatCurrency(taxAmount)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t mt-4 bg-slate-100 p-4 rounded-b-sm border-x border-b border-slate-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-800 uppercase tracking-widest">Total Amount</span>
                                        <span className="text-xl font-bold text-slate-900 tracking-tight">
                                            {formatCurrency(totalAmount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Footer Actions */}
                        <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-20 mt-auto rounded-b-md">
                            <Button type="button" variant="outline" className="min-w-[100px] border-slate-300 bg-white" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="min-w-[140px] bg-slate-800 hover:bg-slate-900 text-white shadow-sm" disabled={createInvoiceMutation.isPending}>
                                {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {invoiceToEdit ? "Update Invoice" : "Save Invoice"}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};