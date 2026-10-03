import { Control, Controller, UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Sparkles, Loader2 } from "lucide-react";
import { ProductImageUpload } from "../ProductImageUpload";
import { ProductFormValues } from "../../types";

interface ProductOnlineStoreSectionProps {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  mode: "add" | "edit";
  isListedOnline: boolean;
  isGeneratingProductCopy: boolean;
  onGenerateProductCopy: () => void;
}

export function ProductOnlineStoreSection({
  control,
  register,
  mode,
  isListedOnline,
  isGeneratingProductCopy,
  onGenerateProductCopy,
}: ProductOnlineStoreSectionProps) {
  return (
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

      {isListedOnline && (
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
                onClick={onGenerateProductCopy}
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
  );
}
