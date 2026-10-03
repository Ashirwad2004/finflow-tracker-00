import { UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Barcode, Sparkles } from "lucide-react";
import { ProductFormValues } from "../../types";

interface ProductBarcodeSectionProps {
  register: UseFormRegister<ProductFormValues>;
  isGeneratingBarcode: boolean;
  onGenerateBarcode: () => void;
}

export function ProductBarcodeSection({
  register,
  isGeneratingBarcode,
  onGenerateBarcode,
}: ProductBarcodeSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="product_barcode"
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Barcode className="w-3.5 h-3.5 text-blue-500" /> Barcode (Code 128 / EAN-13)
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isGeneratingBarcode}
            onClick={onGenerateBarcode}
            className="h-7 text-xs gap-1 border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
          >
            <Sparkles className="w-3 h-3" />
            {isGeneratingBarcode ? "Generating..." : "Generate Barcode"}
          </Button>
        </div>
        <Input
          id="product_barcode"
          {...register("barcode")}
          placeholder="Scan or generate product barcode..."
          className="font-mono text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product_sku" className="text-xs">
            SKU / Item Code
          </Label>
          <Input
            id="product_sku"
            {...register("sku")}
            placeholder="e.g. BEV-001"
            className="text-xs font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product_category" className="text-xs">
            Category
          </Label>
          <Input
            id="product_category"
            {...register("category")}
            placeholder="e.g. Grocery, Snacks"
            className="text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product_mrp" className="text-xs">
            MRP (Maximum Retail Price)
          </Label>
          <Input
            id="product_mrp"
            type="number"
            step="0.01"
            {...register("mrp")}
            placeholder="0.00"
            className="text-xs font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product_tax_rate" className="text-xs">
            GST / Tax Rate (%)
          </Label>
          <Input
            id="product_tax_rate"
            type="number"
            step="0.01"
            {...register("tax_rate")}
            placeholder="0, 5, 12, 18, 28"
            className="text-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
}
