import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import apiClient from "@/core/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Barcode as BarcodeIcon,
  Printer,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Copy,
  Package,
  Layers,
  ArrowRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { BarcodeLabelDesignerModal, LabelProductItem } from "../components/BarcodeLabelDesignerModal";
import { POSProduct } from "../types";

export default function BarcodeManagementPage() {
  const { user } = useAuth();
  const { currentStoreId } = useBusiness();
  const queryClient = useQueryClient();
  const storeId = currentStoreId || user?.id || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "with_barcode" | "missing_barcode">("all");
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
  const stats = useMemo(() => {
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

      toast.success(`Successfully generated ${res.data?.count || res.data?.total_updated || productsNeedingBarcode.length} barcodes!`);
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

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-display">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
                <BarcodeIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Barcode & Label Management
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Generate compliant retail barcodes, print thermal labels and A4 sheets, and ensure rapid POS checkout.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {selectedProductIds.size > 0 && (
              <Button
                onClick={handleOpenPrintForSelected}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Labels ({selectedProductIds.size})
              </Button>
            )}

            {stats.missing > 0 && (
              <Button
                variant="outline"
                disabled={isBulkGenerating}
                onClick={handleBulkGenerate}
                className="border-border hover:bg-muted font-semibold text-foreground shadow-2xs"
              >
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                {isBulkGenerating ? "Generating..." : `Auto-Generate (${stats.missing} Missing)`}
              </Button>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Catalog</span>
              <div className="text-2xl font-black text-foreground mt-1 tracking-tight">{stats.total}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tagged Barcodes</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">{stats.withBarcode}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Missing Barcodes</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tracking-tight">{stats.missing}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
            <div className="flex-1 pr-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Catalog Coverage</span>
              <div className="text-2xl font-black text-primary mt-1 tracking-tight">{stats.coverage}%</div>
              <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.coverage}%` }}
                />
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-card border border-border/80 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search product, barcode, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-border text-foreground text-xs h-9.5 rounded-xl"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as any)}
            >
              <SelectTrigger className="w-48 bg-background border-border text-foreground text-xs h-9.5 rounded-xl">
                <SelectValue placeholder="Barcode Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="with_barcode">Tagged ({stats.withBarcode})</SelectItem>
                <SelectItem value="missing_barcode">Missing Barcode ({stats.missing})</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-44 bg-background border-border text-foreground text-xs h-9.5 rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-end md:self-center">
            Showing <strong className="text-foreground font-bold">{filteredProducts.length}</strong> of{" "}
            <strong className="text-foreground font-bold">{products.length}</strong> items
          </div>
        </div>

        {/* Products Table */}
        <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border/80">
              <TableRow className="hover:bg-transparent border-border/80">
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={
                      filteredProducts.length > 0 &&
                      selectedProductIds.size === filteredProducts.length
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className="border-border data-[state=checked]:bg-primary"
                  />
                </TableHead>
                <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider">Product Name & Category</TableHead>
                <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider">Barcode & Format</TableHead>
                <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider">SKU</TableHead>
                <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider text-right">Price / MRP</TableHead>
                <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider text-center">Stock</TableHead>
                <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                    Loading barcode directory...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="font-semibold text-foreground">No products match your search or filter criteria.</p>
                    <p className="text-xs text-muted-foreground mt-1">Try resetting the search keyword or filter options.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const hasBarcode = Boolean(product.barcode && product.barcode.trim());
                  const isSelected = selectedProductIds.has(product.id);

                  return (
                    <TableRow
                      key={product.id}
                      className={`hover:bg-muted/40 border-border/60 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(product.id)}
                          aria-label={`Select ${product.name}`}
                          className="border-border data-[state=checked]:bg-primary"
                        />
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-foreground text-sm leading-tight">{product.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          {product.category && (
                            <Badge variant="outline" className="text-[10px] border-border bg-muted/50 text-muted-foreground font-medium">
                              {product.category}
                            </Badge>
                          )}
                          {product.hsn_code && <span>HSN: {product.hsn_code}</span>}
                        </div>
                      </TableCell>

                      <TableCell>
                        {hasBarcode ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                              {product.barcode}
                            </span>
                            <button
                              onClick={() => copyToClipboard(product.barcode!)}
                              title="Copy Barcode"
                              className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <Badge variant="outline" className="text-[9px] border-border text-muted-foreground uppercase font-mono">
                              {product.barcode_type || "CODE128"}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-medium">
                            Missing Barcode
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {product.sku || "—"}
                      </TableCell>

                      <TableCell className="text-right font-mono">
                        <div className="text-foreground font-bold text-sm">₹{product.price.toFixed(2)}</div>
                        {product.mrp && product.mrp > product.price && (
                          <div className="text-[10px] text-muted-foreground line-through">
                            MRP: ₹{product.mrp.toFixed(2)}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-center font-mono">
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${
                            product.stock_quantity > 5
                              ? "border-border text-foreground bg-muted/40"
                              : product.stock_quantity > 0
                              ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                              : "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                          }`}
                        >
                          {product.stock_quantity} {product.unit || "pc"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {!hasBarcode ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isGeneratingSingle === product.id}
                              onClick={() => handleGenerateBarcode(product)}
                              className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                            >
                              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                              {isGeneratingSingle === product.id ? "Generating..." : "Generate"}
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPrintForSingle(product)}
                                className="h-8 text-xs border-border text-foreground hover:bg-muted font-medium"
                              >
                                <Printer className="w-3.5 h-3.5 mr-1.5 text-primary" />
                                Print Label
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setProductToRegenerate(product)}
                                title="Regenerate Barcode"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Label Designer & Print Studio Modal */}
      <BarcodeLabelDesignerModal
        isOpen={isLabelDesignerOpen}
        onClose={() => setIsLabelDesignerOpen(false)}
        products={productsToPrint}
      />

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog
        open={Boolean(productToRegenerate)}
        onOpenChange={(open) => (!open ? setProductToRegenerate(null) : null)}
      >
        <AlertDialogContent className="bg-card border-border text-foreground rounded-2xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2 text-lg font-bold">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              Regenerate Barcode?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Regenerating will replace the existing barcode{" "}
              <strong className="text-foreground font-mono">{productToRegenerate?.barcode}</strong> for{" "}
              <strong className="text-foreground">{productToRegenerate?.name}</strong>. Any previously
              printed physical sticker labels will no longer match this product in POS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-muted font-medium">
              Keep Existing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToRegenerate) {
                  handleGenerateBarcode(productToRegenerate);
                  setProductToRegenerate(null);
                }
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Confirm & Generate New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
