import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ProductFormValues } from "../../types";

interface ProductPricingStockFieldsProps {
  register: UseFormRegister<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  showRackLocations?: boolean;
  enableHsnCode?: boolean;
}

export function ProductPricingStockFields({
  register,
  errors,
  showRackLocations,
  enableHsnCode,
}: ProductPricingStockFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="product_name">Product Name *</Label>
        <Input
          id="product_name"
          {...register("name", { required: "Product name is required" })}
          placeholder="Enter product name"
        />
        {errors.name && (
          <span className="text-xs text-destructive">{errors.name.message}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product_price">Selling Price *</Label>
          <Input
            id="product_price"
            type="number"
            step="0.01"
            {...register("price", { required: "Price is required", min: 0 })}
            placeholder="0.00"
          />
          {errors.price && (
            <span className="text-xs text-destructive">{errors.price.message}</span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_cost_price">Cost Price</Label>
          <Input
            id="product_cost_price"
            type="number"
            step="0.01"
            {...register("cost_price", { min: 0 })}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product_stock_quantity">Stock Quantity *</Label>
          <Input
            id="product_stock_quantity"
            type="number"
            {...register("stock_quantity", {
              required: "Stock quantity is required",
              min: 0,
            })}
            placeholder="0"
          />
          {errors.stock_quantity && (
            <span className="text-xs text-destructive">
              {errors.stock_quantity.message}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_unit">Unit</Label>
          <Input
            id="product_unit"
            {...register("unit")}
            placeholder="pc, kg, ltr, etc."
          />
        </div>
      </div>

      {showRackLocations && (
        <div className="space-y-2 animate-fade-in">
          <Label htmlFor="product_rack_location">Rack Location</Label>
          <Input
            id="product_rack_location"
            {...register("rack_location")}
            placeholder="e.g. Shelf A-3, Rack 2"
          />
        </div>
      )}

      {enableHsnCode && (
        <div className="space-y-2 animate-fade-in">
          <Label htmlFor="product_hsn_code">HSN Code</Label>
          <Input
            id="product_hsn_code"
            {...register("hsn_code")}
            placeholder="e.g. 8517, 4901"
          />
        </div>
      )}
    </>
  );
}
