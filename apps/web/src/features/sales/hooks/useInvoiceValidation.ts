import { supabase } from "@/core/integrations/supabase/client";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { ItemSettings } from "@/core/hooks/use-item-settings";
import { InvoiceFormValues } from "./useCreateInvoiceMutation";
import { ProductItem } from "@/features/purchases/components/purchase/ProductCombobox";
import { QueryClient } from "@tanstack/react-query";
import { User } from "@supabase/supabase-js";

interface UseInvoiceValidationOptions {
    salesSettings?: SalesSettings;
    itemSettings?: ItemSettings;
    invoiceToEdit?: any;
    products: ProductItem[];
    authUser: User | null;
    queryClient: QueryClient;
    toast: any;
}

export function useInvoiceValidation({
    salesSettings,
    itemSettings,
    invoiceToEdit,
    products,
    authUser,
    queryClient,
    toast,
}: UseInvoiceValidationOptions) {
    const checkOutstandingBalance = async (customerName: string): Promise<boolean> => {
        if (!salesSettings?.warnOnOutstandingBalance || !customerName.trim()) {
            return true;
        }

        const user = authUser;
        if (!user) return true;

        let outstanding: any[] = [];
        try {
            const { data } = await supabase
                .from("sales" as any)
                .select("id, status, total_amount, invoice_number, balance_due")
                .eq("user_id", user.id)
                .eq("customer_name", customerName)
                .in("status", ["pending", "overdue", "partial"]);

            outstanding = (data as any[] | null) ?? [];
        } catch {
            const cachedSales = (queryClient.getQueryData(["sales", user.id]) as any[]) || [];
            outstanding = cachedSales.filter(
                (s: any) =>
                    s.customer_name === customerName &&
                    ["pending", "overdue", "partial"].includes(s.status)
            );
        }

        if (outstanding.length > 0) {
            const total = outstanding.reduce(
                (sum: number, inv: any) =>
                    sum + Number(inv.balance_due != null ? inv.balance_due : inv.total_amount || 0),
                0
            );

            const formatted = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
            }).format(total);

            return window.confirm(
                `⚠️ Outstanding Balance Warning\n\n"${customerName}" has ${outstanding.length} unpaid invoice(s) totalling ${formatted}.\n\nDo you still want to create a new invoice for this customer?`
            );
        }

        return true;
    };

    const validateInvoice = async (data: InvoiceFormValues): Promise<boolean> => {
        const validItems = data.items.filter(
            (item) => item.description && item.description.trim() !== ""
        );

        if (validItems.length === 0) {
            toast({
                title: "Validation Error",
                description: "Please enter at least one product description for the invoice.",
                variant: "destructive",
            });
            return false;
        }

        // Backdate prevention
        if (salesSettings?.preventBackdating && !invoiceToEdit) {
            const invoiceDate = new Date(data.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffMs = today.getTime() - invoiceDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > (salesSettings.backdatingLimitDays ?? 90)) {
                toast({
                    title: "📅 Backdating Not Allowed",
                    description: `Invoice date cannot be more than ${salesSettings.backdatingLimitDays} days in the past. Selected date is ${diffDays} days old.`,
                    variant: "destructive",
                });
                return false;
            }
        }

        // Negative stock check
        if (itemSettings?.stopSaleOnNegativeStock && !invoiceToEdit) {
            const violations: string[] = [];

            for (const item of data.items) {
                const product = products.find((p) => p.name === item.description);

                if (product) {
                    const qtySold = Number(item.quantity) || 0;
                    const currentStock = Number(product.stock_quantity) || 0;

                    if (qtySold > currentStock) {
                        violations.push(
                            `"${item.description}" — only ${currentStock} ${product.unit || "units"} in stock, you're selling ${qtySold}`
                        );
                    }
                }
            }

            if (violations.length > 0) {
                toast({
                    title: "❌ Insufficient Stock",
                    description: violations.join(" • "),
                    variant: "destructive",
                });
                return false;
            }
        }

        // Outstanding balance check
        if (!invoiceToEdit) {
            const proceed = await checkOutstandingBalance(data.customer_name);
            if (!proceed) return false;
        }

        return true;
    };

    return {
        checkOutstandingBalance,
        validateInvoice,
    };
}
