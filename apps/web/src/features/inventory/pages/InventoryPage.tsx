import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Search,
  Settings2,
  FileSpreadsheet,
  Barcode,
  Plus,
} from "lucide-react";
import { useAuth } from "@/core/lib/auth";
import { useItemSettings } from "@/core/hooks/use-item-settings";
import { useSalesSettings } from "@/core/hooks/use-sales-settings";

import {
  Product,
  ProductFormValues,
  StockFilterType,
} from "../types";
import {
  useInventoryProducts,
  useOrphanedImagesCleanup,
} from "../hooks";
import {
  InventoryTable,
  ItemSettingsDialog,
  ProductFormDialog,
  LowStockAlertBanner,
  DeleteProductDialog,
  ExcelImportDialog,
} from "../components";

export default function Inventory() {
  const { user } = useAuth();
  const userId = user?.id || "";

  const { settings, updateSetting, resetSettings } = useItemSettings(userId);
  const { settings: salesSettings } = useSalesSettings(userId);

  // Background orphaned images cleanup once a week
  useOrphanedImagesCleanup(userId);

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilterType>("all");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Data queries & mutations
  const {
    products,
    filteredProducts,
    isLoading,
    addProductMutation,
    updateProductMutation,
    deleteProductMutation,
  } = useInventoryProducts({
    userId,
    searchTerm,
    stockFilter,
  });

  // Low stock metrics
  const lowStockThreshold = settings.lowStockWarningThreshold;
  const lowStockCount =
    lowStockThreshold > 0
      ? products.filter((p) => p.stock_quantity < lowStockThreshold).length
      : 0;

  // Handlers
  const handleOpenAddDialog = () => {
    setSelectedProduct(null);
    setFormMode("add");
    setIsFormDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormMode("edit");
    setIsFormDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: ProductFormValues) => {
    if (formMode === "edit" && selectedProduct) {
      updateProductMutation.mutate(
        { values: data, selectedProduct },
        {
          onSuccess: () => {
            setIsFormDialogOpen(false);
            setSelectedProduct(null);
          },
        }
      );
    } else {
      addProductMutation.mutate(data, {
        onSuccess: () => {
          setIsFormDialogOpen(false);
        },
      });
    }
  };

  const handleConfirmDelete = (productId: string) => {
    deleteProductMutation.mutate(productId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedProduct(null);
      },
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Package className="w-8 h-8 shrink-0" />
              Inventory Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your products and stock levels
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link to="/inventory/barcodes">
              <Button
                variant="outline"
                className="gap-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/20 text-blue-600 dark:text-blue-400 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
              >
                <Barcode className="w-4 h-4" />
                Barcodes & Labels
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(true)}
              className="gap-2 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
            >
              <Settings2 className="w-4 h-4" />
              Item Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              className="gap-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import / Export
            </Button>
            <Button
              onClick={handleOpenAddDialog}
              className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
            >
              <Plus className="w-4 h-4 mr-1 sm:mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Low Stock Alert */}
        <LowStockAlertBanner
          lowStockCount={lowStockCount}
          lowStockThreshold={lowStockThreshold}
        />

        {/* Search Bar & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="w-full sm:w-[220px]">
            <Select
              value={stockFilter}
              onValueChange={(value: StockFilterType) => setStockFilter(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="stock">Stock Items (Available)</SelectItem>
                <SelectItem value="non-stock">Non-Stock Items (Zero/Negative)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Table */}
        <InventoryTable
          products={filteredProducts}
          isLoading={isLoading}
          searchTerm={searchTerm}
          showRackLocations={settings.showRackLocations}
          enableHsnCode={salesSettings?.enableHsnCode}
          lowStockThreshold={lowStockThreshold}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddProduct={handleOpenAddDialog}
        />

        {/* Item Settings Dialog */}
        <ItemSettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          settings={settings}
          updateSetting={updateSetting}
          resetSettings={resetSettings}
        />

        {/* Unified Add / Edit Product Dialog */}
        <ProductFormDialog
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          mode={formMode}
          product={selectedProduct}
          existingProducts={products}
          onSubmit={handleFormSubmit}
          isPending={
            formMode === "edit"
              ? updateProductMutation.isPending
              : addProductMutation.isPending
          }
          showRackLocations={settings.showRackLocations}
          enableHsnCode={salesSettings?.enableHsnCode}
        />

        {/* Delete Confirmation Alert Dialog */}
        <DeleteProductDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          product={selectedProduct}
          onConfirmDelete={handleConfirmDelete}
          isPending={deleteProductMutation.isPending}
        />

        {/* Excel Import Dialog */}
        <ExcelImportDialog
          open={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          userId={userId}
          existingProducts={products}
        />
      </div>
    </AppLayout>
  );
}
