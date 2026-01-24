import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Calculator } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

    // Calculations
    const subtotal = watchItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
    const taxAmount = (subtotal * Number(watchTaxRate)) / 100;
    const totalAmount = subtotal + taxAmount;

    const createInvoiceMutation = useMutation({
        mutationFn: async (values: InvoiceFormValues) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const { error } = await supabase.from("sales").insert({
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
            return values;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            toast({
                title: "Invoice Created",
                description: `Invoice ${data.invoice_number} saved successfully.`
            });
            generatePDF(data);
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

    const generatePDF = (data: InvoiceFormValues) => {
        try {
            const doc = new jsPDF();

            doc.setFontSize(20);
            doc.text("INVOICE", 14, 22);

            doc.setFontSize(10);
            doc.text(`Invoice #: ${data.invoice_number}`, 14, 30);
            doc.text(`Date: ${data.date}`, 14, 35);

            doc.text("Bill To:", 14, 45);
            doc.setFontSize(12);
            doc.text(data.customer_name, 14, 50);
            doc.setFontSize(10);
            if (data.customer_phone) doc.text(`Phone: ${data.customer_phone}`, 14, 55);

            const tableRows = data.items.map(item => [
                item.description,
                item.quantity.toString(),
                formatCurrency(item.price),
                formatCurrency(Number(item.quantity) * Number(item.price))
            ]);

            autoTable(doc, {
                head: [["Description", "Qty", "Price", "Total"]],
                body: tableRows,
                startY: 65,
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;

            doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 140, finalY);
            doc.text(`Tax (${data.tax_rate}%): ${formatCurrency(taxAmount)}`, 140, finalY + 5);
            doc.setFontSize(12);
            doc.text(`Total: ${formatCurrency(totalAmount)}`, 140, finalY + 12);

            doc.save(`Invoice-${data.invoice_number}.pdf`);
        } catch (e) {
            console.error("PDF generation failed", e);
        }
    };

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
                                                <Input {...register(`items.${index}.description` as const, { required: true })} placeholder="Description" />
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
