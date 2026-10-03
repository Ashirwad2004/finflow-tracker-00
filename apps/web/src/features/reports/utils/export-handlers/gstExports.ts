import { downloadReportCSV } from "../exportReportUtils";
import { ReportBusinessInfo } from "./types";

export function exportGstr1(filteredSales: any[], businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    filteredSales,
    [
      { header: "Date", accessor: (s: any) => s.date || s.created_at?.slice(0, 10) },
      { header: "Invoice #", accessor: (s: any) => s.invoice_number || s.id },
      { header: "Customer Name", accessor: (s: any) => s.customer_name },
      { header: "Customer GSTIN", accessor: (s: any) => s.customer_gstin || "URP" },
      {
        header: "Taxable Turnover (₹)",
        accessor: (s: any) =>
          s.subtotal || Number(s.total_amount || 0) - Number(s.tax_amount || s.gst_amount || 0),
      },
      { header: "Output Tax (₹)", accessor: (s: any) => s.tax_amount || s.gst_amount || 0 },
      { header: "Total Value (₹)", accessor: (s: any) => s.total_amount },
    ],
    "GSTR-1_Sales_Return",
    businessInfo
  );
}

export function exportGstr2b(filteredPurchases: any[], businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    filteredPurchases,
    [
      { header: "Date", accessor: (p: any) => p.date || p.created_at?.slice(0, 10) },
      { header: "Bill #", accessor: (p: any) => p.bill_number || p.id },
      { header: "Vendor Name", accessor: (p: any) => p.vendor_name },
      { header: "Vendor GSTIN", accessor: (p: any) => p.vendor_gstin || "URP" },
      {
        header: "Taxable Turnover (₹)",
        accessor: (p: any) =>
          p.subtotal ||
          Number(p.total_amount || 0) -
            (Number(p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0)),
      },
      {
        header: "Eligible ITC (₹)",
        accessor: (p: any) => (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0),
      },
      { header: "Total Bill Amount (₹)", accessor: (p: any) => p.total_amount },
    ],
    "GSTR-2B_ITC_Reconciliation",
    businessInfo
  );
}

export function exportGstr3b(
  filteredSales: any[],
  filteredPurchases: any[],
  businessInfo: ReportBusinessInfo
): void {
  const outTurn = filteredSales.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
  const outTax = filteredSales.reduce(
    (s: number, x: any) => s + Number(x.tax_amount || x.gst_amount || 0),
    0
  );
  const inItc = filteredPurchases.reduce(
    (s: number, x: any) => s + Number(x.cgst || 0) + Number(x.sgst || 0) + Number(x.igst || 0),
    0
  );
  const gstr3bRows = [
    { table: "3.1(a) Outward Taxable Turnover", amount: outTurn },
    { table: "3.1 Total Output Tax Liability", amount: outTax },
    { table: "4(A) Eligible Input Tax Credit (ITC)", amount: inItc },
    { table: "6.1 Net Tax Payable in Cash", amount: Math.max(0, outTax - inItc) },
  ];
  downloadReportCSV(
    gstr3bRows,
    [
      { header: "GSTR-3B Table", accessor: (r) => r.table },
      { header: "Amount (₹)", accessor: (r) => r.amount },
    ],
    "GSTR-3B_Monthly_Summary",
    businessInfo
  );
}

export function exportGstr9(
  filteredSales: any[],
  filteredPurchases: any[],
  businessInfo: ReportBusinessInfo
): void {
  const totTurnover = filteredSales.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
  const b2bTurnover = filteredSales
    .filter((x: any) => !!x.customer_gstin && x.customer_gstin.length === 15)
    .reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
  const b2cTurnover = totTurnover - b2bTurnover;
  const totTax = filteredSales.reduce(
    (s: number, x: any) => s + Number(x.tax_amount || x.gst_amount || 0),
    0
  );
  const totItc = filteredPurchases.reduce(
    (s: number, x: any) => s + Number(x.cgst || 0) + Number(x.sgst || 0) + Number(x.igst || 0),
    0
  );
  const gstr9Rows = [
    { section: "Table 4A: B2B Registered Outward Supplies", amount: b2bTurnover },
    { section: "Table 4B: B2C Unregistered Consumer Supplies", amount: b2cTurnover },
    { section: "Table 4N: Total Declared Turnover", amount: totTurnover },
    { section: "Table 9: Total Output Tax Payable", amount: totTax },
    { section: "Table 6A: Cumulative Input Tax Credit Availed", amount: totItc },
  ];
  downloadReportCSV(
    gstr9Rows,
    [
      { header: "GSTR-9 Annual Return Section", accessor: (r) => r.section },
      { header: "Amount (₹)", accessor: (r) => r.amount },
    ],
    "GSTR-9_Annual_Return",
    businessInfo
  );
}

export function exportGstSlabs(gstSlabReport: any[], businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    gstSlabReport,
    [
      { header: "GST Slab", accessor: (s) => `${s.rate}% GST` },
      { header: "Taxable Turnover (₹)", accessor: (s) => s.taxableValue },
      { header: "CGST (₹)", accessor: (s) => s.cgst },
      { header: "SGST (₹)", accessor: (s) => s.sgst },
      { header: "IGST (₹)", accessor: (s) => s.igst },
      { header: "Total Tax (₹)", accessor: (s) => s.totalTax },
      { header: "Invoices Count", accessor: (s) => s.invoiceCount },
    ],
    "GST_Slab_Wise_Summary",
    businessInfo
  );
}
