export type GstViewPreference = 'gstr1' | 'gstr2b' | 'gstr3b' | 'reconciliation';

export interface GstStateOption {
  code: string;
  name: string;
}

export interface GstPeriod {
  label: string;
  from: Date;
  to: Date;
}

export interface TaxBreakdown {
  igst: number;
  cgst: number;
  sgst: number;
  total: number;
}

export interface NetTaxBreakdown {
  igst: number;
  cgst: number;
  sgst: number;
  payable: number;
  credit: number;
}

export interface GstReconciliationData {
  salesCount: number;
  purchasesCount: number;
  outwardTaxable: number;
  inwardTaxable: number;
  output: TaxBreakdown;
  itc: TaxBreakdown;
  net: NetTaxBreakdown;
}
