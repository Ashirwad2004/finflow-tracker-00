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

export interface BarcodeLabelDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: LabelProductItem[];
}

export type LabelPresetKey =
  | "roll_50_25"
  | "roll_38_25"
  | "roll_50_38"
  | "roll_100_50"
  | "a4_24"
  | "a4_65";

export interface LabelPresetConfig {
  name: string;
  type: "roll" | "sheet";
  widthMm: number;
  heightMm: number;
  cols?: number;
  rows?: number;
  fontSize: number;
  barcodeHeight: number;
}
