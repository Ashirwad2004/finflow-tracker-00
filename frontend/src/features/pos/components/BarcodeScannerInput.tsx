import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Barcode, Camera, Search, Sparkles } from "lucide-react";
import { CameraScannerModal } from "./CameraScannerModal";
import { HardwareScannerListener } from "@/core/utils/barcode";
import { POSProduct } from "../types";

interface BarcodeScannerInputProps {
  products: POSProduct[];
  onProductFound: (product: POSProduct) => void;
  onBarcodeNotFound: (barcode: string) => void;
  autoFocus?: boolean;
}

export const BarcodeScannerInput: React.FC<BarcodeScannerInputProps> = ({
  products,
  onProductFound,
  onBarcodeNotFound,
  autoFocus = true,
}) => {
  const [query, setQuery] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input on mount and shortcut Ctrl+K
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [autoFocus]);

  // Handle barcode lookup
  const handleBarcodeLookup = (barcodeText: string) => {
    const cleaned = barcodeText.trim().toLowerCase();
    if (!cleaned) return;

    // 1. Exact barcode match
    const matchByBarcode = products.find(
      (p) => p.barcode && p.barcode.trim().toLowerCase() === cleaned
    );
    if (matchByBarcode) {
      onProductFound(matchByBarcode);
      setQuery("");
      return;
    }

    // 2. Exact SKU match
    const matchBySku = products.find(
      (p) => p.sku && p.sku.trim().toLowerCase() === cleaned
    );
    if (matchBySku) {
      onProductFound(matchBySku);
      setQuery("");
      return;
    }

    // 3. Name exact match
    const matchByName = products.find(
      (p) => p.name.trim().toLowerCase() === cleaned
    );
    if (matchByName) {
      onProductFound(matchByName);
      setQuery("");
      return;
    }

    // 4. Barcode not found
    onBarcodeNotFound(barcodeText.trim());
    setQuery("");
  };

  // Attach background hardware scanner listener (captures rapid laser/CCD scanner keystrokes)
  useEffect(() => {
    const scanner = new HardwareScannerListener((scannedBarcode) => {
      handleBarcodeLookup(scannedBarcode);
    });
    scanner.attach();
    return () => scanner.detach();
  }, [products]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) {
        handleBarcodeLookup(query);
      }
    }
  };

  return (
    <div className="relative flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none flex items-center gap-1">
          <Search className="w-4 h-4" />
        </div>
        <Input
          ref={inputRef}
          data-scanner-input="true"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Scan barcode or type name / SKU... (Press Enter)"
          className="pl-9 pr-24 h-11 text-sm bg-background border-border/80 rounded-xl focus-visible:ring-primary shadow-xs"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none">
            Ctrl+K
          </kbd>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setCameraOpen(true)}
        className="h-11 px-3.5 border-border/80 rounded-xl flex items-center gap-2 hover:bg-muted text-foreground shrink-0 shadow-xs font-semibold"
        title="Open Camera Barcode Scanner"
      >
        <Camera className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline text-xs">Camera Scan</span>
      </Button>

      <CameraScannerModal
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onScan={(barcode) => handleBarcodeLookup(barcode)}
      />
    </div>
  );
};
