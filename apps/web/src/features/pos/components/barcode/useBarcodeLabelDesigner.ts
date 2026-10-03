import { useState, useEffect, useRef } from "react";
import { renderBarcodeToSvg, BarcodeFormat } from "@/core/utils/barcode";
import { LabelProductItem, LabelPresetKey } from "./types";
import { PRESETS } from "./constants";
import { printBarcodeLabels } from "./printLabels";

export function useBarcodeLabelDesigner(isOpen: boolean, initialProducts: LabelProductItem[]) {
  const [items, setItems] = useState<LabelProductItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<LabelPresetKey>("roll_50_25");
  const [storeName, setStoreName] = useState<string>(() => {
    return localStorage.getItem("rupeebill_business_name") || "Retail Store";
  });
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
      const saved = localStorage.getItem("rupeebill_business_name");
      if (saved) {
        setStoreName(saved);
      }
    }
  }, [isOpen, initialProducts]);

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

  const handlePrintLabels = () => {
    printBarcodeLabels({
      items,
      preset: PRESETS[selectedPreset],
      storeName,
      showStoreName,
      showProductName,
      showPrice,
      showMRP,
      showSKU,
      customSubtitle,
    });
  };

  return {
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
  };
}
