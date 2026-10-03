import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import apiClient from "@/core/api/apiClient";
import { toast } from "sonner";
import { LabelProductItem } from "../../components/BarcodeLabelDesignerModal";
import { POSProduct } from "../../types";
import { BarcodeStatusFilter, BarcodeStats } from "./types";

export function useBarcodeManagement() {
  const { user } = useAuth();
  const { currentStoreId } = useBusiness();
  const queryClient = useQueryClient();
  const storeId = currentStoreId || user?.id || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BarcodeStatusFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isLabelDesignerOpen, setIsLabelDesignerOpen] = useState(false);
  const [productsToPrint, setProductsToPrint] = useState<LabelProductItem[]>([]);
  const [productToRegenerate, setProductToRegenerate] = useState<POSProduct | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState<string | null>(null);

  // Fetch products
  const { data: products = [], isLoading, refetch } = useQuery<POSProduct[]>({
    queryKey: ["products", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", storeId)
          .order("name", { ascending: true });

        if (!error && data) return data as POSProduct[];
      } catch (e) {
        console.warn("[BarcodeManagement] Supabase fetch failed offline, falling back to cache:", e);
      }
      const localData = await sqliteService.getAll<POSProduct>("products", storeId);
      return localData || [];
    },
    initialData: () => queryClient.getQueryData<POSProduct[]>(["products", storeId]) || undefined,
    enabled: !!storeId,
  });

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Metric stats
  const stats: BarcodeStats = useMemo(() => {
    const total = products.length;
    const withBarcode = products.filter((p) => Boolean(p.barcode && p.barcode.trim())).length;
    const missing = total - withBarcode;
    const coverage = total > 0 ? Math.round((withBarcode / total) * 100) : 0;
    return { total, withBarcode, missing, coverage };
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(term);
        const matchesBarcode = p.barcode?.toLowerCase().includes(term);
        const matchesSku = p.sku?.toLowerCase().includes(term);
        const matchesCat = p.category?.toLowerCase().includes(term);
        if (!matchesName && !matchesBarcode && !matchesSku && !matchesCat) {
          return false;
        }
      }

      // Status
      if (statusFilter === "with_barcode" && (!p.barcode || !p.barcode.trim())) {
        return false;
      }
      if (statusFilter === "missing_barcode" && p.barcode && p.barcode.trim()) {
        return false;
      }

      // Category
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [products, searchTerm, statusFilter, selectedCategory]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Generate single barcode
  const handleGenerateBarcode = async (product: POSProduct) => {
    setIsGeneratingSingle(product.id);
    try {
      const res = await apiClient.post("/api/v1/pos/barcodes/generate", {
        product_id: product.id,
        barcode_type: "code128",
        prefix: "FF",
      });

      const { barcode, barcode_type, barcode_source } = res.data;

      // Update local storage and DB
      await offlineMutate({
        table: "products",
        action: "update",
        recordId: product.id,
        userId: storeId,
        payload: {
          barcode,
          barcode_type,
          barcode_source,
        },
      });

      toast.success(`Generated barcode ${barcode} for ${product.name}`);
      queryClient.invalidateQueries({ queryKey: ["pos_products_barcodes", storeId] });
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
    } catch (err: any) {
      console.error("Failed to generate barcode:", err);
      toast.error(err.response?.data?.detail || "Failed to generate barcode");
    } finally {
      setIsGeneratingSingle(null);
    }
  };

  // Bulk generate barcodes for all products lacking them
  const handleBulkGenerate = async () => {
    const productsNeedingBarcode = products.filter((p) => !p.barcode || !p.barcode.trim());
    if (productsNeedingBarcode.length === 0) {
      toast.info("All products already have barcodes!");
      return;
    }

    setIsBulkGenerating(true);
    try {
      const res = await apiClient.post("/api/v1/pos/barcodes/bulk-generate", {
        product_ids: productsNeedingBarcode.map((p) => p.id),
        barcode_type: "code128",
        prefix: "FF",
      });

      toast.success(
        `Successfully generated ${res.data?.count || res.data?.total_updated || productsNeedingBarcode.length} barcodes!`
      );
      queryClient.invalidateQueries({ queryKey: ["pos_products_barcodes", storeId] });
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      refetch();
    } catch (err: any) {
      console.error("Bulk generate failed:", err);
      toast.error(err.response?.data?.detail || "Bulk barcode generation failed");
    } finally {
      setIsBulkGenerating(false);
    }
  };

  // Trigger Print Label Designer for specific or selected products
  const handleOpenPrintForSingle = (product: POSProduct) => {
    if (!product.barcode) {
      toast.error("Please generate a barcode first before printing labels");
      return;
    }
    setProductsToPrint([
      {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        barcode_type: product.barcode_type || "code128",
        price: product.price,
        mrp: product.mrp,
        sku: product.sku,
        copies: 1,
      },
    ]);
    setIsLabelDesignerOpen(true);
  };

  const handleOpenPrintForSelected = () => {
    const selected = products.filter(
      (p) => selectedProductIds.has(p.id) && Boolean(p.barcode && p.barcode.trim())
    );
    if (selected.length === 0) {
      toast.error("Please select products that have barcodes to print labels");
      return;
    }
    setProductsToPrint(
      selected.map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode!,
        barcode_type: p.barcode_type || "code128",
        price: p.price,
        mrp: p.mrp,
        sku: p.sku,
        copies: 1,
      }))
    );
    setIsLabelDesignerOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied "${text}" to clipboard`);
  };

  return {
    products,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedCategory,
    setSelectedCategory,
    categories,
    selectedProductIds,
    stats,
    filteredProducts,
    handleSelectAll,
    handleToggleSelect,
    handleGenerateBarcode,
    handleBulkGenerate,
    handleOpenPrintForSingle,
    handleOpenPrintForSelected,
    copyToClipboard,
    isLabelDesignerOpen,
    setIsLabelDesignerOpen,
    productsToPrint,
    productToRegenerate,
    setProductToRegenerate,
    isBulkGenerating,
    isGeneratingSingle,
  };
}
