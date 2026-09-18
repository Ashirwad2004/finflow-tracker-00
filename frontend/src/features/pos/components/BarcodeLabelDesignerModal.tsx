import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Printer,
  Barcode as BarcodeIcon,
  Layers,
  Settings2,
  CheckCircle2,
  Copy,
  Trash2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { renderBarcodeToSvg, BarcodeFormat } from "@/core/utils/barcode";
import { useBusiness } from "@/core/contexts/BusinessContext";

export interface LabelProductItem {
  id: string;
  name: string;
  barcode: string;
  barcode_type?: string;
  price: number;
  mrp?: number | null;
  sku?: string | null;
  copies: number;
}

interface BarcodeLabelDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: LabelProductItem[];
}

type LabelPresetKey = "roll_50_25" | "roll_38_25" | "roll_50_38" | "roll_100_50" | "a4_24" | "a4_65";

interface LabelPresetConfig {
  name: string;
  type: "roll" | "sheet";
  widthMm: number;
  heightMm: number;
  cols?: number;
  rows?: number;
  fontSize: number;
  barcodeHeight: number;
}

const PRESETS: Record<LabelPresetKey, LabelPresetConfig> = {
  roll_50_25: {
    name: 'Thermal Roll 50×25mm (2"×1")',
    type: "roll",
    widthMm: 50,
    heightMm: 25,
    fontSize: 9,
    barcodeHeight: 38,
  },
  roll_38_25: {
    name: 'Thermal Roll 38×25mm (1.5"×1")',
    type: "roll",
    widthMm: 38,
    heightMm: 25,
    fontSize: 8,
    barcodeHeight: 32,
  },
  roll_50_38: {
    name: 'Thermal Roll 50×38mm (2"×1.5")',
    type: "roll",
    widthMm: 50,
    heightMm: 38,
    fontSize: 10,
    barcodeHeight: 46,
  },
  roll_100_50: {
    name: 'Thermal Roll 100×50mm (4"×2")',
    type: "roll",
    widthMm: 100,
    heightMm: 50,
    fontSize: 12,
    barcodeHeight: 60,
  },
  a4_24: {
    name: "A4 Sticker Sheet (24 labels: 3×8)",
    type: "sheet",
    widthMm: 70,
    heightMm: 37,
    cols: 3,
    rows: 8,
    fontSize: 9,
    barcodeHeight: 36,
  },
  a4_65: {
    name: "A4 Sticker Sheet (65 labels: 5×13)",
    type: "sheet",
    widthMm: 38,
    heightMm: 21,
    cols: 5,
    rows: 13,
    fontSize: 7,
    barcodeHeight: 22,
  },
};

