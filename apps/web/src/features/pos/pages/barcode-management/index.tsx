import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Barcode as BarcodeIcon, Printer, Sparkles } from "lucide-react";
import { BarcodeLabelDesignerModal } from "../../components/BarcodeLabelDesignerModal";
import { useBarcodeManagement } from "./useBarcodeManagement";
import { BarcodeStatsStrip } from "./BarcodeStatsStrip";
import { BarcodeToolbar } from "./BarcodeToolbar";
import { BarcodeProductTable } from "./BarcodeProductTable";
import { BarcodeRegenerateDialog } from "./BarcodeRegenerateDialog";

export * from "./types";
export * from "./useBarcodeManagement";
export * from "./BarcodeStatsStrip";
export * from "./BarcodeToolbar";
export * from "./BarcodeProductTable";
export * from "./BarcodeRegenerateDialog";

export function BarcodeManagementPage() {
  const {
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
  } = useBarcodeManagement();

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
        <BarcodeStatsStrip stats={stats} />

        {/* Toolbar & Filters */}
        <BarcodeToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
          stats={stats}
          filteredCount={filteredProducts.length}
          totalCount={products.length}
        />

        {/* Products Table */}
        <BarcodeProductTable
          products={filteredProducts}
          isLoading={isLoading}
          selectedProductIds={selectedProductIds}
          onSelectAll={handleSelectAll}
          onToggleSelect={handleToggleSelect}
          onGenerateBarcode={handleGenerateBarcode}
          isGeneratingSingle={isGeneratingSingle}
          onOpenPrintForSingle={handleOpenPrintForSingle}
          onOpenRegenerate={setProductToRegenerate}
          onCopyToClipboard={copyToClipboard}
        />
      </div>

      {/* Label Designer & Print Studio Modal */}
      <BarcodeLabelDesignerModal
        isOpen={isLabelDesignerOpen}
        onClose={() => setIsLabelDesignerOpen(false)}
        products={productsToPrint}
      />

      {/* Regenerate Confirmation Dialog */}
      <BarcodeRegenerateDialog
        product={productToRegenerate}
        onClose={() => setProductToRegenerate(null)}
        onConfirm={handleGenerateBarcode}
      />
    </AppLayout>
  );
}

export default BarcodeManagementPage;
