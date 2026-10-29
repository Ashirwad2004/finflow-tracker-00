import { QueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { InvoiceItem } from "./types";
import { calculateInventoryDeductions } from "../../services/inventory";

interface DeductSoldInventoryParams {
    items: InvoiceItem[];
    dbProducts: any[];
    userId: string;
    queryClient: QueryClient;
    status: string;
    deductStockOnlyOnPaid?: boolean;
}

export async function deductSoldInventory({
    items,
    dbProducts,
    userId,
    queryClient,
    status,
    deductStockOnlyOnPaid,
}: DeductSoldInventoryParams): Promise<void> {
    const shouldDeduct = deductStockOnlyOnPaid ? status === "paid" : true;

    if (!shouldDeduct) return;

    for (const { product, updatedStock } of calculateInventoryDeductions(items, dbProducts)) {
        try {
            await offlineMutate({
                table: "products",
                action: "update",
                recordId: product.id,
                payload: {
                    ...product,
                    stock_quantity: updatedStock,
                },
                userId,
            });

            queryClient.setQueryData(
                ["products", userId],
                (old: any[] | undefined) => {
                    if (!old) return [];
                    return old.map((p: any) =>
                        p.id === product.id
                            ? {
                                ...p,
                                stock_quantity: updatedStock,
                            }
                            : p
                    );
                }
            );
        } catch (stockErr) {
            console.warn(
                `[CreateInvoiceDialog] Failed to deduct stock for ${product.name}:`,
                stockErr
            );
        }
    }
}
