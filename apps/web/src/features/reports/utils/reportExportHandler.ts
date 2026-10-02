import { downloadReportCSV, printAccountingReport } from "./exportReportUtils";
import { FinFlowReportId, ReportMenuItem } from "../reportMenu";

export interface ReportBusinessInfo {
  name: string;
  gstin: string;
  period: string;
}

export interface ReportExportParams {
  activeReportId: FinFlowReportId;
  activeReportMeta: ReportMenuItem;
  filteredSales: any[];
  filteredPurchases: any[];
  filteredExpenses: any[];
  daybook: any;
  billWiseProfit: any[];
  receivablesAging: any;
  stockSummary: any;
  trialBalance: any;
  allTransactions: any[];
  cashFlow: any;
  profitAndLoss: any;
  balanceSheet: any;
  gstSlabReport: any[];
  itemWiseProfit: any[];
  financialHealth: any;
  businessInfo: ReportBusinessInfo;
}

export function handleReportExcelExport(params: ReportExportParams): void {
  const {
    activeReportId,
    activeReportMeta,
    filteredSales,
    filteredPurchases,
    filteredExpenses,
    daybook,
    billWiseProfit,
    receivablesAging,
    stockSummary,
    trialBalance,
    allTransactions,
    cashFlow,
    profitAndLoss,
    balanceSheet,
    gstSlabReport,
    itemWiseProfit,
    financialHealth,
    businessInfo,
  } = params;

  switch (activeReportId) {
    case "sale_register":
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
      break;

    case "purchase_register":
      downloadReportCSV(
        filteredPurchases,
        [
          { header: "Date", accessor: (p: any) => p.date || p.created_at?.slice(0, 10) },
          { header: "Bill #", accessor: (p: any) => p.bill_number || p.id },
          { header: "Vendor Name", accessor: (p: any) => p.vendor_name },
          { header: "Vendor GSTIN", accessor: (p: any) => p.vendor_gstin || "URP" },
          { header: "Taxable Value (₹)", accessor: (p: any) => p.subtotal || p.total_amount },
          { header: "ITC Tax (₹)", accessor: (p: any) => (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0) },
          { header: "Bill Amount (₹)", accessor: (p: any) => p.total_amount },
          { header: "Paid (₹)", accessor: (p: any) => p.amount_paid || 0 },
          { header: "Balance (₹)", accessor: (p: any) => p.balance_due || 0 },
        ],
        "Purchase_Register",
        businessInfo
      );
      break;

    case "day_book":
      downloadReportCSV(
        daybook.entries,
        [
          { header: "Time", accessor: (e) => e.time },
          { header: "Voucher Type", accessor: (e) => e.voucherType },
          { header: "Voucher #", accessor: (e) => e.voucherNo },
          { header: "Particulars", accessor: (e) => e.particulars },
          { header: "Mode", accessor: (e) => e.paymentMode },
          { header: "Debit Amount (₹)", accessor: (e) => e.debit || "" },
          { header: "Credit Amount (₹)", accessor: (e) => e.credit || "" },
        ],
        `Day_Book_${daybook.date}`,
        businessInfo
      );
      break;

    case "bill_profit":
      downloadReportCSV(
        billWiseProfit,
        [
          { header: "Date", accessor: (b) => b.date?.slice(0, 10) },
          { header: "Invoice #", accessor: (b) => b.invoiceNumber },
          { header: "Customer Name", accessor: (b) => b.customerName },
          { header: "Invoice Value (₹)", accessor: (b) => b.invoiceTotal },
          { header: "Cost of Goods (₹)", accessor: (b) => b.costOfInvoice },
          { header: "Gross Profit (₹)", accessor: (b) => b.profit },
          { header: "Gross Margin (%)", accessor: (b) => b.marginPct.toFixed(2) },
          { header: "Status Tier", accessor: (b) => b.statusTier },
        ],
        "Bill_Wise_Profit",
        businessInfo
      );
      break;

    case "sale_aging":
      downloadReportCSV(
        receivablesAging.parties,
        [
          { header: "Customer Name", accessor: (p) => p.partyName },
          { header: "Phone", accessor: (p) => p.phone || "-" },
          { header: "Total Due (₹)", accessor: (p) => p.totalOutstanding },
          { header: "0-30 Days", accessor: (p) => p.bucket0_30 },
          { header: "31-60 Days", accessor: (p) => p.bucket31_60 },
          { header: "61-90 Days", accessor: (p) => p.bucket61_90 },
          { header: ">90 Days", accessor: (p) => p.bucket90Plus },
          { header: "MSME >45 Days Violation", accessor: (p) => (p.isMsmeExceeded ? "YES" : "NO") },
        ],
        "Sale_Aging_Report",
        businessInfo
      );
      break;

    case "stock_summary":
      downloadReportCSV(
        stockSummary.items,
        [
          { header: "Item Name", accessor: (i) => i.name },
          { header: "SKU / Barcode", accessor: (i) => i.sku },
          { header: "HSN Code", accessor: (i) => i.hsn },
          { header: "Category", accessor: (i) => i.category },
          { header: "Current Stock Qty", accessor: (i) => i.currentStock },
          { header: "Cost Price (₹)", accessor: (i) => i.costPrice },
          { header: "Selling Price (₹)", accessor: (i) => i.sellingPrice },
          { header: "Total Inventory Cost (₹)", accessor: (i) => i.totalCost },
          { header: "Total Retail Value (₹)", accessor: (i) => i.totalRetail },
          { header: "Status", accessor: (i) => i.status },
        ],
        "Stock_Valuation_Summary",
        businessInfo
      );
      break;

    case "trial_balance":
      downloadReportCSV(
        trialBalance.items,
        [
          { header: "Account Particulars", accessor: (i) => i.accountName },
          { header: "Account Type", accessor: (i) => i.accountType },
          { header: "Debit Amount (₹)", accessor: (i) => i.debit || "" },
          { header: "Credit Amount (₹)", accessor: (i) => i.credit || "" },
        ],
        "Trial_Balance",
        businessInfo
      );
      break;

    case "expense_register":
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
      break;

    case "all_transactions":
      downloadReportCSV(
        allTransactions,
        [
          { header: "Date", accessor: (t) => t.date },
          { header: "Type", accessor: (t) => t.type },
          { header: "Reference #", accessor: (t) => t.reference },
          { header: "Party Name", accessor: (t) => t.partyName },
          { header: "Category", accessor: (t) => t.category },
          { header: "Payment Mode", accessor: (t) => t.paymentMode },
          { header: "Amount (₹)", accessor: (t) => t.amount },
          { header: "Status", accessor: (t) => t.status },
        ],
        "All_Transactions_Master_Journal",
        businessInfo
      );
      break;

    case "cash_flow": {
      const cfRows = [
        { particulars: "Cash Receipts from Customers", section: "Operating", amount: cashFlow.cashFromCustomers },
        { particulars: "Cash Paid to Suppliers", section: "Operating", amount: -cashFlow.cashPaidToSuppliers },
        { particulars: "Cash Paid for Operating Expenses", section: "Operating", amount: -cashFlow.cashPaidForExpenses },
        { particulars: "Net Cash from Operating Activities (A)", section: "Operating", amount: cashFlow.netOperatingCashFlow },
        { particulars: "Proceeds from Loans & Borrowings", section: "Financing", amount: cashFlow.borrowingsReceived },
        { particulars: "Loans Given / Advances Repaid", section: "Financing", amount: -cashFlow.loansDisbursed },
        { particulars: "Net Cash from Financing Activities (B)", section: "Financing", amount: cashFlow.netFinancingCashFlow },
        { particulars: "NET INCREASE / (DECREASE) IN CASH & BANK (A + B)", section: "Net Cash Flow", amount: cashFlow.netCashChange },
      ];
      downloadReportCSV(
        cfRows,
        [
          { header: "Activity Particulars", accessor: (r) => r.particulars },
          { header: "Classification", accessor: (r) => r.section },
          { header: "Amount (₹)", accessor: (r) => r.amount },
        ],
        "Cash_Flow_Statement_AS3",
        businessInfo
      );
      break;
    }

    case "pnl": {
      const pnlRows = [
        { particulars: "Gross Sales / Turnover", section: "Revenue", amount: profitAndLoss.grossSalesRevenue },
        { particulars: "Less: Sales Returns & Credit Notes", section: "Revenue", amount: -profitAndLoss.salesReturns },
        { particulars: "Net Revenue from Operations", section: "Revenue", amount: profitAndLoss.netRevenue },
        { particulars: "Purchases of Stock-in-Trade", section: "COGS", amount: profitAndLoss.purchasesCost },
        { particulars: "Direct Production / Packaging Expenses", section: "COGS", amount: profitAndLoss.directExpensesTotal },
        { particulars: "Cost of Goods Sold (COGS)", section: "COGS", amount: profitAndLoss.costOfGoodsSold },
        { particulars: "GROSS PROFIT", section: "Profitability", amount: profitAndLoss.grossProfit },
        ...Object.entries(profitAndLoss.indirectCategories).map(([cat, amt]) => ({ particulars: `Indirect Overhead: ${cat}`, section: "Indirect Expenses", amount: amt })),
        { particulars: "Total Indirect Expenses", section: "Indirect Expenses", amount: profitAndLoss.indirectExpensesTotal },
        { particulars: "NET PROFIT BEFORE TAX", section: "Net Result", amount: profitAndLoss.netProfitBeforeTax },
      ];
      downloadReportCSV(
        pnlRows,
        [
          { header: "Particulars", accessor: (r) => r.particulars },
          { header: "Statement Classification", accessor: (r) => r.section },
          { header: "Amount (₹)", accessor: (r) => r.amount },
        ],
        "Profit_And_Loss_Statement_Schedule_III",
        businessInfo
      );
      break;
    }

    case "balance_sheet": {
      const bsRows = [
        ...Object.entries(balanceSheet.currentAssets).map(([name, val]) => ({ particulars: name, side: "Current Assets", amount: val })),
        { particulars: "Total Current Assets", side: "Current Assets", amount: balanceSheet.totalCurrentAssets },
        { particulars: "TOTAL ASSETS", side: "Application of Funds", amount: balanceSheet.totalAssets },
        ...Object.entries(balanceSheet.currentLiabilities).map(([name, val]) => ({ particulars: name, side: "Current Liabilities", amount: val })),
        { particulars: "Total Current Liabilities", side: "Current Liabilities", amount: balanceSheet.totalCurrentLiabilities },
        { particulars: "Proprietor's Capital Account", side: "Owner's Equity", amount: balanceSheet.proprietorCapital },
        { particulars: "Current Period Profit / Loss", side: "Owner's Equity", amount: balanceSheet.periodProfit },
        { particulars: "TOTAL LIABILITIES & EQUITY", side: "Sources of Funds", amount: balanceSheet.totalLiabilitiesAndEquity },
      ];
      downloadReportCSV(
        bsRows,
        [
          { header: "Account Particulars", accessor: (r) => r.particulars },
          { header: "Balance Sheet Side", accessor: (r) => r.side },
          { header: "Amount (₹)", accessor: (r) => r.amount },
        ],
        "Balance_Sheet_Schedule_III",
        businessInfo
      );
      break;
    }

    case "gstr1":
      downloadReportCSV(
        filteredSales,
        [
          { header: "Date", accessor: (s: any) => s.date || s.created_at?.slice(0, 10) },
          { header: "Invoice #", accessor: (s: any) => s.invoice_number || s.id },
          { header: "Customer Name", accessor: (s: any) => s.customer_name },
          { header: "Customer GSTIN", accessor: (s: any) => s.customer_gstin || "URP" },
          { header: "Taxable Turnover (₹)", accessor: (s: any) => s.subtotal || Number(s.total_amount || 0) - Number(s.tax_amount || s.gst_amount || 0) },
          { header: "Output Tax (₹)", accessor: (s: any) => s.tax_amount || s.gst_amount || 0 },
          { header: "Total Value (₹)", accessor: (s: any) => s.total_amount },
        ],
        "GSTR-1_Sales_Return",
        businessInfo
      );
      break;

    case "gstr2b":
      downloadReportCSV(
        filteredPurchases,
        [
          { header: "Date", accessor: (p: any) => p.date || p.created_at?.slice(0, 10) },
          { header: "Bill #", accessor: (p: any) => p.bill_number || p.id },
          { header: "Vendor Name", accessor: (p: any) => p.vendor_name },
          { header: "Vendor GSTIN", accessor: (p: any) => p.vendor_gstin || "URP" },
          { header: "Taxable Turnover (₹)", accessor: (p: any) => p.subtotal || Number(p.total_amount || 0) - (Number(p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0)) },
          { header: "Eligible ITC (₹)", accessor: (p: any) => (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0) },
          { header: "Total Bill Amount (₹)", accessor: (p: any) => p.total_amount },
        ],
        "GSTR-2B_ITC_Reconciliation",
        businessInfo
      );
      break;

    case "gstr3b": {
      const outTurn = filteredSales.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
      const outTax = filteredSales.reduce((s: number, x: any) => s + Number(x.tax_amount || x.gst_amount || 0), 0);
      const inItc = filteredPurchases.reduce((s: number, x: any) => s + Number(x.cgst || 0) + Number(x.sgst || 0) + Number(x.igst || 0), 0);
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
      break;
    }

    case "gstr9": {
      const totTurnover = filteredSales.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
      const b2bTurnover = filteredSales.filter((x: any) => !!x.customer_gstin && x.customer_gstin.length === 15).reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
      const b2cTurnover = totTurnover - b2bTurnover;
      const totTax = filteredSales.reduce((s: number, x: any) => s + Number(x.tax_amount || x.gst_amount || 0), 0);
      const totItc = filteredPurchases.reduce((s: number, x: any) => s + Number(x.cgst || 0) + Number(x.sgst || 0) + Number(x.igst || 0), 0);
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
      break;
    }

    case "gst_slabs":
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
      break;

    case "item_pnl":
      downloadReportCSV(
        itemWiseProfit,
        [
          { header: "Item Name", accessor: (i) => i.name },
          { header: "Units Sold", accessor: (i) => i.unitsSold },
          { header: "Revenue (₹)", accessor: (i) => i.revenue },
          { header: "Cost (₹)", accessor: (i) => i.cost },
          { header: "Gross Profit (₹)", accessor: (i) => i.profit },
          { header: "Gross Margin (%)", accessor: (i) => i.marginPct.toFixed(2) },
        ],
        "Item_Wise_Profit_And_Loss",
        businessInfo
      );
      break;

    case "expense_category": {
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
      break;
    }

    case "business_health": {
      const healthRows = [
        { metric: "Working Capital (Current Assets - Current Liabilities)", value: `${financialHealth.workingCapital}` },
        { metric: "Current Ratio (Ideal: > 1.33)", value: `${financialHealth.currentRatio.toFixed(2)} : 1` },
        { metric: "Quick / Acid Test Ratio (Ideal: > 1.0)", value: `${financialHealth.quickRatio.toFixed(2)} : 1` },
        { metric: "Debt-to-Equity Ratio", value: `${financialHealth.debtToEquity.toFixed(2)}` },
        { metric: "Cash Runway", value: `${financialHealth.cashRunwayMonths.toFixed(1)} months` },
        { metric: "Total Current Assets", value: `${balanceSheet.totalCurrentAssets}` },
        { metric: "Total Current Liabilities", value: `${balanceSheet.totalCurrentLiabilities}` },
        { metric: "Total Stock Cost Valuation", value: `${stockSummary.totalCostValuation}` },
      ];
      downloadReportCSV(
        healthRows,
        [
          { header: "Financial Diagnostic Metric", accessor: (r) => r.metric },
          { header: "Value / Status", accessor: (r) => r.value },
        ],
        "Business_Health_Solvency_Diagnostic",
        businessInfo
      );
      break;
    }

    default:
      printAccountingReport(activeReportMeta.label.toUpperCase());
      break;
  }
}
