import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Barcode, Sparkles, Loader2, Globe } from "lucide-react";
import apiClient from "@/core/api/apiClient";
import { useToast } from "@/core/hooks/use-toast";
import { generateProductContent } from "@/core/integrations/ai/gemini";
import { ProductImageUpload } from "./ProductImageUpload";
import { Product, ProductFormValues } from "../types";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  product?: Product | null;
  existingProducts: Product[];
  onSubmit: (data: ProductFormValues) => void;
  isPending: boolean;
  showRackLocations?: boolean;
  enableHsnCode?: boolean;
}

const DEFAULT_FORM_VALUES: ProductFormValues = {
  name: "",
  price: 0,
  cost_price: 0,
  stock_quantity: 0,
  unit: "pc",
  hsn_code: "",
  barcode: "",
  barcode_type: "code128",
  barcode_source: "manufacturer",
  sku: "",
  category: "",
  mrp: 0,
  tax_rate: 0,
  is_listed_online: true,
  online_description: "",
  image_url: "",
  rack_location: "",
};

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
  const { toast } = useToast();
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false);
  const [isGeneratingProductCopy, setIsGeneratingProductCopy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
    setValue,
    getValues,
  } = useForm<ProductFormValues>({
    defaultValues: DEFAULT_FORM_VALUES,
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && product) {
        reset({
          name: product.name || "",
          price: product.price ?? 0,
          cost_price: product.cost_price ?? 0,
          stock_quantity: product.stock_quantity ?? 0,
          unit: product.unit || "pc",
          hsn_code: product.hsn_code || "",
          barcode: product.barcode || "",
          barcode_type: product.barcode_type || "code128",
          barcode_source: product.barcode_source || "manufacturer",
          sku: product.sku || "",
          category: product.category || "",
          mrp: product.mrp ?? 0,
          tax_rate: product.tax_rate ?? 0,
          is_listed_online: Boolean(product.is_listed_online),
          online_description: product.online_description || "",
          image_url: product.image_url || "",
          rack_location: product.rack_location || "",
        });
      } else {
        reset(DEFAULT_FORM_VALUES);
      }
    }
  }, [open, mode, product, reset]);

  const handleGenerateFormBarcode = async () => {
    setIsGeneratingBarcode(true);
    try {
      const res = await apiClient.post("/api/v1/pos/barcodes/generate", {
        barcode_type: "code128",
        prefix: "FF",
      });
      setValue("barcode", res.data.barcode, { shouldDirty: true, shouldValidate: true });
      setValue("barcode_type", res.data.barcode_type, { shouldDirty: true });
      setValue("barcode_source", res.data.barcode_source, { shouldDirty: true });
      toast({
        title: "Barcode Generated",
        description: `Generated internal barcode ${res.data.barcode}`,
      });
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.response?.data?.detail || "Could not generate barcode",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingBarcode(false);
    }
  };

  const handleGenerateProductCopy = async () => {
    const values = getValues();
    if (!values.name?.trim()) {
      toast({
        title: "Product name required",
        description: "Enter a product name first so Gemini can generate relevant content.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingProductCopy(true);
    try {
      const content = await generateProductContent({
        name: values.name,
        price: Number(values.price || 0),
        costPrice: Number(values.cost_price || 0),
        unit: values.unit,
        stockQuantity: Number(values.stock_quantity || 0),
      });
      setValue("name", content.title, { shouldDirty: true, shouldValidate: true });
      setValue(
        "online_description",
        `${content.description}\n\nHighlights:\n${content.highlights
          .map((item) => `- ${item}`)
          .join("\n")}\n\n${content.marketingCopy}\n\nSEO Title: ${
          content.seoTitle
        }\nSEO Description: ${content.seoDescription}`,
        { shouldDirty: true, shouldValidate: true }
      );
      toast({
        title: "Gemini product copy generated",
        description:
          "Review the title, description, SEO metadata, highlights, and marketing copy before saving.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again later.";
      toast({
        title: "Gemini generation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingProductCopy(false);
    }
  };

  const handleFormSubmit = (data: ProductFormValues) => {
    const trimmedName = data.name.trim().toLowerCase();
    const isDuplicate = existingProducts.some(
      (p) =>
        (mode === "add" || p.id !== product?.id) &&
        p.name.trim().toLowerCase() === trimmedName
    );

    if (isDuplicate) {
      toast({
        title: "Duplicate Product",
        description: `A product named "${data.name.trim()}" already exists in your inventory.`,
        variant: "destructive",
      });
      return;
    }

    onSubmit(data);
  };

  const isEdit = mode === "edit";

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

          {/* Barcode, SKU, Category, MRP, Tax Rate */}
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
                  onClick={handleGenerateFormBarcode}
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

          <div className="space-y-4 pt-4 border-t mt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base text-primary flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  List on Online Store
                </Label>
                <p className="text-xs text-muted-foreground">
                  Make this product visible on your public storefront
                </p>
              </div>
              <Controller
                name="is_listed_online"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {watch("is_listed_online") && (
              <>
                <div className="space-y-2">
                  <Controller
                    name="image_url"
                    control={control}
                    render={({ field }) => (
                      <ProductImageUpload
                        value={field.value || ""}
                        onChange={field.onChange}
                        inputId={`${mode}_product_image`}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`${mode}_online_description`}>
                      Product Description
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateProductCopy}
                      disabled={isGeneratingProductCopy}
                      className="h-8 gap-1.5"
                    >
                      {isGeneratingProductCopy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Generate
                    </Button>
                  </div>
                  <Textarea
                    id={`${mode}_online_description`}
                    {...register("online_description")}
                    placeholder="Describe the product for online customers..."
                    rows={5}
                  />
                </div>
              </>
            )}
          </div>

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
