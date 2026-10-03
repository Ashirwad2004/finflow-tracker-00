import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, Settings2 } from "lucide-react";
import { PRESETS } from "./constants";
import { LabelPresetKey } from "./types";

interface BarcodeDesignerSettingsProps {
  selectedPreset: LabelPresetKey;
  onSelectPreset: (preset: LabelPresetKey) => void;
  showStoreName: boolean;
  onToggleStoreName: (show: boolean) => void;
  storeName: string;
  onChangeStoreName: (name: string) => void;
  showProductName: boolean;
  onToggleProductName: (show: boolean) => void;
  showPrice: boolean;
  onTogglePrice: (show: boolean) => void;
  showMRP: boolean;
  onToggleMRP: (show: boolean) => void;
  showSKU: boolean;
  onToggleSKU: (show: boolean) => void;
  customSubtitle: string;
  onChangeCustomSubtitle: (subtitle: string) => void;
}

export const BarcodeDesignerSettings: React.FC<BarcodeDesignerSettingsProps> = ({
  selectedPreset,
  onSelectPreset,
  showStoreName,
  onToggleStoreName,
  storeName,
  onChangeStoreName,
  showProductName,
  onToggleProductName,
  showPrice,
  onTogglePrice,
  showMRP,
  onToggleMRP,
  showSKU,
  onToggleSKU,
  customSubtitle,
  onChangeCustomSubtitle,
}) => {
  return (
    <>
      {/* Format & Size Presets */}
      <div className="bg-card border border-border/80 p-4 rounded-2xl space-y-3 shadow-xs">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Label Size & Paper Type
        </Label>
        <Select
          value={selectedPreset}
          onValueChange={(val) => onSelectPreset(val as LabelPresetKey)}
        >
          <SelectTrigger className="bg-background border-border text-foreground rounded-xl">
            <SelectValue placeholder="Select paper size" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            {Object.entries(PRESETS).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Label Elements Customization */}
      <div className="bg-card border border-border/80 p-4 rounded-2xl space-y-4 shadow-xs">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" /> Visible Label Elements
        </Label>

        <div className="space-y-3">
          {/* Store Name */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={showStoreName}
                onCheckedChange={onToggleStoreName}
                id="toggle-store-name"
              />
              <label
                htmlFor="toggle-store-name"
                className="text-xs text-foreground cursor-pointer font-medium"
              >
                Store Brand Header
              </label>
            </div>
            {showStoreName && (
              <Input
                value={storeName}
                onChange={(e) => onChangeStoreName(e.target.value)}
                placeholder="Store Name"
                className="h-8 max-w-[200px] bg-background border-border text-xs text-foreground rounded-lg"
              />
            )}
          </div>

          {/* Product Name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={showProductName}
                onCheckedChange={onToggleProductName}
                id="toggle-prod-name"
              />
              <label
                htmlFor="toggle-prod-name"
                className="text-xs text-foreground cursor-pointer font-medium"
              >
                Product Name
              </label>
            </div>
            <span className="text-[11px] text-muted-foreground">Auto-wrapped</span>
          </div>

          {/* Price & MRP */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={showPrice}
                onCheckedChange={onTogglePrice}
                id="toggle-price"
              />
              <label
                htmlFor="toggle-price"
                className="text-xs text-foreground cursor-pointer font-medium"
              >
                Selling Price
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showMRP}
                onCheckedChange={onToggleMRP}
                id="toggle-mrp"
              />
              <label
                htmlFor="toggle-mrp"
                className="text-xs text-foreground cursor-pointer font-medium"
              >
                Show MRP (Crossed)
              </label>
            </div>
          </div>

          {/* SKU Code */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={showSKU}
                onCheckedChange={onToggleSKU}
                id="toggle-sku"
              />
              <label
                htmlFor="toggle-sku"
                className="text-xs text-foreground cursor-pointer font-medium"
              >
                SKU Code
              </label>
            </div>
            <span className="text-[11px] text-muted-foreground">Inventory code</span>
          </div>

          {/* Subtitle / Footer */}
          <div className="space-y-1.5 pt-2 border-t border-border/80">
            <Label className="text-[11px] text-muted-foreground font-medium">
              Footer Note / Tax Disclaimer
            </Label>
            <Input
              value={customSubtitle}
              onChange={(e) => onChangeCustomSubtitle(e.target.value)}
              placeholder="e.g. Incl. of all taxes"
              className="h-8 bg-background border-border text-xs text-foreground rounded-lg"
            />
          </div>
        </div>
      </div>
    </>
  );
};
