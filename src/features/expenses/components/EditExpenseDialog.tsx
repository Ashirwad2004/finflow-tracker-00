import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/core/hooks/use-toast";
import { z } from "zod";
import {
    Receipt,
    CalendarDays,
    Tag,
    Loader2,
    Building2,
    FileText
} from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useBusiness } from "@/core/contexts/BusinessContext";

/* ---------------- SCHEMAS & TYPES ---------------- */

const expenseSchema = z.object({
    description: z.string().trim().min(1),
    amount: z.number().positive(),
    category_id: z.string().uuid(),
    date: z.string(),
    // Business fields (optional/nullable)
    tax_amount: z.number().nonnegative().optional(),
    invoice_number: z.string().optional(),
    vendor_name: z.string().optional(),
    is_reimbursable: z.boolean().optional(),
});

interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
}

interface Expense {
    id: string;
    description: string;
    amount: number;
    date: string;
    categories: Category;
    bill_url?: string | null;
    tax_amount?: number | null;
    invoice_number?: string | null;
    vendor_name?: string | null;
    is_reimbursable?: boolean | null;
}

interface EditExpenseDialogProps {
    expense: Expense | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
}

export const EditExpenseDialog = ({
    expense,
    open,
    onOpenChange,
    categories,
}: EditExpenseDialogProps) => {
    const queryClient = useQueryClient();
    const { currency } = useCurrency();
    const { isBusinessMode } = useBusiness();

    // Form State
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [date, setDate] = useState("");
    const [taxAmount, setTaxAmount] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [isReimbursable, setIsReimbursable] = useState(false);

    // Initialize form when an expense is passed in
    useEffect(() => {
        if (expense) {
            setDescription(expense.description);
            setAmount(expense.amount.toString());
            setCategoryId(expense.categories?.id || "");
            setDate(expense.date);
            setTaxAmount(expense.tax_amount ? expense.tax_amount.toString() : "");
            setInvoiceNumber(expense.invoice_number || "");
            setVendorName(expense.vendor_name || "");
            setIsReimbursable(expense.is_reimbursable || false);
        }
    }, [expense]);

    /* ---------------- HANDLERS ---------------- */

    const editExpenseMutation = useMutation({
        mutationFn: async () => {
            if (!expense) throw new Error("No expense selected to edit.");

            const payload = {
                description,
                amount: parseFloat(amount),
                category_id: categoryId,
                date,
                tax_amount: taxAmount ? parseFloat(taxAmount) : null,
                invoice_number: invoiceNumber || null,
                vendor_name: vendorName || null,
                is_reimbursable: isReimbursable
            };

            const { error } = await supabase
                .from("expenses")
                .update(payload)
                .eq("id", expense.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            // Wait for any group-related expenses if necessary depending on the component using it
            queryClient.invalidateQueries({ queryKey: ["group-expenses"] });

            toast({ title: "Success", description: "Expense updated successfully." });
            onOpenChange(false);
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const handleSubmit = () => {
        try {
            expenseSchema.parse({
                description,
                amount: parseFloat(amount),
                category_id: categoryId,
                date,
                tax_amount: taxAmount ? parseFloat(taxAmount) : undefined,
                invoice_number: invoiceNumber,
                vendor_name: vendorName,
                is_reimbursable: isReimbursable
            });
            editExpenseMutation.mutate();
        } catch (e) {
            if (e instanceof z.ZodError) {
                toast({ title: "Validation Error", description: "Please check all required fields.", variant: "destructive" });
            }
        }
    };

    if (!expense) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[425px] sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Expense</DialogTitle>
                    <DialogDescription>
                        Update the details of your expense below.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-4 text-center">
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                            Expense Amount
                        </Label>
                        <div className="relative inline-block w-full">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground/50 w-8 text-center bg-transparent">
                                {currency.symbol}
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="text-center text-4xl font-bold h-16 border-0 border-b-2 border-muted focus-visible:ring-0 focus-visible:border-primary rounded-none px-8 placeholder:text-muted-foreground/20 bg-transparent"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                            <Receipt className="w-3.5 h-3.5" /> Description
                        </Label>
                        <Input
                            placeholder="What is this for?"
                            className="bg-muted/10 h-10"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {isBusinessMode && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5" /> Vendor
                                </Label>
                                <Input
                                    placeholder="Vendor Name"
                                    className="bg-muted/10 h-10"
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" /> Invoice #
                                </Label>
                                <Input
                                    placeholder="INV-001"
                                    className="bg-muted/10 h-10"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" /> Category
                            </Label>
                            <Select
                                value={categoryId}
                                onValueChange={(val) => setCategoryId(val)}
                            >
                                <SelectTrigger className="bg-muted/10 h-10">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                                {c.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                <CalendarDays className="w-3.5 h-3.5" /> Date
                            </Label>
                            <Input
                                type="date"
                                className="bg-muted/10 h-10 block w-full"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {isBusinessMode && (
                        <div className="flex flex-col gap-4 p-4 rounded-lg bg-muted/20 border border-muted/50">
                            <div className="space-y-2 w-full">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                                    Tax Amount
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                        {currency.symbol}
                                    </span>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-8 bg-background h-10"
                                        value={taxAmount}
                                        onChange={(e) => setTaxAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="reimbursable_edit"
                                    checked={isReimbursable}
                                    onCheckedChange={(checked) => setIsReimbursable(checked as boolean)}
                                />
                                <Label htmlFor="reimbursable_edit" className="cursor-pointer font-medium">Reimbursable</Label>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={editExpenseMutation.isPending}
                        className="min-w-[100px]"
                    >
                        {editExpenseMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
