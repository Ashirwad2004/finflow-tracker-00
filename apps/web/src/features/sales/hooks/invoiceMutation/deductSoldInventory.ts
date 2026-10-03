import { QueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { InvoiceItem } from "./types";

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

    const isValidUUID = (id: any) =>
        typeof id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    for (const item of items) {
        if (!item.description?.trim()) continue;

        const product = (dbProducts as any[]).find(
            (p: any) =>
                isValidUUID(p.id) &&
                p.name?.trim().toLowerCase() === item.description?.trim().toLowerCase()
        );

        if (product && isValidUUID(product.id)) {
            const qtySold = Number(item.quantity) || 0;
            const currentStock = Number(product.stock_quantity) || 0;
            const updatedStock = currentStock - qtySold;

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
}
