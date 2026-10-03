import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import apiClient from "@/core/api/apiClient";
import { useToast } from "@/core/hooks/use-toast";
import { generateProductContent } from "@/core/integrations/ai/gemini";
import { ProductFormValues } from "../../types";
import { ProductFormDialogProps, DEFAULT_FORM_VALUES } from "./types";

export function useProductForm({
  open,
  mode,
  product,
  existingProducts,
  onSubmit,
}: Pick<
  ProductFormDialogProps,
  "open" | "mode" | "product" | "existingProducts" | "onSubmit"
>) {
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

  return {
    register,
    handleSubmit,
    errors,
    reset,
    watch,
    control,
    setValue,
    getValues,
    isGeneratingBarcode,
    isGeneratingProductCopy,
    handleGenerateFormBarcode,
    handleGenerateProductCopy,
    handleFormSubmit,
    isEdit,
  };
}
