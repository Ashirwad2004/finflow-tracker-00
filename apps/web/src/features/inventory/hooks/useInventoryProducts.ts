import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import { getPathFromPublicUrl } from "@/core/utils/image";
import { useToast } from "@/core/hooks/use-toast";
import { useProductsRealtime } from "@/core/hooks/useProductsRealtime";
import { v4 as uuidv4 } from "uuid";
import { Product, ProductFormValues, StockFilterType } from "../types";

export interface UseInventoryProductsOptions {
  userId: string | undefined;
  searchTerm?: string;
  stockFilter?: StockFilterType;
}

export function buildProductRecord(
  values: ProductFormValues,
  userId: string,
  baseProduct?: Partial<Product> | null
): Product {
  const parseNumOrNull = (v: any) => {
    if (v === undefined || v === null || String(v).trim() === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const parseNumOrDefault = (v: any, def: number) => {
    if (v === undefined || v === null || String(v).trim() === "") return def;
    const n = Number(v);
    return isNaN(n) ? def : n;
  };

  return {
    id: baseProduct?.id || uuidv4(),
    user_id: userId,
    name: values.name.trim(),
    price: parseNumOrDefault(values.price, 0),
    cost_price: parseNumOrNull(values.cost_price),
    stock_quantity: parseNumOrDefault(values.stock_quantity, 0),
    unit: values.unit?.trim() || "pc",
    hsn_code: values.hsn_code?.trim() || null,
    barcode: values.barcode?.trim() || null,
    barcode_type: values.barcode_type?.trim() || "code128",
    barcode_source: values.barcode_source?.trim() || "manufacturer",
    sku: values.sku?.trim() || null,
    category: values.category?.trim() || null,
    mrp: parseNumOrNull(values.mrp),
    tax_rate: parseNumOrDefault(values.tax_rate, 0),
    is_listed_online: Boolean(values.is_listed_online),
    online_description: values.online_description?.trim() || null,
    image_url: values.image_url?.trim() || null,
    rack_location: values.rack_location?.trim() || null,
    created_at: baseProduct?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function useInventoryProducts({
  userId,
  searchTerm = "",
  stockFilter = "all",
}: UseInventoryProductsOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useProductsRealtime(userId);

  // Fetch products strictly scoped to current user with Offline Fallback
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!error && data) return (data as Product[]) ?? [];
      } catch (e) {
        console.warn("[Inventory] Products fetch failed offline, falling back to cache:", e);
      }
      const cached = queryClient.getQueryData<Product[]>(["products", userId]);
      if (cached && cached.length > 0) return cached;
      const localData = await sqliteService.getAll<Product>("products", userId);
      return localData || [];
    },
    initialData: () => queryClient.getQueryData<Product[]>(["products", userId]) || undefined,
    enabled: !!userId,
  });

  // Filter products based on search and stock status (memoized for high catalog scale)
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      if (term) {
        const matchesSearch =
          product.name.toLowerCase().includes(term) ||
          (product.barcode && product.barcode.toLowerCase().includes(term)) ||
          (product.sku && product.sku.toLowerCase().includes(term)) ||
          (product.category && product.category.toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }

      if (stockFilter === "stock") {
        return product.stock_quantity > 0;
      } else if (stockFilter === "non-stock") {
        return product.stock_quantity <= 0;
      }
      return true;
    });
  }, [products, searchTerm, stockFilter]);

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (!userId) throw new Error("User ID is required.");
      const recordPayload = buildProductRecord(values, userId);
      const result = await offlineMutate({
        table: "products",
        action: "insert",
        recordId: recordPayload.id,
        payload: recordPayload,
        userId,
      });
      if (result.error) throw result.error;
      return recordPayload;
    },
    onSuccess: (newProduct: Product) => {
      queryClient.setQueryData<Product[]>(["products", userId || ""], (old) => {
        return [newProduct, ...(old || [])];
      });
      queryClient.invalidateQueries({ queryKey: ["products", userId || ""] });
      toast({
        title: "Product Added",
        description: "The product has been added to your inventory.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({
      values,
      selectedProduct,
    }: {
      values: ProductFormValues;
      selectedProduct: Product;
    }) => {
      if (!userId) throw new Error("User ID is required.");
      const recordPayload = buildProductRecord(values, userId, selectedProduct);
      const result = await offlineMutate({
        table: "products",
        action: "update",
        recordId: selectedProduct.id,
        payload: recordPayload,
        userId,
      });
      if (result.error) throw result.error;
      return recordPayload;
    },
    onSuccess: (updatedProduct: Product) => {
      queryClient.setQueryData<Product[]>(["products", userId || ""], (old) => {
        if (!old) return [];
        return old.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
      });
      queryClient.invalidateQueries({ queryKey: ["products", userId || ""] });
      toast({
        title: "Product Updated",
        description: "The product has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!userId) throw new Error("User ID is required.");
      const productToDelete = products.find((p) => p.id === productId);
      if (productToDelete) {
        const deletedItem = {
          ...productToDelete,
          type: "product",
          deleted_at: new Date().toISOString(),
        };
        const key = `recently_deleted_products_${userId}`;
        const existingStr = localStorage.getItem(key);
        const existing = existingStr ? JSON.parse(existingStr) : [];
        localStorage.setItem(key, JSON.stringify([deletedItem, ...existing]));

        // Clean up the image and thumbnail from Supabase Storage
        if (productToDelete.image_url) {
          const oldPath = getPathFromPublicUrl(productToDelete.image_url);
          if (oldPath) {
            const pathsToRemove = [oldPath];
            if (oldPath.endsWith(".webp") && !oldPath.includes("_thumb.webp")) {
              pathsToRemove.push(oldPath.replace(/\.webp$/, "_thumb.webp"));
            } else {
              const ext = oldPath.split(".").pop();
              if (ext) {
                pathsToRemove.push(oldPath.replace(`.${ext}`, `_thumb.webp`));
              }
            }
            supabase.storage
              .from("product-images")
              .remove(pathsToRemove)
              .catch((err) => console.error("Error deleting product image from storage:", err));
          }
        }
      }

      const result = await offlineMutate({
        table: "products",
        action: "delete",
        recordId: productId,
        payload: {},
        userId,
      });
      if (result.error) throw result.error;
      return productId;
    },
    onSuccess: (deletedId: string) => {
      queryClient.setQueryData<Product[]>(["products", userId || ""], (old) => {
        if (!old) return [];
        return old.filter((p) => p.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: ["products", userId || ""] });
      toast({
        title: "Product Deleted",
        description: "The product has been removed from your inventory.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    products,
    filteredProducts,
    isLoading,
    addProductMutation,
    updateProductMutation,
    deleteProductMutation,
  };
}