export const BarcodeLabelDesignerModal: React.FC<BarcodeLabelDesignerModalProps> = ({
  isOpen,
  onClose,
  products: initialProducts,
}) => {
  const { currentStore } = useBusiness();
  const [items, setItems] = useState<LabelProductItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<LabelPresetKey>("roll_50_25");
  const [storeName, setStoreName] = useState<string>("");
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showMRP, setShowMRP] = useState(true);
  const [showSKU, setShowSKU] = useState(true);
  const [customSubtitle, setCustomSubtitle] = useState("Incl. of all taxes");

  const previewSvgRef = useRef<SVGSVGElement | null>(null);

  // Sync products when modal opens
  useEffect(() => {
    if (isOpen) {
      setItems(
        initialProducts.map((p) => ({
          ...p,
          copies: p.copies || 1,
        }))
      );
      if (currentStore?.name) {
        setStoreName(currentStore.name);
      }
    }
  }, [isOpen, initialProducts, currentStore]);

  // Render the live preview of the first selected product
  const previewItem = items[0] || {
    id: "demo",
    name: "Sample Product Item",
    barcode: "FF89012345678",
    barcode_type: "code128",
    price: 499,
    mrp: 599,
    sku: "SKU-001",
    copies: 1,
  };

  useEffect(() => {
    if (previewSvgRef.current && previewItem.barcode) {
      const preset = PRESETS[selectedPreset];
      renderBarcodeToSvg(previewSvgRef.current, previewItem.barcode, {
        format: (previewItem.barcode_type?.toUpperCase() || "CODE128") as BarcodeFormat,
        height: preset.barcodeHeight,
        width: 1.5,
        displayValue: true,
        fontSize: preset.fontSize,
        margin: 2,
      });
    }
  }, [previewItem, selectedPreset, items]);

  const updateItemCopies = (id: string, copies: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, copies: Math.max(1, copies) } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalLabelCount = items.reduce((acc, item) => acc + item.copies, 0);

  // High-precision print handler
  const handlePrintLabels = () => {
    if (items.length === 0) {
      toast.error("No products selected for barcode printing");
      return;
    }

    const preset = PRESETS[selectedPreset];
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to print barcode labels.");
      return;
    }

    // Build the expanded items array based on copies
    const expandedList: LabelProductItem[] = [];
    items.forEach((item) => {
      for (let i = 0; i < item.copies; i++) {
        expandedList.push(item);
      }
    });

    const isRoll = preset.type === "roll";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Labels - FinFlow</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page {
              size: ${isRoll ? `${preset.widthMm}mm ${preset.heightMm}mm` : "A4 portrait"};
              margin: ${isRoll ? "0" : "5mm"};
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            body {
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            ${
              isRoll
                ? `
                .label-page {
                  width: ${preset.widthMm}mm;
                  height: ${preset.heightMm}mm;
                  padding: 1.5mm;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: space-between;
                  text-align: center;
                  page-break-after: always;
                  break-after: page;
                  overflow: hidden;
                }
                `
                : `
                .sheet-grid {
                  display: grid;
                  grid-template-columns: repeat(${preset.cols}, ${preset.widthMm}mm);
                  grid-auto-rows: ${preset.heightMm}mm;
                  gap: 1.5mm;
                  justify-content: center;
                }
                .label-page {
                  width: ${preset.widthMm}mm;
                  height: ${preset.heightMm}mm;
                  padding: 1.5mm;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: space-between;
                  text-align: center;
                  border: 1px dashed #ccc;
                  overflow: hidden;
                }
                `
            }
            .store-title {
              font-size: ${preset.fontSize - 1}px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 95%;
            }
            .product-title {
              font-size: ${preset.fontSize}px;
              font-weight: 600;
              line-height: 1.1;
              max-height: 2.2em;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 95%;
            }
            .barcode-svg {
              width: 90%;
              max-height: ${preset.barcodeHeight}px;
              margin: 0 auto;
            }
            .price-line {
              font-size: ${preset.fontSize}px;
              font-weight: 700;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            }
            .mrp-strike {
              text-decoration: line-through;
              font-weight: normal;
              font-size: ${preset.fontSize - 1}px;
              color: #555;
            }
            .subtitle {
              font-size: ${preset.fontSize - 2}px;
              color: #444;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <div class="${isRoll ? "roll-container" : "sheet-grid"}">
            ${expandedList
              .map(
                (item, idx) => `
              <div class="label-page">
                ${showStoreName && storeName ? `<div class="store-title">${storeName}</div>` : ""}
                ${showProductName ? `<div class="product-title">${item.name}</div>` : ""}
                
                <svg id="barcode-${idx}" class="barcode-svg"></svg>

                <div class="price-line">
                  ${showPrice ? `<span>₹${item.price.toFixed(2)}</span>` : ""}
                  ${showMRP && item.mrp && item.mrp > item.price ? `<span class="mrp-strike">₹${item.mrp.toFixed(2)}</span>` : ""}
                  ${showSKU && item.sku ? `<span style="font-weight:normal; font-size:${preset.fontSize - 2}px">(${item.sku})</span>` : ""}
                </div>

                ${customSubtitle ? `<div class="subtitle">${customSubtitle}</div>` : ""}
              </div>
            `
              )
              .join("")}
          </div>

          <script>
            window.onload = function() {
              const itemsData = ${JSON.stringify(expandedList.map((l) => ({ barcode: l.barcode, type: l.barcode_type })))};
              itemsData.forEach((item, idx) => {
                const el = document.getElementById('barcode-' + idx);
                if (el && item.barcode) {
                  try {
                    JsBarcode(el, item.barcode.trim(), {
                      format: (item.type || 'CODE128').toUpperCase(),
                      width: 1.4,
                      height: ${preset.barcodeHeight},
                      displayValue: true,
                      fontSize: ${preset.fontSize},
                      margin: 1
                    });
                  } catch (e) {
                    console.warn(e);
                  }
                }
              });

              setTimeout(() => {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

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
            {/* Format & Size Presets */}
            <div className="bg-card border border-border/80 p-4 rounded-2xl space-y-3 shadow-xs">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Label Size & Paper Type
              </Label>
              <Select
                value={selectedPreset}
                onValueChange={(val) => setSelectedPreset(val as LabelPresetKey)}
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
                      onCheckedChange={setShowStoreName}
                      id="toggle-store-name"
                    />
                    <label htmlFor="toggle-store-name" className="text-xs text-foreground cursor-pointer font-medium">
                      Store Brand Header
                    </label>
                  </div>
                  {showStoreName && (
                    <Input
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
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
                      onCheckedChange={setShowProductName}
                      id="toggle-prod-name"
                    />
                    <label htmlFor="toggle-prod-name" className="text-xs text-foreground cursor-pointer font-medium">
                      Product Name
                    </label>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Auto-wrapped</span>
                </div>

                {/* Price & MRP */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={showPrice} onCheckedChange={setShowPrice} id="toggle-price" />
                    <label htmlFor="toggle-price" className="text-xs text-foreground cursor-pointer font-medium">
                      Selling Price
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={showMRP} onCheckedChange={setShowMRP} id="toggle-mrp" />
                    <label htmlFor="toggle-mrp" className="text-xs text-foreground cursor-pointer font-medium">
                      Show MRP (Crossed)
                    </label>
                  </div>
                </div>

                {/* SKU Code */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={showSKU} onCheckedChange={setShowSKU} id="toggle-sku" />
                    <label htmlFor="toggle-sku" className="text-xs text-foreground cursor-pointer font-medium">
                      SKU Code
                    </label>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Inventory code</span>
                </div>

                {/* Subtitle / Footer */}
                <div className="space-y-1.5 pt-2 border-t border-border/80">
                  <Label className="text-[11px] text-muted-foreground font-medium">Footer Note / Tax Disclaimer</Label>
                  <Input
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="e.g. Incl. of all taxes"
                    className="h-8 bg-background border-border text-xs text-foreground rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Products & Print Copies Table */}
            <div className="bg-card border border-border/80 p-4 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Products to Print ({items.length})
                </Label>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10 font-semibold">
                  Total {totalLabelCount} Labels
                </Badge>
              </div>

              <div className="divide-y divide-border/60 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{item.name}</div>
                      <div className="font-mono text-muted-foreground text-[11px] flex items-center gap-2 mt-0.5">
                        <span>{item.barcode}</span>
                        <span>• ₹{item.price.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[11px]">Copies:</span>
                      <Input
                        type="number"
                        min="1"
                        max="500"
                        value={item.copies}
                        onChange={(e) => updateItemCopies(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-7 text-center bg-background border-border text-foreground font-mono text-xs rounded-lg"
                      />
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Interactive Visual Label Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
            <div className="w-full text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Label Preview
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Physical scale simulation ({PRESETS[selectedPreset].name})
              </p>
            </div>

            {/* Label Card Simulator */}
            <div className="p-6 bg-muted/30 border border-border/80 rounded-2xl flex items-center justify-center w-full min-h-[300px] shadow-inner">
              <div
                className="bg-white text-black p-3 rounded-md shadow-lg border border-slate-300/80 flex flex-col items-center justify-between text-center transition-all"
                style={{
                  width: `${Math.min(PRESETS[selectedPreset].widthMm * 4.8, 280)}px`,
                  minHeight: `${Math.max(PRESETS[selectedPreset].heightMm * 4.8, 140)}px`,
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
                    <span className="text-[10px] text-slate-500 font-normal">({previewItem.sku})</span>
                  )}
                </div>

                {/* Subtitle */}
                {customSubtitle && (
                  <div className="text-[9px] text-slate-500 mt-0.5">{customSubtitle}</div>
                )}
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>Supports Zebra, TVS, TSC thermal roll printers and standard laser sticker sheets.</p>
              <p className="text-[11px] text-muted-foreground/80">High-resolution vector barcode ensures rapid, accurate optical scanning.</p>
            </div>
          </div>
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
