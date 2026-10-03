import { downloadReportCSV } from "../exportReportUtils";
import { ReportBusinessInfo } from "./types";

export function exportSaleRegister(filteredSales: any[], businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    filteredSales,
    [
      { header: "Date", accessor: (s: any) => s.date || s.created_at?.slice(0, 10) },
      { header: "Invoice #", accessor: (s: any) => s.invoice_number || s.id },
      { header: "Customer Name", accessor: (s: any) => s.customer_name },
      { header: "GSTIN", accessor: (s: any) => s.customer_gstin || "URP" },
      { header: "Payment Mode", accessor: (s: any) => s.payment_method || "Cash" },
      { header: "Taxable Value (₹)", accessor: (s: any) => s.subtotal || s.total_amount },
      { header: "Total Tax (₹)", accessor: (s: any) => s.tax_amount || s.gst_amount || 0 },
      { header: "Invoice Amount (₹)", accessor: (s: any) => s.total_amount },
      { header: "Paid (₹)", accessor: (s: any) => s.amount_paid || 0 },
      { header: "Balance (₹)", accessor: (s: any) => s.balance_due || 0 },
      { header: "Status", accessor: (s: any) => s.status },
    ],
    "Sale_Register",
    businessInfo
  );
}

export function exportPurchaseRegister(filteredPurchases: any[], businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    filteredPurchases,
    [
      { header: "Date", accessor: (p: any) => p.date || p.created_at?.slice(0, 10) },
      { header: "Bill #", accessor: (p: any) => p.bill_number || p.id },
      { header: "Vendor Name", accessor: (p: any) => p.vendor_name },
      { header: "Vendor GSTIN", accessor: (p: any) => p.vendor_gstin || "URP" },
      { header: "Taxable Value (₹)", accessor: (p: any) => p.subtotal || p.total_amount },
      {
        header: "ITC Tax (₹)",
        accessor: (p: any) => (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0),
      },
      { header: "Bill Amount (₹)", accessor: (p: any) => p.total_amount },
      { header: "Paid (₹)", accessor: (p: any) => p.amount_paid || 0 },
      { header: "Balance (₹)", accessor: (p: any) => p.balance_due || 0 },
    ],
    "Purchase_Register",
    businessInfo
  );
}

export function exportDayBook(daybook: any, businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    daybook.entries,
    [
      { header: "Time", accessor: (e: any) => e.time },
      { header: "Voucher Type", accessor: (e: any) => e.voucherType },
      { header: "Voucher #", accessor: (e: any) => e.voucherNo },
      { header: "Particulars", accessor: (e: any) => e.particulars },
      { header: "Mode", accessor: (e: any) => e.paymentMode },
      { header: "Debit Amount (₹)", accessor: (e: any) => e.debit || "" },
      { header: "Credit Amount (₹)", accessor: (e: any) => e.credit || "" },
    ],
    `Day_Book_${daybook.date}`,
    businessInfo
  );
}

export function exportBillProfit(billWiseProfit: any[], businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    billWiseProfit,
    [
      { header: "Date", accessor: (b: any) => b.date?.slice(0, 10) },
      { header: "Invoice #", accessor: (b: any) => b.invoiceNumber },
      { header: "Customer Name", accessor: (b: any) => b.customerName },
      { header: "Invoice Value (₹)", accessor: (b: any) => b.invoiceTotal },
      { header: "Cost of Goods (₹)", accessor: (b: any) => b.costOfInvoice },
      { header: "Gross Profit (₹)", accessor: (b: any) => b.profit },
      { header: "Gross Margin (%)", accessor: (b: any) => b.marginPct.toFixed(2) },
      { header: "Status Tier", accessor: (b: any) => b.statusTier },
    ],
    "Bill_Wise_Profit",
    businessInfo
  );
}

