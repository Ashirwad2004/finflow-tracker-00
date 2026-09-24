import React, { useState, useMemo } from "react";
import { useAccountingData, DatePeriodPreset } from "../../hooks/useAccountingData";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Download,
  Printer,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Clock,
  Scale,
  Building,
  Layers,
  Receipt,
  Users,
  Boxes,
  Wallet,
  ClipboardList,
  ShieldCheck,
  Activity,
  FileText,
  Percent,
  ChevronRight,
  Filter,
  ArrowRight,
  ArrowUpDown,
  ShoppingBag,
  Maximize2,
  Minimize2,
  PanelLeft,
} from "lucide-react";
import { downloadReportCSV, printAccountingReport } from "../../utils/exportReportUtils";
import { DetailedPartyReport } from "../DetailedPartyReport";
import { PartyReport } from "../PartyReport";
import { SalesOrderRegister } from "../orders/SalesOrderRegister";
import { PurchaseOrderRegister } from "../orders/PurchaseOrderRegister";
import { useAuth } from "@/core/lib/auth";

export type FinFlowReportId =
  // 1. Transaction
  | "sale_register"
  | "purchase_register"
  | "day_book"
  | "all_transactions"
  | "bill_profit"
  | "cash_flow"
  // 2. Accounting & CA
  | "pnl"
  | "balance_sheet"
  | "trial_balance"
  // 3. Party
  | "party_statement"
  | "party_outstanding"
  | "sale_aging"
  // 4. GST
  | "gstr1"
  | "gstr2b"
  | "gstr3b"
  | "gstr9"
  | "gst_slabs"
  // 5. Stock & Inventory
  | "stock_summary"
  | "item_pnl"
  // 6. Expenses
  | "expense_register"
  | "expense_category"
  // 7. Orders
  | "sale_orders"
  | "purchase_orders"
  // 8. Business Status
  | "business_health";

export interface ReportMenuItem {
  id: FinFlowReportId;
  label: string;
  category: string;
  tag?: string;
  icon: any;
}

export const FINFLOW_REPORTS_MENU: ReportMenuItem[] = [
  // Transaction Reports
  { id: "sale_register", label: "Sale Register", category: "Transaction Reports", icon: TrendingUp },
  { id: "purchase_register", label: "Purchase Register", category: "Transaction Reports", icon: TrendingDown },
  { id: "day_book", label: "Day Book", category: "Transaction Reports", tag: "Daily", icon: Calendar },
  { id: "all_transactions", label: "All Transactions", category: "Transaction Reports", icon: FileText },
  { id: "bill_profit", label: "Bill-Wise Profit", category: "Transaction Reports", icon: Receipt },
  { id: "cash_flow", label: "Cash Flow Statement", category: "Transaction Reports", tag: "AS-3", icon: ArrowUpDown },

  // Accounting & CA
  { id: "pnl", label: "Profit & Loss Account", category: "Accounting & CA", tag: "P&L", icon: Scale },
  { id: "balance_sheet", label: "Balance Sheet", category: "Accounting & CA", tag: "Sch-III", icon: Building },
  { id: "trial_balance", label: "Trial Balance", category: "Accounting & CA", tag: "Double-Entry", icon: Layers },

  // Party Reports
  { id: "party_statement", label: "Party Statement (Ledger)", category: "Party Reports", icon: Users },
  { id: "party_outstanding", label: "Party Outstanding", category: "Party Reports", icon: Users },
  { id: "sale_aging", label: "Sale Aging Report", category: "Party Reports", tag: "MSME 45D", icon: Clock },

  // GST Reports
  { id: "gstr1", label: "GSTR-1 (Sales Return)", category: "GST Reports", tag: "Portal", icon: ShieldCheck },
  { id: "gstr2b", label: "GSTR-2B (Purchases ITC)", category: "GST Reports", icon: ShieldCheck },
  { id: "gstr3b", label: "GSTR-3B (Monthly Summary)", category: "GST Reports", icon: ShieldCheck },
  { id: "gstr9", label: "GSTR-9 (Annual Return)", category: "GST Reports", tag: "Annual", icon: ShieldCheck },
  { id: "gst_slabs", label: "GST Rate / Slab-Wise", category: "GST Reports", tag: "0-28%", icon: Percent },

  // Stock Reports
  { id: "stock_summary", label: "Stock Valuation Summary", category: "Item & Stock", tag: "Cost", icon: Boxes },
  { id: "item_pnl", label: "Item-Wise Profit & Loss", category: "Item & Stock", icon: TrendingUp },

  // Expenses
  { id: "expense_register", label: "Expense Transaction Register", category: "Expense Reports", icon: Wallet },
  { id: "expense_category", label: "Expense Category Summary", category: "Expense Reports", icon: Wallet },

  // Orders
  { id: "sale_orders", label: "Sale Orders Register", category: "Order Reports", icon: ShoppingBag },
  { id: "purchase_orders", label: "Purchase Orders Register", category: "Order Reports", icon: ClipboardList },

  // Business Status
  { id: "business_health", label: "Business Health & Solvency", category: "Business Status", tag: "Audit", icon: Activity },
];

