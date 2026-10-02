import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { offlineMutate } from "@/core/offline/apiService";
import { ProductItem } from "@/features/purchases/components/purchase/ProductCombobox";
import { useToast } from "@/core/hooks/use-toast";

interface UseInvoiceProductsOptions {
    currentUserId?: string;
    authUserId?: string;
    defaultTaxRate?: number;
}

export function useInvoiceProducts({
    currentUserId,
    authUserId,
    defaultTaxRate = 0,
}: UseInvoiceProductsOptions) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch Products from DB / Offline Storage
    const { data: dbProducts = [] } = useQuery({
        queryKey: ["products", currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];
            try {
                const { data, error } = await supabase
                    .from("products" as any)
                    .select("*")
                    .eq("user_id", currentUserId)
                    .order("name", { ascending: true });

                if (!error && data && data.length > 0) {
                    sqliteService.upsertBatch("products", currentUserId, data).catch(() => {});
                    return data;
                }
            } catch (err) {
                console.warn("Failed to fetch products from Supabase, falling back to cache and sqlite", err);
            }

            const cached =
                queryClient.getQueryData<any[]>(["products", currentUserId]) ||
                queryClient.getQueryData<any[]>(["products", authUserId]) ||
                queryClient.getQueryData<any[]>(["products"]);

            if (cached && cached.length > 0) return cached;

            const localProducts = await sqliteService.getAll<any>("products", currentUserId);
            if (localProducts && localProducts.length > 0) return localProducts;

            if (authUserId && authUserId !== currentUserId) {
                const altLocal = await sqliteService.getAll<any>("products", authUserId);
                if (altLocal && altLocal.length > 0) return altLocal;
            }

            return [];
        },
        enabled: !!currentUserId,
    });

    // Fetch Recent Sales to Auto-Learn & Suggest Historically Billed Items
    const { data: historicalSales = [] } = useQuery({
        queryKey: ["sales-history-items", currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];
            try {
                const { data, error } = await supabase
                    .from("sales" as any)
                    .select("items")
                    .eq("user_id", currentUserId)
                    .order("date", { ascending: false })
                    .limit(50);
                if (!error && data) return data;
            } catch (err) {
                console.warn("Failed to fetch historical sales items", err);
            }

            try {
                const localSales = await sqliteService.getAll<any>("sales", currentUserId);
                return localSales || [];
            } catch {
                return [];
            }
        },
        enabled: !!currentUserId,
    });

    // Merge Catalog Products and Historical Items into a Single Rich Autocomplete Pool
    const products: ProductItem[] = useMemo(() => {
        const productMap = new Map<string, ProductItem>();

        // 1. Inventory Products (Highest priority)
        (dbProducts as any[]).forEach((p: any) => {
            if (!p || !p.name || typeof p.name !== "string" || !p.name.trim()) return;
            const key = p.name.toLowerCase().trim();
            productMap.set(key, {
                id: p.id || `prod-${key}`,
                name: p.name.trim(),
                cost_price: Number(p.cost_price ?? p.price ?? 0),
                price: Number(p.price ?? p.cost_price ?? 0),
                stock_quantity: Number(p.stock_quantity ?? 0),
                unit: p.unit || "pc",
                hsn_code: p.hsn_code || "",
                tax_rate: p.tax_rate !== undefined ? Number(p.tax_rate) : (p.tax !== undefined ? Number(p.tax) : undefined),
            });
        });

        // 2. Historical Items (Auto-learned items not yet in catalog)
        (historicalSales as any[]).forEach((record: any) => {
            if (Array.isArray(record?.items)) {
                record.items.forEach((it: any) => {
                    const desc = it?.description || it?.name;
                    if (!desc || typeof desc !== "string" || !desc.trim()) return;
                    const key = desc.toLowerCase().trim();
                    if (!productMap.has(key)) {
                        productMap.set(key, {
                            id: `history-${key}`,
                            name: desc.trim(),
                            price: Number(it.price || it.cost_price || 0),
                            cost_price: Number(it.cost_price || it.price || 0),
                            stock_quantity: undefined,
                            unit: it.unit || "pc",
                            hsn_code: it.hsn_code || "",
                            tax_rate: it.tax_rate !== undefined ? Number(it.tax_rate) : undefined,
                        });
                    }
                });
            }
        });

        return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [dbProducts, historicalSales]);

    const handleProductSelect = (
        index: number,
        product: ProductItem,
        setValue: any,
        watch: any,
        append: any,
        fieldsLength: number
    ) => {
        if (!product) return;

        setValue(`items.${index}.description`, product.name, {
            shouldValidate: true,
            shouldDirty: true,
        });

        const selPrice = Number(product.price ?? product.cost_price ?? 0);
        setValue(`items.${index}.price`, selPrice, {
            shouldValidate: true,
            shouldDirty: true,
        });

        if (product.hsn_code) {
            setValue(`items.${index}.hsn_code`, product.hsn_code, {
                shouldDirty: true,
            });
        }

        if (product.unit) {
            setValue(`items.${index}.unit`, product.unit, {
                shouldDirty: true,
            });
        }

        if (product.tax_rate !== undefined) {
            setValue(`items.${index}.tax_rate`, Number(product.tax_rate ?? defaultTaxRate ?? 0), {
                shouldDirty: true,
            });
        }

        // Recalculate line total
        const qty = Number(watch(`items.${index}.quantity`) || 1);
        const disc = Number(watch(`items.${index}.discount`) || 0);
        const lineTotal = Math.max(0, qty * selPrice * (1 - disc / 100));
        setValue(`items.${index}.total`, lineTotal, { shouldDirty: true });

        // Auto append next item row if selecting on the last item
        if (index === fieldsLength - 1) {
            append({
                description: "",
                quantity: 1,
                price: 0,
                discount: 0,
                tax_rate: defaultTaxRate ?? 0,
                total: 0,
                hsn_code: "",
                unit: product.unit || "pc",
            });
        }
    };

    const handleQuickAddProduct = async (newProd: ProductItem) => {
        if (!currentUserId) return;
        try {
            const isValidUUID = (id: any) =>
                typeof id === "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const recordId = isValidUUID(newProd.id) ? newProd.id : uuidv4();
            const newRecord = {
                id: recordId,
                user_id: currentUserId,
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
                userId: currentUserId,
            });

            // Update React Query cache immediately for instant dropdown inclusion
            queryClient.setQueryData(["products", currentUserId], (old: any) => {
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
        const product = (products as any[]).find(
            (p: any) => p.name === productName
        );

        if (product) {
            setValue(
                "quick_total_amount",
                product.price,
                {
                    shouldValidate: true,
                    shouldDirty: true,
                }
            );
        }
    };

    return {
        dbProducts,
        historicalSales,
        products,
        handleProductSelect,
        handleQuickAddProduct,
        handleQuickProductSelect,
    };
}
