import JsBarcode from "jsbarcode";

export type BarcodeFormat = "CODE128" | "EAN13" | "UPC" | "pharmacode";

export interface RenderBarcodeOptions {
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textMargin?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
}

/**
 * Renders a crisp vector barcode directly into an SVG DOM element.
 */
export function renderBarcodeToSvg(
  svgElement: SVGSVGElement,
  value: string,
  options: RenderBarcodeOptions = {}
): boolean {
  if (!svgElement || !value || !value.trim()) return false;

  try {
    const format = (options.format || "CODE128").toUpperCase() as any;
    JsBarcode(svgElement, value.trim(), {
      format,
      width: options.width ?? 1.8,
      height: options.height ?? 48,
      displayValue: options.displayValue ?? true,
      fontSize: options.fontSize ?? 13,
      textMargin: options.textMargin ?? 2,
      margin: options.margin ?? 4,
      background: options.background ?? "#ffffff",
      lineColor: options.lineColor ?? "#000000",
      valid: (valid) => {
        if (!valid) {
          console.warn(`[JsBarcode] Invalid value "${value}" for format ${format}`);
        }
      },
    });
    return true;
  } catch (err) {
    console.warn("[JsBarcode] Failed to render barcode:", err);
    return false;
  }
}

/**
 * Validates whether an input string conforms to the specified barcode format.
 */
export function validateBarcodeFormat(
  value: string,
  format: string = "code128"
): { valid: boolean; message?: string } {
  const val = value.trim();
  if (!val) return { valid: false, message: "Barcode cannot be empty" };

  const fmt = format.toLowerCase();
  if (fmt === "ean13") {
    if (!/^\d{13}$/.test(val)) {
      return { valid: false, message: "EAN-13 must be exactly 13 digits" };
    }
    // Check digit verification
    const digits = val.slice(0, 12).split("").map(Number);
    const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 1 ? 3 : 1), 0);
    const expected = (10 - (sum % 10)) % 10;
    if (Number(val[12]) !== expected) {
      return { valid: false, message: `Invalid EAN-13 checksum (expected ${expected})` };
    }
    return { valid: true };
  }

  if (fmt === "upca") {
    if (!/^\d{12}$/.test(val)) {
      return { valid: false, message: "UPC-A must be exactly 12 digits" };
    }
    const digits = val.slice(0, 11).split("").map(Number);
    const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
    const expected = (10 - (sum % 10)) % 10;
    if (Number(val[11]) !== expected) {
      return { valid: false, message: `Invalid UPC-A checksum (expected ${expected})` };
    }
    return { valid: true };
  }

  // Code 128 accepts standard printable ASCII
  if (fmt === "code128") {
    if (!/^[\x20-\x7E]+$/.test(val)) {
      return { valid: false, message: "Code 128 only accepts standard printable ASCII characters" };
    }
    if (val.length > 80) {
      return { valid: false, message: "Barcode exceeds maximum length of 80 characters" };
    }
    return { valid: true };
  }

  return { valid: true };
}

/**
 * High-speed hardware barcode scanner listener.
 * USB & Bluetooth retail barcode scanners emit keyboard events rapidly (typically < 40ms per keystroke)
 * followed by an Enter key.
 */
export class HardwareScannerListener {
  private buffer: string = "";
  private lastTime: number = 0;
  private onScanCallback: (barcode: string) => void;
  private thresholdMs: number;
  private listener: (e: KeyboardEvent) => void;

  constructor(onScan: (barcode: string) => void, thresholdMs: number = 50) {
    this.onScanCallback = onScan;
    this.thresholdMs = thresholdMs;

    this.listener = (e: KeyboardEvent) => {
      // Don't capture when typing in textareas or inputs unless specially allowed
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      // If user is actively typing in another input that is NOT the barcode input, let it through
      if (isInput && !target.dataset.scannerInput && e.key !== "Enter") {
        return;
      }

      const now = Date.now();
      const timeDiff = now - this.lastTime;
      this.lastTime = now;

      if (e.key === "Enter") {
        if (this.buffer.length >= 3 && timeDiff < 150) {
          // Valid rapid scanner burst terminating with Enter
          e.preventDefault();
          e.stopPropagation();
          const scanned = this.buffer.trim();
          this.buffer = "";
          this.onScanCallback(scanned);
        } else {
          this.buffer = "";
        }
        return;
      }

      // Ignore modifiers / non-character keys
      if (e.key.length > 1) return;

      // If timing between characters was too slow (> 100ms), reset buffer (manual human typing)
      if (timeDiff > 100) {
        this.buffer = e.key;
      } else {
        this.buffer += e.key;
      }
    };
  }

  public attach(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.listener, true);
    }
  }

  public detach(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.listener, true);
    }
  }
}