export const FinFlowReportsStudio: React.FC<{
  accounting: ReturnType<typeof useAccountingData>;
  initialReportId?: FinFlowReportId;
  initialParty?: string | null;
}> = ({ accounting, initialReportId = "sale_register", initialParty = null }) => {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { formatCurrency } = useCurrency();

  const [activeReportId, setActiveReportId] = useState<FinFlowReportId>(initialReportId);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync fullscreen state with document fullscreenchange
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const {
    profile,
    filteredSales,
    filteredPurchases,
    filteredExpenses,
    profitAndLoss,
    billWiseProfit,
    receivablesAging,
    daybook,
    allTransactions,
    cashFlow,
    trialBalance,
    balanceSheet,
    gstSlabReport,
    stockSummary,
    itemWiseProfit,
    financialHealth,
    periodPreset,
    setPeriodPreset,
    customRange,
    setCustomRange,
    activeDateRange,
    daybookDate,
    setDaybookDate,
    refetchAll,
  } = accounting;

  const businessInfo = {
    name: profile?.business_name || profile?.company_name || "My Business",
    gstin: profile?.gstin || "URP",
    period: `${activeDateRange.from.toLocaleDateString("en-IN")} - ${activeDateRange.to.toLocaleDateString("en-IN")}`,
  };

  // Filtered Sidebar Menu
  const filteredMenu = useMemo(() => {
    if (!sidebarSearch.trim()) return FINFLOW_REPORTS_MENU;
    const q = sidebarSearch.toLowerCase();
    return FINFLOW_REPORTS_MENU.filter(
      (m) => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    );
  }, [sidebarSearch]);

  // Group by category
  const categoriesMap = useMemo(() => {
    const map = new Map<string, ReportMenuItem[]>();
    filteredMenu.forEach((item) => {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    });
    return map;
  }, [filteredMenu]);

  const activeReportMeta = useMemo(() => {
    return FINFLOW_REPORTS_MENU.find((m) => m.id === activeReportId) || FINFLOW_REPORTS_MENU[0];
  }, [activeReportId]);

  // Switch active report
  const handleSelectReport = (id: FinFlowReportId) => {
    setActiveReportId(id);
    setCurrentPage(1);
    setTableSearch("");
  };

  // =========================================================================
  // EXPORT HANDLER (EXCEL / CSV)
  // =========================================================================
  const handleExportExcel = () => {
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
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col lg:flex-row h-full min-h-0 max-h-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none w-screen h-screen p-0 m-0"
          : ""
      }`}
    >
      {/* =================================================================== */}
      {/* LEFT SIDEBAR: FinFlow Report Directory                              */}
      {/* =================================================================== */}
      <aside
        className={`${
          isSidebarCollapsed ? "hidden" : "flex"
        } w-full lg:w-[280px] shrink-0 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex-col h-auto max-h-[220px] lg:max-h-none lg:h-full min-h-0 overflow-hidden transition-all`}
      >
        {/* Sidebar Header & Search */}
        <div className="shrink-0 p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              FinFlow Reports ({FINFLOW_REPORTS_MENU.length})
            </span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              placeholder="Search reports..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Categorized Report List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {Array.from(categoriesMap.entries()).map(([category, items]) => (
            <div key={category} className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {category}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeReportId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectReport(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        isSelected
                          ? "bg-blue-600 text-white font-semibold shadow-xs"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.tag && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {item.tag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* =================================================================== */}
      {/* RIGHT MAIN WORKSPACE: High-Density Active Report View               */}
      {/* =================================================================== */}
      <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 h-full min-h-0 overflow-hidden">
        {/* 1. TOP RIBBON: Report Title + Date Controls + Export Buttons */}
        <div className="shrink-0 p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col xl:flex-row xl:items-center justify-between gap-3 z-10">
          {/* Title & Category Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {activeReportMeta.category}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {activeReportMeta.label}
              </h2>
            </div>
          </div>

          {/* Controls: Date Picker + Search + Excel/Print */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Preset Dropdown */}
            <Select
              value={periodPreset}
              onValueChange={(val) => setPeriodPreset(val as DatePeriodPreset)}
            >
              <SelectTrigger className="w-[155px] h-8 text-xs font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="q1">Q1 (Apr–Jun)</SelectItem>
                <SelectItem value="q2">Q2 (Jul–Sep)</SelectItem>
                <SelectItem value="q3">Q3 (Oct–Dec)</SelectItem>
                <SelectItem value="q4">Q4 (Jan–Mar)</SelectItem>
                <SelectItem value="this_fy">Current FY (2025-26)</SelectItem>
                <SelectItem value="last_fy">Previous FY (2024-25)</SelectItem>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* If Custom Date Range, show From & To dates */}
            {periodPreset === "custom" && (
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  className="w-32 h-8 text-xs bg-white dark:bg-slate-800"
                  onChange={(e) =>
                    setCustomRange((prev) => ({
                      ...prev,
                      from: e.target.value ? new Date(e.target.value) : undefined,
                    }))
                  }
                />
                <span className="text-xs text-slate-400">-</span>
                <Input
                  type="date"
                  className="w-32 h-8 text-xs bg-white dark:bg-slate-800"
                  onChange={(e) =>
                    setCustomRange((prev) => ({
                      ...prev,
                      to: e.target.value ? new Date(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            )}

            {/* Quick in-table search box */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Filter table..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 h-8 w-36 sm:w-44 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Excel Export Button */}
            <Button
              size="sm"
              onClick={handleExportExcel}
              className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (CSV)
            </Button>

            {/* Print / PDF Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => printAccountingReport(activeReportMeta.label.toUpperCase())}
              className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              Print / PDF
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={refetchAll}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
              title="Refresh register"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>

            {/* Sidebar Collapse/Expand Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              title={isSidebarCollapsed ? "Show reports menu sidebar" : "Hide reports menu sidebar"}
            >
              <PanelLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">{isSidebarCollapsed ? "Menu" : "Collapse"}</span>
            </Button>

            {/* Full Screen Mode Toggle */}
            <Button
              variant={isFullscreen ? "default" : "outline"}
              size="sm"
              onClick={toggleFullscreen}
              className={`h-8 px-2.5 text-xs font-semibold gap-1.5 ${
                isFullscreen
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              }`}
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 2. REPORT CONTENT BODY */}
        <div
          className={`flex-1 min-h-0 flex flex-col ${
            [
              "pnl",
              "balance_sheet",
              "cash_flow",
              "business_health",
              "gstr3b",
              "gstr9",
              "expense_category",
            ].includes(activeReportId)
              ? "overflow-y-auto p-3 sm:p-4 space-y-4"
              : "overflow-hidden p-2 sm:p-3"
          } scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-slate-500 scrollbar-track-slate-100 dark:scrollbar-track-slate-800/40`}
        >
          {/* =============================================================== */}
          {/* REPORT: SALE REGISTER                                            */}
          {/* =============================================================== */}
          {activeReportId === "sale_register" && (
            <SaleRegisterTable
              sales={filteredSales}
              search={tableSearch}
              formatCurrency={formatCurrency}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: PURCHASE REGISTER                                        */}
          {/* =============================================================== */}
          {activeReportId === "purchase_register" && (
            <PurchaseRegisterTable
              purchases={filteredPurchases}
              search={tableSearch}
              formatCurrency={formatCurrency}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: DAY BOOK                                                 */}
          {/* =============================================================== */}
          {activeReportId === "day_book" && (
            <DayBookTable
              daybook={daybook}
              daybookDate={daybookDate}
              setDaybookDate={setDaybookDate}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: ALL TRANSACTIONS                                         */}
          {/* =============================================================== */}
          {activeReportId === "all_transactions" && (
            <AllTransactionsTable
              transactions={allTransactions}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: BILL-WISE PROFIT                                         */}
          {/* =============================================================== */}
          {activeReportId === "bill_profit" && (
            <BillWiseProfitTable
              data={billWiseProfit}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: CASH FLOW STATEMENT                                      */}
          {/* =============================================================== */}
          {activeReportId === "cash_flow" && (
            <CashFlowView cashFlow={cashFlow} formatCurrency={formatCurrency} />
          )}

          {/* =============================================================== */}
          {/* REPORT: PROFIT AND LOSS                                          */}
          {/* =============================================================== */}
          {activeReportId === "pnl" && (
            <ProfitAndLossView pnl={profitAndLoss} formatCurrency={formatCurrency} />
          )}

          {/* =============================================================== */}
          {/* REPORT: BALANCE SHEET                                            */}
          {/* =============================================================== */}
          {activeReportId === "balance_sheet" && (
            <BalanceSheetView bs={balanceSheet} formatCurrency={formatCurrency} />
          )}

          {/* =============================================================== */}
          {/* REPORT: TRIAL BALANCE                                            */}
          {/* =============================================================== */}
          {activeReportId === "trial_balance" && (
            <TrialBalanceView tb={trialBalance} formatCurrency={formatCurrency} />
          )}

          {/* =============================================================== */}
          {/* REPORT: PARTY STATEMENT (DETAILED LEDGER)                         */}
          {/* =============================================================== */}
          {activeReportId === "party_statement" && (
            <DetailedPartyReport initialPartyName={initialParty} />
          )}

          {/* =============================================================== */}
          {/* REPORT: PARTY OUTSTANDING                                        */}
          {/* =============================================================== */}
          {activeReportId === "party_outstanding" && (
            <PartyReport onSelectPartyForLedger={(name) => setActiveReportId("party_statement")} />
          )}

          {/* =============================================================== */}
          {/* REPORT: SALE AGING REPORT                                        */}
          {/* =============================================================== */}
          {activeReportId === "sale_aging" && (
            <SaleAgingTable
              aging={receivablesAging}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: GSTR-1                                                   */}
          {/* =============================================================== */}
          {activeReportId === "gstr1" && (
            <GstrSummaryTable
              sales={filteredSales}
              formatCurrency={formatCurrency}
              gstin={profile?.gstin}
              type="gstr1"
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: GSTR-2B                                                  */}
          {/* =============================================================== */}
          {activeReportId === "gstr2b" && (
            <GstrSummaryTable
              purchases={filteredPurchases}
              formatCurrency={formatCurrency}
              gstin={profile?.gstin}
              type="gstr2b"
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: GSTR-3B                                                  */}
          {/* =============================================================== */}
          {activeReportId === "gstr3b" && (
            <Gstr3BView
              sales={filteredSales}
              purchases={filteredPurchases}
              formatCurrency={formatCurrency}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: GSTR-9 (ANNUAL RETURN)                                   */}
          {/* =============================================================== */}
          {activeReportId === "gstr9" && (
            <Gstr9AnnualView
              sales={filteredSales}
              purchases={filteredPurchases}
              formatCurrency={formatCurrency}
              gstin={profile?.gstin}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: GST SLABS ANALYSIS                                       */}
          {/* =============================================================== */}
          {activeReportId === "gst_slabs" && (
            <GstSlabsTable slabs={gstSlabReport} formatCurrency={formatCurrency} />
          )}

          {/* =============================================================== */}
          {/* REPORT: STOCK SUMMARY                                            */}
          {/* =============================================================== */}
          {activeReportId === "stock_summary" && (
            <StockSummaryTable
              stock={stockSummary}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: ITEM-WISE PROFIT & LOSS                                  */}
          {/* =============================================================== */}
          {activeReportId === "item_pnl" && (
            <ItemWisePnlTable
              items={itemWiseProfit}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: EXPENSE REGISTER                                         */}
          {/* =============================================================== */}
          {activeReportId === "expense_register" && (
            <ExpenseRegisterTable
              expenses={filteredExpenses}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: EXPENSE CATEGORY SUMMARY                                 */}
          {/* =============================================================== */}
          {activeReportId === "expense_category" && (
            <ExpenseCategoryTable
              expenses={filteredExpenses}
              formatCurrency={formatCurrency}
            />
          )}

          {/* =============================================================== */}
          {/* REPORT: SALE ORDERS                                              */}
          {/* =============================================================== */}
          {activeReportId === "sale_orders" && (
            <SalesOrderRegister userId={userId} parties={accounting.allParties} products={accounting.allProducts} />
          )}

          {/* =============================================================== */}
          {/* REPORT: PURCHASE ORDERS                                          */}
          {/* =============================================================== */}
          {activeReportId === "purchase_orders" && (
            <PurchaseOrderRegister userId={userId} parties={accounting.allParties} products={accounting.allProducts} />
          )}

          {/* =============================================================== */}
          {/* REPORT: BUSINESS HEALTH & SOLVENCY                               */}
          {/* =============================================================== */}
          {activeReportId === "business_health" && (
            <BusinessHealthDiagnosticView
              health={financialHealth}
              bs={balanceSheet}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </main>
    </div>
  );
};

// ===========================================================================
// HIGH-DENSITY REPORT VIEWS (COMPACT, FAST, PINNED FOOTER TOTALS)
// ===========================================================================

// 1. SALE REGISTER TABLE
function SaleRegisterTable({ sales, search, formatCurrency }: any) {
  const filtered = useMemo(() => {
    if (!search) return sales;
    const q = search.toLowerCase();
    return sales.filter(
      (s: any) =>
        (s.invoice_number && s.invoice_number.toLowerCase().includes(q)) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q))
    );
  }, [sales, search]);

  const totals = useMemo(() => {
    let taxable = 0;
    let tax = 0;
    let total = 0;
    let paid = 0;
    let balance = 0;
    filtered.forEach((s: any) => {
      const tot = Number(s.total_amount || 0);
      const pd = Number(s.amount_paid || 0);
      const bal = s.balance_due !== undefined ? Number(s.balance_due) : tot - pd;
      const tx = Number(s.tax_amount || s.gst_amount || 0);
      const txbl = Number(s.subtotal || tot - tx);
      taxable += txbl;
      tax += tx;
      total += tot;
      paid += pd;
      balance += bal;
    });
    return { taxable, tax, total, paid, balance };
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      {/* Compact KPI Ribbon */}
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Invoices: <span className="font-bold text-slate-900 dark:text-slate-100">{filtered.length}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Taxable: <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.taxable)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Tax: <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.tax)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Amount: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totals.total)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Paid: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.paid)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Balance Due: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totals.balance)}</span>
        </div>
      </div>

      {/* Grid Table Container - Fills 100% remaining height with smooth internal scrolling */}
      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Date</th>
              <th className="py-2.5 px-3 w-28 bg-slate-100 dark:bg-slate-800">Invoice #</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Customer Name</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Payment</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Taxable (₹)</th>
              <th className="py-2.5 px-3 text-right w-24 bg-slate-100 dark:bg-slate-800">Tax (₹)</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Total (₹)</th>
              <th className="py-2.5 px-3 text-right w-24 bg-slate-100 dark:bg-slate-800">Paid (₹)</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Due (₹)</th>
              <th className="py-2.5 px-3 text-center w-20 bg-slate-100 dark:bg-slate-800">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((s: any) => {
              const tot = Number(s.total_amount || 0);
              const pd = Number(s.amount_paid || 0);
              const bal = s.balance_due !== undefined ? Number(s.balance_due) : tot - pd;
              const tx = Number(s.tax_amount || s.gst_amount || 0);
              const txbl = Number(s.subtotal || tot - tx);

              return (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {(s.date || s.created_at || "").slice(0, 10)}
                  </td>
                  <td className="py-1.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {s.invoice_number || `INV-${s.id?.slice(0, 6)}`}
                  </td>
                  <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {s.customer_name || "Direct Customer"}
                  </td>
                  <td className="py-1.5 px-3 text-slate-500">{s.payment_method || "Cash"}</td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums">{formatCurrency(txbl)}</td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-500">
                    {formatCurrency(tx)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold">
                    {formatCurrency(tot)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-600">
                    {formatCurrency(pd)}
                  </td>
                  <td
                    className={`py-1.5 px-3 text-right font-mono tabular-nums font-semibold ${
                      bal > 0 ? "text-rose-600" : "text-slate-400"
                    }`}
                  >
                    {bal > 0 ? formatCurrency(bal) : "-"}
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        s.status === "paid"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : bal > 0
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {s.status || "Paid"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                  No sales invoices recorded for this period
                </td>
              </tr>
            )}
          </tbody>
          {/* Pinned Totals Row */}
          <tfoot className="sticky bottom-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
              <td colSpan={4} className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-800">
                TOTAL:
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.taxable)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.tax)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.total)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.paid)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.balance)}
              </td>
              <td className="bg-slate-100 dark:bg-slate-800"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 2. PURCHASE REGISTER TABLE
function PurchaseRegisterTable({ purchases, search, formatCurrency }: any) {
  const filtered = useMemo(() => {
    if (!search) return purchases;
    const q = search.toLowerCase();
    return purchases.filter(
      (p: any) =>
        (p.bill_number && p.bill_number.toLowerCase().includes(q)) ||
        (p.vendor_name && p.vendor_name.toLowerCase().includes(q))
    );
  }, [purchases, search]);

  const totals = useMemo(() => {
    let taxable = 0;
    let itc = 0;
    let total = 0;
    let paid = 0;
    let balance = 0;
    filtered.forEach((p: any) => {
      const tot = Number(p.total_amount || 0);
      const pd = Number(p.amount_paid || 0);
      const bal = p.balance_due !== undefined ? Number(p.balance_due) : tot - pd;
      const tx = Number(p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0);
      const txbl = Number(p.subtotal || tot - tx);
      taxable += txbl;
      itc += tx;
      total += tot;
      paid += pd;
      balance += bal;
    });
    return { taxable, itc, total, paid, balance };
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      {/* KPI Ribbon */}
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Bills: <span className="font-bold text-slate-900 dark:text-slate-100">{filtered.length}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Taxable: <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.taxable)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          ITC Tax: <span className="font-bold text-emerald-600">{formatCurrency(totals.itc)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Purchases: <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.total)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Paid: <span className="font-bold text-emerald-600">{formatCurrency(totals.paid)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Balance Due: <span className="font-bold text-rose-600">{formatCurrency(totals.balance)}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Date</th>
              <th className="py-2.5 px-3 w-28 bg-slate-100 dark:bg-slate-800">Bill #</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Vendor Name</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Taxable (₹)</th>
              <th className="py-2.5 px-3 text-right w-24 bg-slate-100 dark:bg-slate-800">ITC (₹)</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Total (₹)</th>
              <th className="py-2.5 px-3 text-right w-24 bg-slate-100 dark:bg-slate-800">Paid (₹)</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Due (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((p: any) => {
              const tot = Number(p.total_amount || 0);
              const pd = Number(p.amount_paid || 0);
              const bal = p.balance_due !== undefined ? Number(p.balance_due) : tot - pd;
              const tx = Number(p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0);
              const txbl = Number(p.subtotal || tot - tx);

              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {(p.date || p.created_at || "").slice(0, 10)}
                  </td>
                  <td className="py-1.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {p.bill_number || `BILL-${p.id?.slice(0, 6)}`}
                  </td>
                  <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {p.vendor_name || "Vendor"}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums">{formatCurrency(txbl)}</td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-600">
                    {formatCurrency(tx)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold">
                    {formatCurrency(tot)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums">{formatCurrency(pd)}</td>
                  <td
                    className={`py-1.5 px-3 text-right font-mono tabular-nums font-semibold ${
                      bal > 0 ? "text-rose-600" : "text-slate-400"
                    }`}
                  >
                    {bal > 0 ? formatCurrency(bal) : "-"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                  No purchase bills recorded for this period
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
              <td colSpan={3} className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-800">
                TOTAL:
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.taxable)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.itc)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.total)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.paid)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.balance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 3. DAY BOOK TABLE
function DayBookTable({ daybook, daybookDate, setDaybookDate, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return daybook.entries;
    const q = search.toLowerCase();
    return daybook.entries.filter(
      (e: any) => e.particulars.toLowerCase().includes(q) || e.voucherNo.toLowerCase().includes(q)
    );
  }, [daybook.entries, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      {/* Date Picker Bar */}
      <div className="shrink-0 flex items-center justify-between gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs border border-slate-200 dark:border-slate-700 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Day Date:</span>
          <Input
            type="date"
            value={daybookDate.toISOString().slice(0, 10)}
            onChange={(e) => {
              if (e.target.value) setDaybookDate(new Date(e.target.value));
            }}
            className="w-36 h-7 text-xs bg-white dark:bg-slate-900 border-slate-300 font-semibold"
          />
        </div>
        <div className="flex items-center gap-4 font-semibold text-xs">
          <div>
            Total Debit: <span className="text-emerald-600">{formatCurrency(daybook.totalDebit)}</span>
          </div>
          <div>
            Total Credit: <span className="text-rose-600">{formatCurrency(daybook.totalCredit)}</span>
          </div>
          <div>
            Net Cash Flow:{" "}
            <span className={daybook.netCashMovement >= 0 ? "text-emerald-600" : "text-rose-600"}>
              {formatCurrency(daybook.netCashMovement)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 w-20 bg-slate-100 dark:bg-slate-800">Time</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Type</th>
              <th className="py-2.5 px-3 w-28 bg-slate-100 dark:bg-slate-800">Voucher #</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Particulars</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Mode</th>
              <th className="py-2.5 px-3 text-right w-32 bg-slate-100 dark:bg-slate-800">Debit (In ₹)</th>
              <th className="py-2.5 px-3 text-right w-32 bg-slate-100 dark:bg-slate-800">Credit (Out ₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-mono text-slate-400">{e.time}</td>
                <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300">{e.voucherType}</td>
                <td className="py-1.5 px-3 font-mono font-medium text-blue-600">{e.voucherNo}</td>
                <td className="py-1.5 px-3 text-slate-800 dark:text-slate-200 font-medium">{e.particulars}</td>
                <td className="py-1.5 px-3 text-slate-500">{e.paymentMode}</td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-600 font-semibold">
                  {e.debit > 0 ? formatCurrency(e.debit) : "-"}
                </td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-rose-600 font-semibold">
                  {e.credit > 0 ? formatCurrency(e.credit) : "-"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  No entries recorded on {daybook.date}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
              <td colSpan={5} className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-800">
                TOTAL:
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(daybook.totalDebit)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(daybook.totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 4. ALL TRANSACTIONS
function AllTransactionsTable({ transactions, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t: any) => t.reference.toLowerCase().includes(q) || t.partyName.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Date</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Type</th>
              <th className="py-2.5 px-3 w-28 bg-slate-100 dark:bg-slate-800">Reference #</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Party / Particulars</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Category</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Mode</th>
              <th className="py-2.5 px-3 text-right w-32 bg-slate-100 dark:bg-slate-800">Amount (₹)</th>
            </tr>
          </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((t: any) => (
            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-mono text-slate-500">{t.date}</td>
              <td className="py-1.5 px-3 font-semibold">{t.type}</td>
              <td className="py-1.5 px-3 font-mono font-medium text-blue-600">{t.reference}</td>
              <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">{t.partyName}</td>
              <td className="py-1.5 px-3 text-slate-500">{t.category}</td>
              <td className="py-1.5 px-3 text-slate-500">{t.paymentMode}</td>
              <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold">
                {formatCurrency(t.amount)}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                No transactions found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// 5. BILL-WISE PROFIT
function BillWiseProfitTable({ data, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (b: any) => b.invoiceNumber.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totals = useMemo(() => {
    let sales = 0;
    let cost = 0;
    let profit = 0;
    filtered.forEach((b: any) => {
      sales += b.invoiceTotal;
      cost += b.costOfInvoice;
      profit += b.profit;
    });
    const margin = sales > 0 ? (profit / sales) * 100 : 0;
    return { sales, cost, profit, margin };
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Bills: <span className="font-bold">{filtered.length}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Revenue: <span className="font-bold text-blue-600">{formatCurrency(totals.sales)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Cost of Goods: <span className="font-bold text-slate-700">{formatCurrency(totals.cost)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Gross Profit: <span className="font-bold text-emerald-600">{formatCurrency(totals.profit)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Avg Margin: <span className="font-bold text-emerald-600">{totals.margin.toFixed(1)}%</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2 px-3 w-24">Date</th>
              <th className="py-2 px-3 w-28">Invoice #</th>
              <th className="py-2 px-3">Customer</th>
              <th className="py-2 px-3 text-right w-28">Invoice Value (₹)</th>
              <th className="py-2 px-3 text-right w-28">Cost Value (₹)</th>
              <th className="py-2 px-3 text-right w-28">Gross Profit (₹)</th>
              <th className="py-2 px-3 text-right w-24">Margin (%)</th>
              <th className="py-2 px-3 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((b: any) => (
              <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-mono text-slate-500">{b.date?.slice(0, 10)}</td>
                <td className="py-1.5 px-3 font-mono font-semibold text-blue-600">{b.invoiceNumber}</td>
                <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">{b.customerName}</td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                  {formatCurrency(b.invoiceTotal)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-500">
                  {formatCurrency(b.costOfInvoice)}
                </td>
                <td
                  className={`py-1.5 px-3 text-right font-mono tabular-nums font-bold ${
                    b.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {formatCurrency(b.profit)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                  {b.marginPct.toFixed(1)}%
                </td>
                <td className="py-1.5 px-3 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      b.statusTier === "High"
                        ? "bg-emerald-100 text-emerald-800"
                        : b.statusTier === "Normal"
                        ? "bg-blue-100 text-blue-800"
                        : b.statusTier === "Low"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {b.statusTier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
              <td colSpan={3} className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-800">
                TOTAL:
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.sales)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.cost)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.profit)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{totals.margin.toFixed(1)}%</td>
              <td className="bg-slate-100 dark:bg-slate-800"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 6. CASH FLOW STATEMENT VIEW
function CashFlowView({ cashFlow, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-sm">
        Cash Flow Statement (Direct Method - AS-3)
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-800 dark:text-slate-200">
            <td className="py-2 px-4" colSpan={2}>
              A. CASH FLOW FROM OPERATING ACTIVITIES
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Cash Receipts from Customers (Sales collections)</td>
            <td className="py-1.5 px-4 text-right font-mono text-emerald-600 font-semibold">
              {formatCurrency(cashFlow.cashFromCustomers)}
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8 text-rose-600">Cash Paid to Suppliers (Purchases)</td>
            <td className="py-1.5 px-4 text-right font-mono text-rose-600">
              ({formatCurrency(cashFlow.cashPaidToSuppliers)})
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8 text-rose-600">Cash Paid for Operating Expenses</td>
            <td className="py-1.5 px-4 text-right font-mono text-rose-600">
              ({formatCurrency(cashFlow.cashPaidForExpenses)})
            </td>
          </tr>
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Net Cash from Operating Activities (A)</td>
            <td
              className={`py-2 px-4 text-right font-mono ${
                cashFlow.netOperatingCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(cashFlow.netOperatingCashFlow)}
            </td>
          </tr>

          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-800 dark:text-slate-200">
            <td className="py-2 px-4" colSpan={2}>
              B. CASH FLOW FROM FINANCING ACTIVITIES
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Proceeds from Loans & Borrowings</td>
            <td className="py-1.5 px-4 text-right font-mono text-emerald-600 font-semibold">
              {formatCurrency(cashFlow.borrowingsReceived)}
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8 text-rose-600">Loans Given / Advances Repaid</td>
            <td className="py-1.5 px-4 text-right font-mono text-rose-600">
              ({formatCurrency(cashFlow.loansDisbursed)})
            </td>
          </tr>
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Net Cash from Financing Activities (B)</td>
            <td className="py-2 px-4 text-right font-mono">
              {formatCurrency(cashFlow.netFinancingCashFlow)}
            </td>
          </tr>

          <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-sm border-t-2 border-blue-600">
            <td className="py-2.5 px-4 text-blue-900 dark:text-blue-200">
              NET INCREASE / (DECREASE) IN CASH & BANK (A + B)
            </td>
            <td
              className={`py-2.5 px-4 text-right font-mono ${
                cashFlow.netCashChange >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(cashFlow.netCashChange)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 7. PROFIT AND LOSS VIEW (Standard Schedule III)
function ProfitAndLossView({ pnl, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-sm flex items-center justify-between">
        <span>Statement of Profit and Loss (Schedule III)</span>
        <span className="text-xs font-semibold text-emerald-600">
          Gross Margin: {pnl.grossProfitMarginPct.toFixed(1)}% | Net Margin: {pnl.netProfitMarginPct.toFixed(1)}%
        </span>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              I. REVENUE FROM OPERATIONS
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Gross Sales / Turnover</td>
            <td className="py-1.5 px-4 text-right font-mono font-medium">{formatCurrency(pnl.grossSalesRevenue)}</td>
          </tr>
          {pnl.salesReturns > 0 && (
            <tr>
              <td className="py-1.5 px-8 text-rose-600">Less: Sales Returns & Credit Notes</td>
              <td className="py-1.5 px-4 text-right font-mono text-rose-600">({formatCurrency(pnl.salesReturns)})</td>
            </tr>
          )}
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Net Revenue from Operations (A)</td>
            <td className="py-2 px-4 text-right font-mono font-bold text-blue-600">{formatCurrency(pnl.netRevenue)}</td>
          </tr>

          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              II. COST OF GOODS SOLD (COGS)
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Purchases of Stock-in-Trade</td>
            <td className="py-1.5 px-4 text-right font-mono">{formatCurrency(pnl.purchasesCost)}</td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Direct Production & Packaging Expenses</td>
            <td className="py-1.5 px-4 text-right font-mono">{formatCurrency(pnl.directExpensesTotal)}</td>
          </tr>
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Total Cost of Goods Sold (B)</td>
            <td className="py-2 px-4 text-right font-mono text-rose-600 font-bold">{formatCurrency(pnl.costOfGoodsSold)}</td>
          </tr>

          <tr className="bg-emerald-50 dark:bg-emerald-950/20 font-bold text-sm border-y border-emerald-200">
            <td className="py-2.5 px-4 text-emerald-800 dark:text-emerald-300">GROSS PROFIT (C = A - B)</td>
            <td className="py-2.5 px-4 text-right font-mono text-emerald-700 dark:text-emerald-300">
              {formatCurrency(pnl.grossProfit)}
            </td>
          </tr>

          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              III. INDIRECT OPERATING EXPENSES
            </td>
          </tr>
          {Object.entries(pnl.indirectCategories).map(([cat, amt]) => (
            <tr key={cat}>
              <td className="py-1.5 px-8">{cat}</td>
              <td className="py-1.5 px-4 text-right font-mono text-slate-600">{formatCurrency(amt)}</td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Total Indirect Overheads (D)</td>
            <td className="py-2 px-4 text-right font-mono text-rose-600 font-bold">
              {formatCurrency(pnl.indirectExpensesTotal)}
            </td>
          </tr>

          <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-sm border-t-2 border-blue-600">
            <td className="py-2.5 px-4 text-blue-900 dark:text-blue-200">
              NET PROFIT BEFORE TAX (C - D)
            </td>
            <td
              className={`py-2.5 px-4 text-right font-mono ${
                pnl.netProfitBeforeTax >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(pnl.netProfitBeforeTax)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 8. BALANCE SHEET VIEW
function BalanceSheetView({ bs, formatCurrency }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
      {/* Assets */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs border-b">
          ASSETS (Application of Funds)
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr className="bg-slate-50 dark:bg-slate-800/40 font-semibold">
              <td className="py-1.5 px-3" colSpan={2}>Current Assets</td>
            </tr>
            {Object.entries(bs.currentAssets).map(([name, val]) => (
              <tr key={name}>
                <td className="py-1.5 px-6">{name}</td>
                <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(val)}</td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-50 dark:bg-slate-800/40 border-t">
              <td className="py-2 px-3">Total Current Assets</td>
              <td className="py-2 px-3 text-right font-mono">{formatCurrency(bs.totalCurrentAssets)}</td>
            </tr>
            <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-xs border-t-2 border-blue-600">
              <td className="py-2 px-3">TOTAL ASSETS</td>
              <td className="py-2 px-3 text-right font-mono text-blue-600">{formatCurrency(bs.totalAssets)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Liabilities & Equity */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs border-b">
          LIABILITIES & EQUITY (Sources of Funds)
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr className="bg-slate-50 dark:bg-slate-800/40 font-semibold">
              <td className="py-1.5 px-3" colSpan={2}>Current Liabilities</td>
            </tr>
            {Object.entries(bs.currentLiabilities).map(([name, val]) => (
              <tr key={name}>
                <td className="py-1.5 px-6">{name}</td>
                <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(val)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 dark:bg-slate-800/40 font-semibold">
              <td className="py-1.5 px-3" colSpan={2}>Owner's Equity & Reserves</td>
            </tr>
            <tr>
              <td className="py-1.5 px-6">Proprietor's Capital Account</td>
              <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(bs.proprietorCapital)}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-6">Current Period Profit / Loss</td>
              <td className="py-1.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(bs.periodProfit)}</td>
            </tr>
            <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-xs border-t-2 border-blue-600">
              <td className="py-2 px-3">TOTAL LIABILITIES & EQUITY</td>
              <td className="py-2 px-3 text-right font-mono text-blue-600">
                {formatCurrency(bs.totalLiabilitiesAndEquity)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 9. TRIAL BALANCE VIEW
function TrialBalanceView({ tb, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
            <th className="py-2 px-3">Account Particulars</th>
            <th className="py-2 px-3 w-28 text-center">Type</th>
            <th className="py-2 px-3 text-right w-36">Debit (₹)</th>
            <th className="py-2 px-3 text-right w-36">Credit (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {tb.items.map((it: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-medium">{it.accountName}</td>
              <td className="py-1.5 px-3 text-center text-slate-500">{it.accountType}</td>
              <td className="py-1.5 px-3 text-right font-mono">{it.debit > 0 ? formatCurrency(it.debit) : "-"}</td>
              <td className="py-1.5 px-3 text-right font-mono">{it.credit > 0 ? formatCurrency(it.credit) : "-"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-xs border-t-2 border-slate-300">
            <td colSpan={2} className="py-2 px-3 text-right">TOTALS:</td>
            <td className="py-2 px-3 text-right font-mono text-blue-600">{formatCurrency(tb.totalDebit)}</td>
            <td className="py-2 px-3 text-right font-mono text-blue-600">{formatCurrency(tb.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// 10. SALE AGING TABLE
function SaleAgingTable({ aging, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return aging.parties;
    const q = search.toLowerCase();
    return aging.parties.filter((p: any) => p.partyName.toLowerCase().includes(q));
  }, [aging.parties, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      {/* Aging Summary Bar */}
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Outstanding: <span className="font-bold text-rose-600">{formatCurrency(aging.totalOutstanding)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          0-30 Days: <span className="font-bold text-emerald-600">{formatCurrency(aging.tot0_30)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          31-60 Days: <span className="font-bold text-blue-600">{formatCurrency(aging.tot31_60)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          61-90 Days: <span className="font-bold text-amber-600">{formatCurrency(aging.tot61_90)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          &gt;90 Days: <span className="font-bold text-rose-600">{formatCurrency(aging.tot90Plus)}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b">
              <th className="py-2 px-3">Customer / Party Name</th>
              <th className="py-2 px-3 text-right w-28">Total Due (₹)</th>
              <th className="py-2 px-3 text-right w-24">0-30 Days</th>
              <th className="py-2 px-3 text-right w-24">31-60 Days</th>
              <th className="py-2 px-3 text-right w-24">61-90 Days</th>
              <th className="py-2 px-3 text-right w-24">&gt;90 Days</th>
              <th className="py-2 px-3 text-center w-24">MSME 45D</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((p: any) => (
              <tr key={p.partyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{p.partyName}</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                  {formatCurrency(p.totalOutstanding)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-emerald-600">
                  {p.bucket0_30 > 0 ? formatCurrency(p.bucket0_30) : "-"}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-blue-600">
                  {p.bucket31_60 > 0 ? formatCurrency(p.bucket31_60) : "-"}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-amber-600">
                  {p.bucket61_90 > 0 ? formatCurrency(p.bucket61_90) : "-"}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-rose-600 font-bold">
                  {p.bucket90Plus > 0 ? formatCurrency(p.bucket90Plus) : "-"}
                </td>
                <td className="py-1.5 px-3 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      p.isMsmeExceeded ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {p.isMsmeExceeded ? "Overdue" : "Normal"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 11. GSTR SUMMARY TABLE
function GstrSummaryTable({ sales, purchases, formatCurrency, type }: any) {
  const isGstr1 = type === "gstr1";
  const records = isGstr1 ? sales || [] : purchases || [];

  return (
    <div className="space-y-3">
      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold flex items-center justify-between">
        <span>{isGstr1 ? "GSTR-1 Outward Supplies Summary" : "GSTR-2B Inward ITC Reconciliation"}</span>
        <span>Total Records: {records.length}</span>
      </div>
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
              <th className="py-2 px-3 w-24">Date</th>
              <th className="py-2 px-3 w-28">Doc #</th>
              <th className="py-2 px-3">Party Name</th>
              <th className="py-2 px-3 w-36">GSTIN</th>
              <th className="py-2 px-3 text-right w-28">Taxable (₹)</th>
              <th className="py-2 px-3 text-right w-28">{isGstr1 ? "Output Tax (₹)" : "ITC Tax (₹)"}</th>
              <th className="py-2 px-3 text-right w-28">Invoice Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((r: any) => {
              const tx = isGstr1
                ? Number(r.tax_amount || r.gst_amount || 0)
                : Number(r.cgst || 0) + Number(r.sgst || 0) + Number(r.igst || 0);
              const tot = Number(r.total_amount || 0);
              const txbl = Number(r.subtotal || tot - tx);

              return (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-3 font-mono text-slate-500">{(r.date || r.created_at || "").slice(0, 10)}</td>
                  <td className="py-1.5 px-3 font-mono font-medium text-blue-600">
                    {r.invoice_number || r.bill_number || r.id?.slice(0, 6)}
                  </td>
                  <td className="py-1.5 px-3 font-medium">{r.customer_name || r.vendor_name || "Direct Party"}</td>
                  <td className="py-1.5 px-3 font-mono text-slate-500">{r.customer_gstin || r.vendor_gstin || "URP"}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(txbl)}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-medium">{formatCurrency(tx)}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold">{formatCurrency(tot)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 12. GSTR-3B VIEW
function Gstr3BView({ sales, purchases, formatCurrency }: any) {
  const outwardTurnover = sales.reduce((s: any, x: any) => s + Number(x.total_amount || 0), 0);
  const outwardTax = sales.reduce((s: any, x: any) => s + Number(x.tax_amount || x.gst_amount || 0), 0);
  const eligibleItc = purchases.reduce(
    (s: any, x: any) => s + Number(x.cgst || 0) + Number(x.sgst || 0) + Number(x.igst || 0),
    0
  );
  const netGstPayable = Math.max(0, outwardTax - eligibleItc);

  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 font-bold text-sm border-b">
        GSTR-3B Monthly Statutory Summary
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              3.1 Outward Taxable Supplies (Other than zero rated, nil and exempted)
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Total Outward Turnover</td>
            <td className="py-1.5 px-4 text-right font-mono font-semibold">{formatCurrency(outwardTurnover)}</td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Total Output Tax Liability</td>
            <td className="py-1.5 px-4 text-right font-mono text-blue-600 font-bold">{formatCurrency(outwardTax)}</td>
          </tr>

          <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              4. Eligible Input Tax Credit (ITC)
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">All Other ITC (Purchases of Goods & Services)</td>
            <td className="py-1.5 px-4 text-right font-mono text-emerald-600 font-bold">{formatCurrency(eligibleItc)}</td>
          </tr>

          <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-sm border-t-2 border-blue-600">
            <td className="py-2.5 px-4 text-blue-900 dark:text-blue-200">
              6.1 Net Tax Payable in Cash (Output Tax - Eligible ITC)
            </td>
            <td className="py-2.5 px-4 text-right font-mono text-blue-700 dark:text-blue-200 font-bold">
              {formatCurrency(netGstPayable)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 13. GSTR-9 ANNUAL VIEW
function Gstr9AnnualView({ sales, purchases, formatCurrency, gstin }: any) {
  const outwardTurnover = sales.reduce((s: any, x: any) => s + Number(x.total_amount || 0), 0);
  const b2b = sales
    .filter((x: any) => !!x.customer_gstin && x.customer_gstin.length === 15)
    .reduce((s: any, x: any) => s + Number(x.total_amount || 0), 0);
  const b2c = outwardTurnover - b2b;
  const outwardTax = sales.reduce((s: any, x: any) => s + Number(x.tax_amount || x.gst_amount || 0), 0);
  const itc = purchases.reduce(
    (s: any, x: any) => s + Number(x.cgst || 0) + Number(x.sgst || 0) + Number(x.igst || 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 font-bold text-sm border-b flex items-center justify-between">
        <span>GSTR-9 Annual Return Reconciliation</span>
        <span className="text-xs font-mono font-normal">GSTIN: {gstin || "URP"}</span>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <tr>
            <td className="py-2 px-4 font-medium">Table 4A: B2B Registered Outward Supplies</td>
            <td className="py-2 px-4 text-right font-mono">{formatCurrency(b2b)}</td>
          </tr>
          <tr>
            <td className="py-2 px-4 font-medium">Table 4B: B2C Unregistered Consumer Supplies</td>
            <td className="py-2 px-4 text-right font-mono">{formatCurrency(b2c)}</td>
          </tr>
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-4">Total Declared Turnover (Table 4N)</td>
            <td className="py-2 px-4 text-right font-mono text-blue-600">{formatCurrency(outwardTurnover)}</td>
          </tr>
          <tr>
            <td className="py-2 px-4 font-medium">Table 9: Total Output Tax Payable</td>
            <td className="py-2 px-4 text-right font-mono text-slate-800 dark:text-slate-200 font-semibold">
              {formatCurrency(outwardTax)}
            </td>
          </tr>
          <tr>
            <td className="py-2 px-4 font-medium">Table 6A: Cumulative Input Tax Credit Availed</td>
            <td className="py-2 px-4 text-right font-mono text-emerald-600 font-semibold">{formatCurrency(itc)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 14. GST SLABS TABLE
function GstSlabsTable({ slabs, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
            <th className="py-2 px-3">GST Rate</th>
            <th className="py-2 px-3 text-right">Taxable Turnover (₹)</th>
            <th className="py-2 px-3 text-right">CGST (₹)</th>
            <th className="py-2 px-3 text-right">SGST (₹)</th>
            <th className="py-2 px-3 text-right">Total Tax (₹)</th>
            <th className="py-2 px-3 text-center">Invoices</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {slabs.map((s: any) => (
            <tr key={s.rate} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-bold">{s.rate}% GST</td>
              <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(s.taxableValue)}</td>
              <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatCurrency(s.cgst)}</td>
              <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatCurrency(s.sgst)}</td>
              <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-600">{formatCurrency(s.totalTax)}</td>
              <td className="py-1.5 px-3 text-center">{s.invoiceCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 15. STOCK SUMMARY TABLE
function StockSummaryTable({ stock, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return stock.items;
    const q = search.toLowerCase();
    return stock.items.filter(
      (it: any) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q)
    );
  }, [stock.items, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Products: <span className="font-bold">{stock.totalProducts}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Quantity: <span className="font-bold">{stock.totalStockQty}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Stock Cost Valuation: <span className="font-bold text-blue-600">{formatCurrency(stock.totalCostValuation)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Retail Value: <span className="font-bold text-emerald-600">{formatCurrency(stock.totalRetailValuation)}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
              <th className="py-2 px-3">Item Name</th>
              <th className="py-2 px-3">SKU / Barcode</th>
              <th className="py-2 px-3 text-right w-24">Stock Qty</th>
              <th className="py-2 px-3 text-right w-24">Cost (₹)</th>
              <th className="py-2 px-3 text-right w-24">Price (₹)</th>
              <th className="py-2 px-3 text-right w-28">Total Cost (₹)</th>
              <th className="py-2 px-3 text-right w-28">Retail Value (₹)</th>
              <th className="py-2 px-3 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((it: any) => (
              <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-semibold">{it.name}</td>
                <td className="py-1.5 px-3 font-mono text-slate-500">{it.sku}</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold">{it.currentStock}</td>
                <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatCurrency(it.costPrice)}</td>
                <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(it.sellingPrice)}</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-600">
                  {formatCurrency(it.totalCost)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-600">
                  {formatCurrency(it.totalRetail)}
                </td>
                <td className="py-1.5 px-3 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      it.status === "In Stock"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {it.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 16. ITEM-WISE P&L TABLE
function ItemWisePnlTable({ items, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((it: any) => it.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
          <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
            <th className="py-2 px-3">Item Name</th>
            <th className="py-2 px-3 text-right w-24">Units Sold</th>
            <th className="py-2 px-3 text-right w-28">Revenue (₹)</th>
            <th className="py-2 px-3 text-right w-28">Cost (₹)</th>
            <th className="py-2 px-3 text-right w-28">Gross Profit (₹)</th>
            <th className="py-2 px-3 text-right w-24">Margin (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((it: any) => (
            <tr key={it.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-semibold">{it.name}</td>
              <td className="py-1.5 px-3 text-right font-mono">{it.unitsSold}</td>
              <td className="py-1.5 px-3 text-right font-mono font-semibold">{formatCurrency(it.revenue)}</td>
              <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatCurrency(it.cost)}</td>
              <td
                className={`py-1.5 px-3 text-right font-mono font-bold ${
                  it.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {formatCurrency(it.profit)}
              </td>
              <td className="py-1.5 px-3 text-right font-mono font-semibold">{it.marginPct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// 17. EXPENSE REGISTER TABLE
function ExpenseRegisterTable({ expenses, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e: any) =>
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q))
    );
  }, [expenses, search]);

  const total = useMemo(() => {
    return filtered.reduce((s: any, x: any) => s + Number(x.amount || 0), 0);
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      <div className="shrink-0 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold flex items-center justify-between">
        <span>Total Expenses: {formatCurrency(total)}</span>
        <span>Count: {filtered.length} entries</span>
      </div>
      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
              <th className="py-2 px-3 w-28">Date</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3 w-28">Payment Mode</th>
              <th className="py-2 px-3 text-right w-32">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-mono text-slate-500">{e.date?.slice(0, 10)}</td>
                <td className="py-1.5 px-3 font-semibold">{e.title || e.description || "Expense"}</td>
                <td className="py-1.5 px-3 text-slate-600">{e.categories?.name || e.category || "General"}</td>
                <td className="py-1.5 px-3 text-slate-500">{e.payment_method || "Cash"}</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                  {formatCurrency(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 18. EXPENSE CATEGORY TABLE
function ExpenseCategoryTable({ expenses, formatCurrency }: any) {
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    let totalAll = 0;
    expenses.forEach((e: any) => {
      const amt = Number(e.amount || 0);
      const cat = e.categories?.name || e.category || "General";
      totalAll += amt;
      map.set(cat, (map.get(cat) || 0) + amt);
    });

    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAll > 0 ? (amount / totalAll) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  return (
    <div className="max-w-3xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
            <th className="py-2 px-3">Expense Category</th>
            <th className="py-2 px-3 text-right w-36">Total Amount (₹)</th>
            <th className="py-2 px-3 text-right w-28">Share (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {categoryStats.map((c) => (
            <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-semibold">{c.name}</td>
              <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                {formatCurrency(c.amount)}
              </td>
              <td className="py-1.5 px-3 text-right font-mono">{c.percentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 19. BUSINESS HEALTH DIAGNOSTIC VIEW
function BusinessHealthDiagnosticView({ health, bs, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 font-medium">Working Capital</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(health.workingCapital)}
          </div>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 font-medium">Current Ratio</div>
          <div className="text-base font-bold text-blue-600 mt-1">
            {health.currentRatio.toFixed(2)} : 1
          </div>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 font-medium">Quick Ratio</div>
          <div className="text-base font-bold text-emerald-600 mt-1">
            {health.quickRatio.toFixed(2)} : 1
          </div>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 font-medium">Debt-to-Equity</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {health.debtToEquity.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
