export type GstViewPreference = "gstr1" | "gstr2b" | "gstr3b" | "reconciliation";

export interface GstStateInfo {
  code: string;
  name: string;
}

export interface GstPeriodInfo {
  id: string;
  label: string;
  start: Date;
  end: Date;
}

export interface GstSummaryData {
  outwardTaxable: number;
  igstOutput: number;
  cgstOutput: number;
  sgstOutput: number;
  totalOutputTax: number;
  inwardTaxable: number;
  igstInput: number;
  cgstInput: number;
  sgstInput: number;
  totalInputTax: number;
  netTaxPayable: number;
}
