import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/core/integrations/supabase/client";
import { offlineMutate } from "@/core/offline/apiService";
import { ProductItem } from "../components/purchase/ProductCombobox";
import { useToast } from "@/core/hooks/use-toast";

interface UsePurchaseProductsOptions {
    userId?: string;
    open: boolean;
}

export function usePurchaseProducts({ userId, open }: UsePurchaseProductsOptions) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch Products for Item Autocomplete (Scoped to User with Cache Fallback)
    const { data: dbProducts = [] } = useQuery({
        queryKey: ["products", userId],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("products")
                    .select("*")
                    .eq("user_id", userId)
                    .order("name", { ascending: true });
                if (!error && data) return data;
            } catch (err) {
                console.warn("Failed to fetch products from Supabase, falling back to cache", err);
            }
            const cached = queryClient.getQueryData<any[]>(["products", userId]);
            return cached || [];
        },
        enabled: open && !!userId,
    });

    // Fetch Recent Purchases to Auto-Learn & Suggest Any Historically Purchased Raw Materials
    const { data: historicalPurchases = [] } = useQuery({
        queryKey: ["purchases-history-items", userId],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("purchases")
                    .select("items")
                    .eq("user_id", userId)
                    .order("date", { ascending: false })
                    .limit(50);
                if (!error && data) return data;
            } catch (err) {
                console.warn("Failed to fetch historical purchases items", err);
            }
            return [];
        },
        enabled: open && !!userId,
    });

    // Merge Catalog Products and Historical Items into a Single Rich Autocomplete Pool
    const products: ProductItem[] = useMemo(() => {
        const productMap = new Map<string, ProductItem>();

        // 1. Inventory Products (Highest priority)
        (dbProducts as any[]).forEach((p: any) => {
            if (p?.name?.trim()) {
                const key = p.name.trim().toLowerCase();
                productMap.set(key, {
                    id: p.id,
                    name: p.name.trim(),
                    cost_price: Number(p.cost_price ?? p.price ?? 0),
                    price: Number(p.price ?? 0),
                    stock_quantity: Number(p.stock_quantity ?? 0),
                    unit: p.unit || "pc",
                    hsn_code: p.hsn_code || "",
                });
            }
        });

        // 2. Previously Purchased Items (Supplements items not yet registered in inventory)
        (historicalPurchases as any[]).forEach((pur: any) => {
            if (Array.isArray(pur.items)) {
                pur.items.forEach((it: any) => {
                    const itemName = (it.description || it.name || "").trim();
                    if (itemName) {
                        const key = itemName.toLowerCase();
                        if (!productMap.has(key)) {
                            productMap.set(key, {
                                id: `hist_${itemName}`,
                                name: itemName,
                                cost_price: Number(it.price || 0),
                                price: Number(it.price || 0),
                                stock_quantity: 0,
                                unit: it.unit || "pc",
                                hsn_code: it.hsn_code || "",
                            });
                        }
                    }
                });
            }
        });

        return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [dbProducts, historicalPurchases]);

    const handleProductSelect = (
        index: number,
        product: ProductItem,
        setValue: any,
        watchItems: any[],
        watchDefaultTaxRate: number | string,
        append: any,
        fieldsLength: number
    ) => {
        setValue(`items.${index}.description`, product.name, {
            shouldValidate: true,
            shouldDirty: true,
        });

        const cost = Number(product.cost_price ?? product.price ?? 0);
        if (cost > 0) {
            setValue(`items.${index}.price`, cost, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
        if (product.unit) {
            setValue(`items.${index}.unit`, product.unit, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
        if (product.hsn_code) {
            setValue(`items.${index}.hsn_code` as any, product.hsn_code, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }

        // Recalculate row total with selected product values
        const qty = Number(watchItems[index]?.quantity || 1);
        const rate = cost > 0 ? cost : Number(watchItems[index]?.price || 0);
        const discPercent = Number(watchItems[index]?.discount || 0);
        const taxRate = Number(watchItems[index]?.tax_rate ?? watchDefaultTaxRate ?? 0);
        const lineTotal = Math.max(
            0,
            qty * rate * (1 - discPercent / 100) * (1 + taxRate / 100)
        );
        setValue(`items.${index}.total`, lineTotal);

        // Auto append next item row if selecting on the last item
        if (index === fieldsLength - 1) {
            append({
                description: "",
                quantity: 1,
                price: 0,
                unit: product.unit || "pc",
                discount: 0,
                tax_rate: Number(watchDefaultTaxRate ?? 0),
                total: 0,
            });
        }
    };

    const handleQuickAddProduct = async (newProd: ProductItem) => {
        if (!userId) return;
        try {
            const isValidUUID = (id: any) =>
                typeof id === "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const recordId = isValidUUID(newProd.id) ? newProd.id : uuidv4();
            const newRecord = {
                id: recordId,
                user_id: userId,
                name: newProd.name.trim(),
                cost_price: Number(newProd.cost_price || 0),
                price: Number(newProd.price || newProd.cost_price || 0),
                stock_quantity: Number(newProd.stock_quantity || 0),
                unit: newProd.unit || "pc",
                hsn_code: newProd.hsn_code || null,
            };

            await offlineMutate({
                table: "products",
                action: "insert",
                recordId,
                payload: newRecord,
                userId,
            });

            queryClient.setQueryData(["products", userId], (old: any) => {
                return old ? [newRecord, ...old] : [newRecord];
            });

            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast({
                title: "Product saved",
                description: `"${newProd.name}" added to product catalog.`,
            });
        } catch (e) {
            console.error("Failed to quick-add product", e);
        }
    };

    const handleQuickProductSelect = (
        productName: string,
        setValue: any
    ) => {
        const product = products.find((p) => p.name === productName);
        if (product) {
            const cost = Number(product.cost_price ?? product.price ?? 0);
            setValue("quick_total_amount", cost, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
    };

    return {
        dbProducts,
        historicalPurchases,
        products,
        handleProductSelect,
        handleQuickAddProduct,
        handleQuickProductSelect,
    };
}
