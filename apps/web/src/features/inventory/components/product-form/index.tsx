import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductPricingStockFields } from "./ProductPricingStockFields";
import { ProductBarcodeSection } from "./ProductBarcodeSection";
import { ProductOnlineStoreSection } from "./ProductOnlineStoreSection";
import { useProductForm } from "./useProductForm";
import { ProductFormDialogProps, DEFAULT_FORM_VALUES } from "./types";

export type { ProductFormDialogProps };
export { DEFAULT_FORM_VALUES };

export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  product,
  existingProducts,
  onSubmit,
  isPending,
  showRackLocations = false,
  enableHsnCode = false,
}) => {
  const {
    register,
    handleSubmit,
    errors,
    reset,
    watch,
    control,
    isGeneratingBarcode,
    isGeneratingProductCopy,
    handleGenerateFormBarcode,
    handleGenerateProductCopy,
    handleFormSubmit,
    isEdit,
  } = useProductForm({
    open,
    mode,
    product,
    existingProducts,
    onSubmit,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update product information in your inventory"
              : "Add a new product to your inventory"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <ProductPricingStockFields
            register={register}
            errors={errors}
            showRackLocations={showRackLocations}
            enableHsnCode={enableHsnCode}
          />

          <ProductBarcodeSection
            register={register}
            isGeneratingBarcode={isGeneratingBarcode}
            onGenerateBarcode={handleGenerateFormBarcode}
          />

          <ProductOnlineStoreSection
            control={control}
            register={register}
            mode={mode}
            isListedOnline={Boolean(watch("is_listed_online"))}
            isGeneratingProductCopy={isGeneratingProductCopy}
            onGenerateProductCopy={handleGenerateProductCopy}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset(DEFAULT_FORM_VALUES);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
