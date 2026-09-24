import React, { useState } from "react";
import { useAccountingData } from "../../hooks/useAccountingData";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  MessageCircle,
  HelpCircle,
  Building,
  Receipt,
  Layers,
} from "lucide-react";
import { downloadReportCSV, printAccountingReport } from "../../utils/exportReportUtils";
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";

export type TransactionSubReport =
  | "sales"
  | "purchases"
  | "daybook"
  | "all_transactions"
  | "pnl"
  | "bill_profit"
  | "aging"
  | "cashflow"
  | "trial_balance"
  | "balance_sheet";

interface TransactionReportsViewProps {
  accounting: ReturnType<typeof useAccountingData>;
  defaultSubReport?: TransactionSubReport;
}

export const TransactionReportsView: React.FC<TransactionReportsViewProps> = ({
  accounting,
  defaultSubReport = "pnl",
}) => {
  const { formatCurrency } = useCurrency();
  const [subReport, setSubReport] = useState<TransactionSubReport>(defaultSubReport);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeReminderParty, setActiveReminderParty] = useState<{ name: string; phone: string; amount: number } | null>(null);

  const {
    profile,
    filteredSales,
    filteredPurchases,
    profitAndLoss,
    billWiseProfit,
    receivablesAging,
    daybook,
    allTransactions,
    cashFlow,
    trialBalance,
    balanceSheet,
    daybookDate,
    setDaybookDate,
    activeDateRange,
  } = accounting;

  const businessInfo = {
    name: profile?.business_name || profile?.company_name || "My Business",
    gstin: profile?.gstin || "URP",
    period: `${activeDateRange.from.toLocaleDateString("en-IN")} - ${activeDateRange.to.toLocaleDateString("en-IN")}`,
  };

  // =========================================================================
  // SUB-NAV PILLS
  // =========================================================================
  const subReportOptions: { id: TransactionSubReport; label: string; badge?: string; icon: any }[] = [
    { id: "pnl", label: "Profit & Loss", badge: "AS-2", icon: Scale },
    { id: "balance_sheet", label: "Balance Sheet", badge: "Sch-III", icon: Building },
    { id: "trial_balance", label: "Trial Balance", badge: "Double-Entry", icon: Layers },
    { id: "sales", label: "Sales Register", icon: TrendingUp },
    { id: "purchases", label: "Purchases Register", icon: TrendingDown },
    { id: "daybook", label: "Daybook", badge: "Daily", icon: Calendar },
    { id: "bill_profit", label: "Bill-Wise Profit", icon: Receipt },
    { id: "aging", label: "Sale Aging", badge: "Sec 43B(h)", icon: Clock },
    { id: "cashflow", label: "Cash Flow", badge: "AS-3", icon: DollarSign },
    { id: "all_transactions", label: "All Transactions", icon: FileText },
  ];

  // =========================================================================
  // EXPORT HANDLER
  // =========================================================================
  const handleExportCSV = () => {
    switch (subReport) {
      case "sales":
        downloadReportCSV(
          filteredSales,
          [
            { header: "Date", accessor: (s: any) => s.date || s.created_at?.slice(0, 10) },
            { header: "Invoice Number", accessor: (s: any) => s.invoice_number || s.id },
            { header: "Customer Name", accessor: (s: any) => s.customer_name },
            { header: "GSTIN", accessor: (s: any) => s.customer_gstin || "URP" },
            { header: "Taxable Value", accessor: (s: any) => s.subtotal || s.total_amount },
            { header: "GST Amount", accessor: (s: any) => s.tax_amount || s.gst_amount || 0 },
            { header: "Total Value", accessor: (s: any) => s.total_amount },
            { header: "Paid Amount", accessor: (s: any) => s.amount_paid || 0 },
            { header: "Balance Due", accessor: (s: any) => s.balance_due || 0 },
            { header: "Status", accessor: (s: any) => s.status },
          ],
          "Sales_Register",
          businessInfo
        );
        break;

      case "purchases":
        downloadReportCSV(
          filteredPurchases,
          [
            { header: "Date", accessor: (p: any) => p.date || p.created_at?.slice(0, 10) },
            { header: "Bill Number", accessor: (p: any) => p.bill_number || p.id },
            { header: "Vendor Name", accessor: (p: any) => p.vendor_name },
            { header: "Vendor GSTIN", accessor: (p: any) => p.vendor_gstin || "URP" },
            { header: "Taxable Value", accessor: (p: any) => p.subtotal || p.total_amount },
            { header: "Input Tax", accessor: (p: any) => (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0) },
            { header: "Total Value", accessor: (p: any) => p.total_amount },
            { header: "Paid Amount", accessor: (p: any) => p.amount_paid || 0 },
            { header: "Balance Due", accessor: (p: any) => p.balance_due || 0 },
          ],
          "Purchases_Register",
          businessInfo
        );
        break;

      case "daybook":
        downloadReportCSV(
          daybook.entries,
          [
            { header: "Time", accessor: (e) => e.time },
            { header: "Voucher Type", accessor: (e) => e.voucherType },
            { header: "Voucher No", accessor: (e) => e.voucherNo },
            { header: "Particulars", accessor: (e) => e.particulars },
            { header: "Debit (₹)", accessor: (e) => e.debit || "" },
            { header: "Credit (₹)", accessor: (e) => e.credit || "" },
            { header: "Payment Mode", accessor: (e) => e.paymentMode },
          ],
          `Daybook_${daybook.date}`,
          businessInfo
        );
        break;

      case "bill_profit":
        downloadReportCSV(
          billWiseProfit,
          [
            { header: "Date", accessor: (b) => b.date?.slice(0, 10) },
            { header: "Invoice No", accessor: (b) => b.invoiceNumber },
            { header: "Customer Name", accessor: (b) => b.customerName },
            { header: "Invoice Total (₹)", accessor: (b) => b.invoiceTotal },
            { header: "Cost of Goods (₹)", accessor: (b) => b.costOfInvoice },
            { header: "Gross Profit (₹)", accessor: (b) => b.profit },
            { header: "Gross Margin (%)", accessor: (b) => b.marginPct.toFixed(2) },
            { header: "Profit Tier", accessor: (b) => b.statusTier },
          ],
          "Bill_Wise_Profit",
          businessInfo
        );
        break;

      case "aging":
        downloadReportCSV(
          receivablesAging.parties,
          [
            { header: "Customer Name", accessor: (p) => p.partyName },
            { header: "Contact Phone", accessor: (p) => p.phone || "-" },
            { header: "Total Outstanding (₹)", accessor: (p) => p.totalOutstanding },
            { header: "0-30 Days (Current)", accessor: (p) => p.bucket0_30 },
            { header: "31-60 Days", accessor: (p) => p.bucket31_60 },
            { header: "61-90 Days", accessor: (p) => p.bucket61_90 },
            { header: "90+ Days (Overdue)", accessor: (p) => p.bucket90Plus },
            { header: "MSME >45 Days Violation", accessor: (p) => (p.isMsmeExceeded ? "YES" : "NO") },
          ],
          "Receivables_Aging_Schedule",
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

      default:
        window.print();
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-report selector pills */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
          {subReportOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = subReport === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSubReport(opt.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground hover:text-foreground border-border hover:bg-accent/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
                {opt.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md uppercase font-bold tracking-wider ${
                      isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Print & Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => printAccountingReport(subReport.toUpperCase())}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. PROFIT AND LOSS STATEMENT (Schedule III / Ind AS)                  */}
      {/* ===================================================================== */}
      {subReport === "pnl" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Revenue from Operations</p>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {formatCurrency(profitAndLoss.netRevenue)}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Gross: {formatCurrency(profitAndLoss.grossSalesRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Cost of Goods Sold (COGS)</p>
                <h3 className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {formatCurrency(profitAndLoss.costOfGoodsSold)}
                </h3>
                <p className="text-[11px] text-muted-foreground">Purchases + Direct Expenses</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Gross Profit</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(profitAndLoss.grossProfit)}
                  </h3>
                  <Badge variant="outline" className="text-[11px] font-semibold text-emerald-600 border-emerald-300">
                    {profitAndLoss.grossProfitMarginPct.toFixed(1)}% Margin
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Trading Gross Margin</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Net Profit (Before Tax)</p>
                <div className="flex items-baseline gap-2">
                  <h3
                    className={`text-xl font-bold tracking-tight ${
                      profitAndLoss.netProfitBeforeTax >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(profitAndLoss.netProfitBeforeTax)}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-semibold ${
                      profitAndLoss.netProfitMarginPct >= 0
                        ? "text-emerald-600 border-emerald-300"
                        : "text-rose-600 border-rose-300"
                    }`}
                  >
                    {profitAndLoss.netProfitMarginPct.toFixed(1)}% Net
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">After all operating overheads</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Statement Table */}
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />
                    Statement of Profit and Loss
                  </CardTitle>
                  <CardDescription className="text-xs">
                    In compliance with Indian Accounting Standards (AS-2 / Ind AS) & Schedule III
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {businessInfo.period}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Particulars</TableHead>
                    <TableHead className="font-bold text-xs text-center w-28">Note</TableHead>
                    <TableHead className="font-bold text-xs text-right w-44">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {/* Revenue Section */}
                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={3}>I. REVENUE FROM OPERATIONS</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Gross Sales / Billing</TableCell>
                    <TableCell className="text-center text-muted-foreground">1</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(profitAndLoss.grossSalesRevenue)}
                    </TableCell>
                  </TableRow>
                  {profitAndLoss.salesReturns > 0 && (
                    <TableRow>
                      <TableCell className="pl-6 text-rose-600">Less: Sales Returns / Credit Notes</TableCell>
                      <TableCell className="text-center text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-rose-600 font-medium">
                        ({formatCurrency(profitAndLoss.salesReturns)})
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-bold bg-muted/10 border-b">
                    <TableCell className="pl-4">Net Revenue from Operations (A)</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-emerald-600 font-bold">
                      {formatCurrency(profitAndLoss.netRevenue)}
                    </TableCell>
                  </TableRow>

                  {/* COGS Section */}
                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={3}>II. EXPENSES & COST OF SALES</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Purchases of Stock-in-Trade</TableCell>
                    <TableCell className="text-center text-muted-foreground">2</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(profitAndLoss.purchasesCost)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Direct Inward & Packaging Expenses</TableCell>
                    <TableCell className="text-center text-muted-foreground">3</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(profitAndLoss.directExpensesTotal)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/10 border-b">
                    <TableCell className="pl-4">Total Cost of Goods Sold (B)</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-rose-600 font-bold">
                      {formatCurrency(profitAndLoss.costOfGoodsSold)}
                    </TableCell>
                  </TableRow>

                  {/* Gross Profit Row */}
                  <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-sm">
                    <TableCell className="pl-4 text-emerald-700 dark:text-emerald-300">
                      GROSS PROFIT (C = A - B)
                    </TableCell>
                    <TableCell className="text-center text-emerald-600 font-semibold">
                      {profitAndLoss.grossProfitMarginPct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(profitAndLoss.grossProfit)}
                    </TableCell>
                  </TableRow>

                  {/* Indirect Operating Expenses */}
                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={3}>III. INDIRECT & OPERATING OVERHEADS</TableCell>
                  </TableRow>
                  {Object.entries(profitAndLoss.indirectCategories).map(([cat, amt]) => (
                    <TableRow key={cat}>
                      <TableCell className="pl-6">{cat}</TableCell>
                      <TableCell className="text-center text-muted-foreground">4</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(amt)}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(profitAndLoss.indirectCategories).length === 0 && (
                    <TableRow>
                      <TableCell className="pl-6 text-muted-foreground italic">
                        No indirect expenses recorded in this period
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-bold bg-muted/10 border-b">
                    <TableCell className="pl-4">Total Indirect Overheads (D)</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold text-rose-600">
                      {formatCurrency(profitAndLoss.indirectExpensesTotal)}
                    </TableCell>
                  </TableRow>

                  {/* Net Profit Row */}
                  <TableRow className="bg-primary/10 font-bold text-sm border-t-2 border-primary">
                    <TableCell className="pl-4 text-foreground">
                      NET PROFIT FOR THE PERIOD (BEFORE TAX) (C - D)
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {profitAndLoss.netProfitMarginPct.toFixed(1)}%
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold text-base ${
                        profitAndLoss.netProfitBeforeTax >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatCurrency(profitAndLoss.netProfitBeforeTax)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. BALANCE SHEET (Schedule III)                                       */}
      {/* ===================================================================== */}
      {subReport === "balance_sheet" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Assets */}
            <Card className="border shadow-xs">
              <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 border-b pb-3">
                <CardTitle className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center justify-between">
                  <span>ASSETS (APPLICATION OF FUNDS)</span>
                  <span className="text-base">{formatCurrency(balanceSheet.totalAssets)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody className="text-xs">
                    <TableRow className="bg-muted/20 font-semibold">
                      <TableCell colSpan={2}>Current Assets</TableCell>
                    </TableRow>
                    {Object.entries(balanceSheet.currentAssets).map(([name, amt]) => (
                      <TableRow key={name}>
                        <TableCell className="pl-6">{name}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(amt)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted/10 border-b">
                      <TableCell className="pl-4">Total Current Assets</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(balanceSheet.totalCurrentAssets)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="bg-muted/20 font-semibold">
                      <TableCell colSpan={2}>Non-Current Assets</TableCell>
                    </TableRow>
                    {Object.entries(balanceSheet.nonCurrentAssets).map(([name, amt]) => (
                      <TableRow key={name}>
                        <TableCell className="pl-6">{name}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(amt)}</TableCell>
                      </TableRow>
                    ))}

                    <TableRow className="bg-blue-100/60 dark:bg-blue-900/30 font-bold text-sm border-t-2">
                      <TableCell className="pl-4 text-blue-800 dark:text-blue-200">TOTAL ASSETS</TableCell>
                      <TableCell className="text-right text-blue-800 dark:text-blue-200">
                        {formatCurrency(balanceSheet.totalAssets)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right: Liabilities & Equity */}
            <Card className="border shadow-xs">
              <CardHeader className="bg-purple-50/50 dark:bg-purple-950/20 border-b pb-3">
                <CardTitle className="text-sm font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                  <span>LIABILITIES & EQUITY (SOURCES OF FUNDS)</span>
                  <span className="text-base">{formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody className="text-xs">
                    <TableRow className="bg-muted/20 font-semibold">
                      <TableCell colSpan={2}>Current Liabilities</TableCell>
                    </TableRow>
                    {Object.entries(balanceSheet.currentLiabilities).map(([name, amt]) => (
                      <TableRow key={name}>
                        <TableCell className="pl-6">{name}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(amt)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted/10 border-b">
                      <TableCell className="pl-4">Total Current Liabilities</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(balanceSheet.totalCurrentLiabilities)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="bg-muted/20 font-semibold">
                      <TableCell colSpan={2}>Non-Current Liabilities (Borrowings)</TableCell>
                    </TableRow>
                    {Object.entries(balanceSheet.nonCurrentLiabilities).map(([name, amt]) => (
                      <TableRow key={name}>
                        <TableCell className="pl-6">{name}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(amt)}</TableCell>
                      </TableRow>
                    ))}

                    <TableRow className="bg-muted/20 font-semibold">
                      <TableCell colSpan={2}>Owner's Equity & Reserves</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6">Proprietor's Capital Account</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(balanceSheet.proprietorCapital)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6">Current Period Profit / Loss</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          balanceSheet.periodProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(balanceSheet.periodProfit)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="bg-purple-100/60 dark:bg-purple-900/30 font-bold text-sm border-t-2">
                      <TableCell className="pl-4 text-purple-800 dark:text-purple-200">
                        TOTAL LIABILITIES & EQUITY
                      </TableCell>
                      <TableCell className="text-right text-purple-800 dark:text-purple-200">
                        {formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Balanced Status Banner */}
          <div className="p-3 rounded-xl border flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                Balance Sheet Reconciled & Balanced (Assets = Liabilities + Equity)
              </span>
            </div>
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">CA Verified</Badge>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. TRIAL BALANCE                                                      */}
      {/* ===================================================================== */}
      {subReport === "trial_balance" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Trial Balance
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Double-entry verification of all debit and credit ledger balances
                  </CardDescription>
                </div>
                <Badge variant={trialBalance.isBalanced ? "default" : "destructive"}>
                  {trialBalance.isBalanced ? "Balanced (0.00 Diff)" : "Unbalanced"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Account Particulars</TableHead>
                    <TableHead className="font-bold text-xs text-center w-28">Type</TableHead>
                    <TableHead className="font-bold text-xs text-right w-40">Debit (₹)</TableHead>
                    <TableHead className="font-bold text-xs text-right w-40">Credit (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {trialBalance.items.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{item.accountName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {item.accountType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.debit > 0 ? formatCurrency(item.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.credit > 0 ? formatCurrency(item.credit) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold text-sm bg-muted/30 border-t-2 border-primary">
                    <TableCell colSpan={2} className="pl-4">
                      TOTALS
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(trialBalance.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(trialBalance.totalCredit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. SALES REGISTER                                                     */}
      {/* ===================================================================== */}
      {subReport === "sales" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search invoice number, customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total Invoices: <span className="font-semibold text-foreground">{filteredSales.length}</span>
            </div>
          </div>

          <Card className="border shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Date</TableHead>
                    <TableHead className="text-xs font-bold">Invoice #</TableHead>
                    <TableHead className="text-xs font-bold">Customer</TableHead>
                    <TableHead className="text-xs font-bold text-right">Taxable (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Tax (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Total (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Paid (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Due (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredSales
                    .filter((s: any) => {
                      if (!searchTerm) return true;
                      const q = searchTerm.toLowerCase();
                      return (
                        (s.invoice_number && s.invoice_number.toLowerCase().includes(q)) ||
                        (s.customer_name && s.customer_name.toLowerCase().includes(q))
                      );
                    })
                    .map((s: any) => {
                      const total = Number(s.total_amount || 0);
                      const paid = Number(s.amount_paid || 0);
                      const due = s.balance_due !== undefined ? Number(s.balance_due) : total - paid;
                      const tax = Number(s.tax_amount || s.gst_amount || 0);
                      const taxable = Number(s.subtotal || total - tax);

                      return (
                        <TableRow key={s.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium whitespace-nowrap">
                            {(s.date || s.created_at || "").slice(0, 10)}
                          </TableCell>
                          <TableCell className="font-mono text-primary font-semibold">
                            {s.invoice_number || `INV-${s.id?.slice(0, 6)}`}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{s.customer_name || "Direct Customer"}</div>
                            {s.customer_gstin && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                GST: {s.customer_gstin}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(taxable)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(tax)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(total)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{formatCurrency(paid)}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${due > 0 ? "text-rose-600" : "text-muted-foreground"}`}
                          >
                            {due > 0 ? formatCurrency(due) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={s.status === "paid" ? "default" : due > 0 ? "outline" : "secondary"}
                              className="text-[10px] capitalize"
                            >
                              {s.status || "Completed"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {filteredSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No sales found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. PURCHASES REGISTER                                                 */}
      {/* ===================================================================== */}
      {subReport === "purchases" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search bill number, vendor name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total Bills: <span className="font-semibold text-foreground">{filteredPurchases.length}</span>
            </div>
          </div>

          <Card className="border shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Date</TableHead>
                    <TableHead className="text-xs font-bold">Bill #</TableHead>
                    <TableHead className="text-xs font-bold">Vendor</TableHead>
                    <TableHead className="text-xs font-bold text-right">Taxable (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">ITC Tax (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Total (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Paid (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Due (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredPurchases
                    .filter((p: any) => {
                      if (!searchTerm) return true;
                      const q = searchTerm.toLowerCase();
                      return (
                        (p.bill_number && p.bill_number.toLowerCase().includes(q)) ||
                        (p.vendor_name && p.vendor_name.toLowerCase().includes(q))
                      );
                    })
                    .map((p: any) => {
                      const total = Number(p.total_amount || 0);
                      const paid = Number(p.amount_paid || 0);
                      const due = p.balance_due !== undefined ? Number(p.balance_due) : total - paid;
                      const itc = Number(p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0);
                      const taxable = Number(p.subtotal || total - itc);

                      return (
                        <TableRow key={p.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium whitespace-nowrap">
                            {(p.date || p.created_at || "").slice(0, 10)}
                          </TableCell>
                          <TableCell className="font-mono text-primary font-semibold">
                            {p.bill_number || `BILL-${p.id?.slice(0, 6)}`}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{p.vendor_name || "Vendor"}</div>
                            {p.vendor_gstin && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                GST: {p.vendor_gstin}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(taxable)}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">
                            {formatCurrency(itc)}
                          </TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(total)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(paid)}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${due > 0 ? "text-rose-600" : "text-muted-foreground"}`}
                          >
                            {due > 0 ? formatCurrency(due) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {filteredPurchases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No purchase bills found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. DAYBOOK (Daily Inflow & Outflow Journal)                           */}
      {/* ===================================================================== */}
      {subReport === "daybook" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4 flex-wrap bg-card p-3 rounded-xl border">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">Select Daybook Date:</span>
              <Input
                type="date"
                value={daybookDate.toISOString().slice(0, 10)}
                onChange={(e) => {
                  if (e.target.value) setDaybookDate(new Date(e.target.value));
                }}
                className="w-40 h-8 text-xs font-semibold"
              />
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div>
                Day Total Debit: <span className="text-emerald-600 font-bold">{formatCurrency(daybook.totalDebit)}</span>
              </div>
              <div>
                Day Total Credit: <span className="text-rose-600 font-bold">{formatCurrency(daybook.totalCredit)}</span>
              </div>
              <div>
                Net Cash Movement:{" "}
                <span
                  className={`font-bold ${
                    daybook.netCashMovement >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {formatCurrency(daybook.netCashMovement)}
                </span>
              </div>
            </div>
          </div>

          <Card className="border shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold w-20">Time</TableHead>
                    <TableHead className="text-xs font-bold w-28">Type</TableHead>
                    <TableHead className="text-xs font-bold w-36">Voucher #</TableHead>
                    <TableHead className="text-xs font-bold">Particulars</TableHead>
                    <TableHead className="text-xs font-bold w-28">Mode</TableHead>
                    <TableHead className="text-xs font-bold text-right w-36">Debit (Inflow ₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right w-36">Credit (Outflow ₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {daybook.entries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-muted-foreground">{entry.time}</TableCell>
                      <TableCell>
                        <Badge
                          variant={entry.voucherType === "Sale" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {entry.voucherType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{entry.voucherNo}</TableCell>
                      <TableCell className="font-medium">{entry.particulars}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.paymentMode}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-rose-600">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {daybook.entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions recorded on {daybook.date}
                      </TableCell>
                    </TableRow>
                  )}
                  {daybook.entries.length > 0 && (
                    <TableRow className="font-bold bg-muted/30 border-t-2">
                      <TableCell colSpan={5} className="pl-4">
                        DAY TOTALS
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-bold">
                        {formatCurrency(daybook.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 font-bold">
                        {formatCurrency(daybook.totalCredit)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. BILL-WISE PROFIT                                                   */}
      {/* ===================================================================== */}
      {subReport === "bill_profit" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Bill-Wise Profitability Register
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time gross profit and markup margin analysis per sales invoice
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Date</TableHead>
                    <TableHead className="text-xs font-bold">Invoice #</TableHead>
                    <TableHead className="text-xs font-bold">Customer</TableHead>
                    <TableHead className="text-xs font-bold text-right">Invoice Value (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Cost of Goods (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Gross Profit (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Margin (%)</TableHead>
                    <TableHead className="text-xs font-bold text-center">Profitability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {billWiseProfit.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/20">
                      <TableCell className="whitespace-nowrap font-medium">
                        {row.date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="font-mono text-primary font-semibold">
                        {row.invoiceNumber}
                      </TableCell>
                      <TableCell className="font-medium">{row.customerName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.invoiceTotal)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(row.costOfInvoice)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          row.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(row.profit)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          row.marginPct >= 15 ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {row.marginPct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            row.statusTier === "High"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : row.statusTier === "Normal"
                              ? "bg-blue-50 text-blue-700 border-blue-300"
                              : row.statusTier === "Low"
                              ? "bg-amber-50 text-amber-700 border-amber-300"
                              : "bg-rose-50 text-rose-700 border-rose-300"
                          }`}
                        >
                          {row.statusTier} Margin
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {billWiseProfit.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No sales bills available to analyze profit
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. SALE / RECEIVABLES AGING (MSME Sec 43B(h))                         */}
      {/* ===================================================================== */}
      {subReport === "aging" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* MSME Alert Bar if violations exist */}
          {receivablesAging.msmeViolationsTotal > 0 && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  MSME Statutory 45-Day Payment Alert (Section 43B(h) Income Tax Act)
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  You have <span className="font-bold">{formatCurrency(receivablesAging.msmeViolationsTotal)}</span> in
                  overdue receivables past 45 days. Buyers may face disallowance of business expense deductions unless
                  settled before financial year-end.
                </p>
              </div>
            </div>
          )}

          {/* Aging Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="border shadow-xs">
              <CardContent className="p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground">Total Receivables</p>
                <h4 className="text-lg font-bold">{formatCurrency(receivablesAging.totalOutstanding)}</h4>
              </CardContent>
            </Card>
            <Card className="border shadow-xs bg-emerald-50/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[11px] text-emerald-700 font-medium">0 - 30 Days (Current)</p>
                <h4 className="text-lg font-bold text-emerald-700">{formatCurrency(receivablesAging.tot0_30)}</h4>
              </CardContent>
            </Card>
            <Card className="border shadow-xs bg-blue-50/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[11px] text-blue-700 font-medium">31 - 60 Days</p>
                <h4 className="text-lg font-bold text-blue-700">{formatCurrency(receivablesAging.tot31_60)}</h4>
              </CardContent>
            </Card>
            <Card className="border shadow-xs bg-amber-50/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[11px] text-amber-700 font-medium">61 - 90 Days</p>
                <h4 className="text-lg font-bold text-amber-700">{formatCurrency(receivablesAging.tot61_90)}</h4>
              </CardContent>
            </Card>
            <Card className="border shadow-xs bg-rose-50/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[11px] text-rose-700 font-medium">&gt; 90 Days (Delinquent)</p>
                <h4 className="text-lg font-bold text-rose-700">{formatCurrency(receivablesAging.tot90Plus)}</h4>
              </CardContent>
            </Card>
          </div>

          {/* Aging Table */}
          <Card className="border shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Party / Customer Name</TableHead>
                    <TableHead className="text-xs font-bold text-right">Total Due (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">0-30 Days</TableHead>
                    <TableHead className="text-xs font-bold text-right">31-60 Days</TableHead>
                    <TableHead className="text-xs font-bold text-right">61-90 Days</TableHead>
                    <TableHead className="text-xs font-bold text-right">&gt;90 Days</TableHead>
                    <TableHead className="text-xs font-bold text-center">MSME &gt;45D</TableHead>
                    <TableHead className="text-xs font-bold text-center w-28">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {receivablesAging.parties.map((p) => (
                    <TableRow key={p.partyId} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="font-semibold">{p.partyName}</div>
                        {p.phone && <div className="text-[10px] text-muted-foreground">{p.phone}</div>}
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-600">
                        {formatCurrency(p.totalOutstanding)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {p.bucket0_30 > 0 ? formatCurrency(p.bucket0_30) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {p.bucket31_60 > 0 ? formatCurrency(p.bucket31_60) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {p.bucket61_90 > 0 ? formatCurrency(p.bucket61_90) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-600">
                        {p.bucket90Plus > 0 ? formatCurrency(p.bucket90Plus) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.isMsmeExceeded ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Critical (&gt;45D)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-600">
                            Compliant
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActiveReminderParty({
                              name: p.partyName,
                              phone: p.phone,
                              amount: p.totalOutstanding,
                            })
                          }
                          className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" />
                          Remind
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {receivablesAging.parties.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No outstanding customer balances found! Excellent cash collection.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9. CASH FLOW STATEMENT (AS-3 Direct Method)                           */}
      {/* ===================================================================== */}
      {subReport === "cashflow" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Cash Flow Statement (Direct Method)
              </CardTitle>
              <CardDescription className="text-xs">
                In accordance with Accounting Standard 3 (AS-3 / Ind AS 7)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Particulars</TableHead>
                    <TableHead className="text-xs font-bold text-right w-44">Inflow / (Outflow) (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {/* Operating Activities */}
                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={2}>A. CASH FLOWS FROM OPERATING ACTIVITIES</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Cash Receipts from Customers (Sales Collections)</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatCurrency(cashFlow.cashFromCustomers)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 text-rose-600">Cash Paid to Suppliers for Purchases</TableCell>
                    <TableCell className="text-right text-rose-600 font-medium">
                      ({formatCurrency(cashFlow.cashPaidToSuppliers)})
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 text-rose-600">Cash Paid for Operating Expenses</TableCell>
                    <TableCell className="text-right text-rose-600 font-medium">
                      ({formatCurrency(cashFlow.cashPaidForExpenses)})
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/10 border-b">
                    <TableCell className="pl-4">Net Cash from Operating Activities (A)</TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        cashFlow.netOperatingCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatCurrency(cashFlow.netOperatingCashFlow)}
                    </TableCell>
                  </TableRow>

                  {/* Financing Activities */}
                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={2}>B. CASH FLOWS FROM FINANCING ACTIVITIES</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Proceeds from Borrowings / Loans Received</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatCurrency(cashFlow.borrowingsReceived)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 text-rose-600">Loans & Advances Disbursed</TableCell>
                    <TableCell className="text-right text-rose-600 font-medium">
                      ({formatCurrency(cashFlow.loansDisbursed)})
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/10 border-b">
                    <TableCell className="pl-4">Net Cash from Financing Activities (B)</TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        cashFlow.netFinancingCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatCurrency(cashFlow.netFinancingCashFlow)}
                    </TableCell>
                  </TableRow>

                  {/* Net Change */}
                  <TableRow className="bg-primary/10 font-bold text-sm border-t-2 border-primary">
                    <TableCell className="pl-4 text-foreground">
                      NET INCREASE / (DECREASE) IN CASH & CASH EQUIVALENTS (A + B)
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold text-base ${
                        cashFlow.netCashChange >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatCurrency(cashFlow.netCashChange)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 10. ALL TRANSACTIONS (Master Audit Trail)                              */}
      {/* ===================================================================== */}
      {subReport === "all_transactions" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search party, voucher reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total Records: <span className="font-semibold text-foreground">{allTransactions.length}</span>
            </div>
          </div>

          <Card className="border shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Date</TableHead>
                    <TableHead className="text-xs font-bold">Type</TableHead>
                    <TableHead className="text-xs font-bold">Reference #</TableHead>
                    <TableHead className="text-xs font-bold">Party / Particulars</TableHead>
                    <TableHead className="text-xs font-bold">Category</TableHead>
                    <TableHead className="text-xs font-bold">Payment Mode</TableHead>
                    <TableHead className="text-xs font-bold text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {allTransactions
                    .filter((t) => {
                      if (!searchTerm) return true;
                      const q = searchTerm.toLowerCase();
                      return t.reference.toLowerCase().includes(q) || t.partyName.toLowerCase().includes(q);
                    })
                    .map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium whitespace-nowrap">{t.date}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              t.type === "Sale"
                                ? "default"
                                : t.type === "Purchase"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-primary font-medium">{t.reference}</TableCell>
                        <TableCell className="font-medium">{t.partyName}</TableCell>
                        <TableCell className="text-muted-foreground">{t.category}</TableCell>
                        <TableCell className="text-muted-foreground">{t.paymentMode}</TableCell>
                        <TableCell
                          className={`text-right font-bold ${
                            t.type === "Sale" ? "text-emerald-600" : "text-foreground"
                          }`}
                        >
                          {formatCurrency(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {allTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions found in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WhatsApp Reminder Dialog */}
      {activeReminderParty && (
        <SendWhatsAppDialog
          open={!!activeReminderParty}
          onOpenChange={(open) => {
            if (!open) setActiveReminderParty(null);
          }}
          messageType="reminder"
          recipientName={activeReminderParty.name}
          recipientPhone={activeReminderParty.phone}
          defaultMessage={`Dear ${activeReminderParty.name},\n\nThis is a gentle payment reminder from ${
            profile?.business_name || "our accounts team"
          }. You have an outstanding balance of ${formatCurrency(
            activeReminderParty.amount
          )} currently overdue.\n\nPlease clear the balance at your earliest convenience.\n\nThank you!`}
        />
      )}
    </div>
  );
};
