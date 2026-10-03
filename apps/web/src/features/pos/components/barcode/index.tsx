import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Barcode as BarcodeIcon } from "lucide-react";
import { BarcodeLabelDesignerModalProps } from "./types";
import { useBarcodeLabelDesigner } from "./useBarcodeLabelDesigner";
import { BarcodeDesignerSettings } from "./BarcodeDesignerSettings";
import { BarcodeProductList } from "./BarcodeProductList";
import { BarcodeLivePreview } from "./BarcodeLivePreview";

export * from "./types";
export * from "./constants";
export * from "./printLabels";
export * from "./useBarcodeLabelDesigner";
export * from "./BarcodeDesignerSettings";
export * from "./BarcodeProductList";
export * from "./BarcodeLivePreview";

export const BarcodeLabelDesignerModal: React.FC<BarcodeLabelDesignerModalProps> = ({
  isOpen,
  onClose,
  products: initialProducts,
}) => {
  const {
    items,
    selectedPreset,
    setSelectedPreset,
    storeName,
    setStoreName,
    showStoreName,
    setShowStoreName,
    showProductName,
    setShowProductName,
    showPrice,
    setShowPrice,
    showMRP,
    setShowMRP,
    showSKU,
    setShowSKU,
    customSubtitle,
    setCustomSubtitle,
    previewSvgRef,
    previewItem,
    totalLabelCount,
    updateItemCopies,
    removeItem,
    handlePrintLabels,
  } = useBarcodeLabelDesigner(isOpen, initialProducts);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-card border-border text-foreground flex flex-col max-h-[90vh] shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
                <BarcodeIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Barcode Label Studio
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure label layouts, paper sizes, and print crisp labels for thermal printers or standard sticker sheets.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Studio Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 font-display">
          {/* Left Panel: Settings & Toggles */}
          <div className="lg:col-span-7 space-y-4">
            <BarcodeDesignerSettings
              selectedPreset={selectedPreset}
              onSelectPreset={setSelectedPreset}
              showStoreName={showStoreName}
              onToggleStoreName={setShowStoreName}
              storeName={storeName}
              onChangeStoreName={setStoreName}
              showProductName={showProductName}
              onToggleProductName={setShowProductName}
              showPrice={showPrice}
              onTogglePrice={setShowPrice}
              showMRP={showMRP}
              onToggleMRP={setShowMRP}
              showSKU={showSKU}
              onToggleSKU={setShowSKU}
              customSubtitle={customSubtitle}
              onChangeCustomSubtitle={setCustomSubtitle}
            />

            <BarcodeProductList
              items={items}
              totalLabelCount={totalLabelCount}
              onUpdateCopies={updateItemCopies}
              onRemoveItem={removeItem}
            />
          </div>

          {/* Right Panel: Interactive Visual Label Preview */}
          <BarcodeLivePreview
            selectedPreset={selectedPreset}
            showStoreName={showStoreName}
            storeName={storeName}
            showProductName={showProductName}
            showPrice={showPrice}
            showMRP={showMRP}
            showSKU={showSKU}
            customSubtitle={customSubtitle}
            previewItem={previewItem}
            previewSvgRef={previewSvgRef}
          />
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/80 bg-muted/30 flex-shrink-0 flex items-center justify-between">
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-muted font-semibold"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            onClick={handlePrintLabels}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-xs rounded-xl"
          >
            <Printer className="w-4 h-4 mr-2" /> Print {totalLabelCount} Labels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeLabelDesignerModal;