export function exportSaleAging(receivablesAging: any, businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    receivablesAging.parties,
    [
      { header: "Customer Name", accessor: (p: any) => p.partyName },
      { header: "Phone", accessor: (p: any) => p.phone || "-" },
      { header: "Total Due (₹)", accessor: (p: any) => p.totalOutstanding },
      { header: "0-30 Days", accessor: (p: any) => p.bucket0_30 },
      { header: "31-60 Days", accessor: (p: any) => p.bucket31_60 },
      { header: "61-90 Days", accessor: (p: any) => p.bucket61_90 },
      { header: ">90 Days", accessor: (p: any) => p.bucket90Plus },
      { header: "MSME >45 Days Violation", accessor: (p: any) => (p.isMsmeExceeded ? "YES" : "NO") },
    ],
    "Sale_Aging_Report",
    businessInfo
  );
}

export function exportStockSummary(stockSummary: any, businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    stockSummary.items,
    [
      { header: "Item Name", accessor: (i: any) => i.name },
      { header: "SKU / Barcode", accessor: (i: any) => i.sku },
      { header: "HSN Code", accessor: (i: any) => i.hsn },
      { header: "Category", accessor: (i: any) => i.category },
      { header: "Current Stock Qty", accessor: (i: any) => i.currentStock },
      { header: "Cost Price (₹)", accessor: (i: any) => i.costPrice },
      { header: "Selling Price (₹)", accessor: (i: any) => i.sellingPrice },
      { header: "Total Inventory Cost (₹)", accessor: (i: any) => i.totalCost },
      { header: "Total Retail Value (₹)", accessor: (i: any) => i.totalRetail },
      { header: "Status", accessor: (i: any) => i.status },
    ],
    "Stock_Valuation_Summary",
    businessInfo
  );
}

export function exportExpenseRegister(filteredExpenses: any[], businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    filteredExpenses,
    [
      { header: "Date", accessor: (e: any) => e.date?.slice(0, 10) },
      { header: "Description", accessor: (e: any) => e.title || e.description },
      { header: "Category", accessor: (e: any) => e.categories?.name || e.category || "General" },
      { header: "Payment Mode", accessor: (e: any) => e.payment_method || "Cash" },
      { header: "Amount (₹)", accessor: (e: any) => e.amount },
    ],
    "Expense_Register",
    businessInfo
  );
}

export function exportAllTransactions(allTransactions: any[], businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    allTransactions,
    [
      { header: "Date", accessor: (t: any) => t.date },
      { header: "Type", accessor: (t: any) => t.type },
      { header: "Reference #", accessor: (t: any) => t.reference },
      { header: "Party Name", accessor: (t: any) => t.partyName },
      { header: "Category", accessor: (t: any) => t.category },
      { header: "Payment Mode", accessor: (t: any) => t.paymentMode },
      { header: "Amount (₹)", accessor: (t: any) => t.amount },
      { header: "Status", accessor: (t: any) => t.status },
    ],
    "All_Transactions_Master_Journal",
    businessInfo
  );
}

export function exportItemProfit(itemWiseProfit: any[], businessInfo: ReportBusinessInfo): void {
  downloadReportCSV(
    itemWiseProfit,
    [
      { header: "Item Name", accessor: (i: any) => i.name },
      { header: "Units Sold", accessor: (i: any) => i.unitsSold },
      { header: "Revenue (₹)", accessor: (i: any) => i.revenue },
      { header: "Cost (₹)", accessor: (i: any) => i.cost },
      { header: "Gross Profit (₹)", accessor: (i: any) => i.profit },
      { header: "Gross Margin (%)", accessor: (i: any) => i.marginPct.toFixed(2) },
    ],
    "Item_Wise_Profit_And_Loss",
    businessInfo
  );
}

export function exportExpenseCategory(filteredExpenses: any[], businessInfo: ReportBusinessInfo): void {
  const catMap = new Map<string, number>();
  let totalAll = 0;
  filteredExpenses.forEach((e: any) => {
    const amt = Number(e.amount || 0);
    const cat = e.categories?.name || e.category || "General";
    totalAll += amt;
    catMap.set(cat, (catMap.get(cat) || 0) + amt);
  });
  const catRows = Array.from(catMap.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalAll > 0 ? (amount / totalAll) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  downloadReportCSV(
    catRows,
    [
      { header: "Expense Category", accessor: (c) => c.name },
      { header: "Total Amount (₹)", accessor: (c) => c.amount },
      { header: "Share (%)", accessor: (c) => c.percentage.toFixed(2) },
    ],
    "Expense_Category_Summary",
    businessInfo
  );
}
