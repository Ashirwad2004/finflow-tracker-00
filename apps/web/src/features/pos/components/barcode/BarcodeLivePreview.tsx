import React from "react";
import { Sparkles } from "lucide-react";
import { LabelProductItem, LabelPresetKey } from "./types";
import { PRESETS } from "./constants";

interface BarcodeLivePreviewProps {
  selectedPreset: LabelPresetKey;
  showStoreName: boolean;
  storeName: string;
  showProductName: boolean;
  showPrice: boolean;
  showMRP: boolean;
  showSKU: boolean;
  customSubtitle: string;
  previewItem: LabelProductItem;
  previewSvgRef: React.RefObject<SVGSVGElement | null>;
}

export const BarcodeLivePreview: React.FC<BarcodeLivePreviewProps> = ({
  selectedPreset,
  showStoreName,
  storeName,
  showProductName,
  showPrice,
  showMRP,
  showSKU,
  customSubtitle,
  previewItem,
  previewSvgRef,
}) => {
  const preset = PRESETS[selectedPreset];

  return (
    <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
      <div className="w-full text-center">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Label Preview
        </span>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Physical scale simulation ({preset.name})
        </p>
      </div>

      {/* Label Card Simulator */}
      <div className="p-6 bg-muted/30 border border-border/80 rounded-2xl flex items-center justify-center w-full min-h-[300px] shadow-inner">
        <div
          className="bg-white text-black p-3 rounded-md shadow-lg border border-slate-300/80 flex flex-col items-center justify-between text-center transition-all"
          style={{
            width: `${Math.min(preset.widthMm * 4.8, 280)}px`,
            minHeight: `${Math.max(preset.heightMm * 4.8, 140)}px`,
          }}
        >
          {/* Store Header */}
          {showStoreName && storeName && (
            <div className="font-black text-[11px] uppercase tracking-wider text-slate-900 truncate w-full">
              {storeName}
            </div>
          )}

          {/* Product Name */}
          {showProductName && (
            <div className="font-bold text-xs text-slate-900 line-clamp-2 px-1 my-1 leading-tight">
              {previewItem.name}
            </div>
          )}

          {/* Barcode SVG */}
          <div className="my-1.5 w-full flex justify-center overflow-hidden">
            <svg ref={previewSvgRef} className="max-w-full"></svg>
          </div>

          {/* Price & SKU */}
          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-900 mt-1">
            {showPrice && <span>₹{previewItem.price.toFixed(2)}</span>}
            {showMRP && previewItem.mrp && previewItem.mrp > previewItem.price && (
              <span className="line-through text-slate-400 font-normal text-[10px]">
                ₹{previewItem.mrp.toFixed(2)}
              </span>
            )}
            {showSKU && previewItem.sku && (
              <span className="text-[10px] text-slate-500 font-normal">
                ({previewItem.sku})
              </span>
            )}
          </div>

          {/* Subtitle */}
          {customSubtitle && (
            <div className="text-[9px] text-slate-500 mt-0.5">
              {customSubtitle}
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Supports Zebra, TVS, TSC thermal roll printers and standard laser sticker sheets.</p>
        <p className="text-[11px] text-muted-foreground/80">
          High-resolution vector barcode ensures rapid, accurate optical scanning.
        </p>
      </div>
    </div>
  );
};
