export type BarcodeStatusFilter = "all" | "with_barcode" | "missing_barcode";

export interface BarcodeStats {
  total: number;
  withBarcode: number;
  missing: number;
  coverage: number;
}
