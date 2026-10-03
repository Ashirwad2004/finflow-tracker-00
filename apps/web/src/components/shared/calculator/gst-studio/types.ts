export type CalcType = "exclusive" | "inclusive";
export type SupplyType = "intra" | "inter";

export interface GstResults {
  baseAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalGst: number;
  totalTax: number;
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  netReceivable: number;
}
