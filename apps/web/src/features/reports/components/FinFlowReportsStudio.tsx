import React, { useState, useMemo, useRef, useEffect } from "react";
import { useAccountingData } from "../hooks/useAccountingData";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useAuth } from "@/core/lib/auth";
import { printAccountingReport } from "../utils/exportReportUtils";
import { handleReportExcelExport } from "../utils/reportExportHandler";
import { DetailedPartyReport } from "@/features/parties/components/DetailedPartyReport";
import { PartyReport } from "@/features/parties/components/PartyReport";
import { SalesOrderRegister } from "@/features/sales/components/SalesOrderRegister";
import { PurchaseOrderRegister } from "@/features/purchases/components/PurchaseOrderRegister";
import {
  FinFlowReportId,
  ReportMenuItem,
  FINFLOW_REPORTS_MENU,
} from "../reportMenu";
import { ReportsSidebar } from "./studio/ReportsSidebar";
import { ReportsHeaderControls } from "./studio/ReportsHeaderControls";
import {
  SaleRegisterTable,
  PurchaseRegisterTable,
  DayBookTable,
  AllTransactionsTable,
  BillWiseProfitTable,
  CashFlowView,
  ProfitAndLossView,
  BalanceSheetView,
  TrialBalanceView,
  SaleAgingTable,
  GstrSummaryTable,
  Gstr3BView,
  Gstr9AnnualView,
  GstSlabsTable,
  StockSummaryTable,
  ItemWisePnlTable,
  ExpenseRegisterTable,
  ExpenseCategoryTable,
  BusinessHealthDiagnosticView,
} from "./views";

export * from "../reportMenu";

export const FinFlowReportsStudio: React.FC<{
  accounting: ReturnType<typeof useAccountingData>;
  initialReportId?: FinFlowReportId;
  initialParty?: string | null;
}> = ({ accounting, initialReportId = "sale_register", initialParty = null }) => {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { formatCurrency } = useCurrency();

  const [activeReportId, setActiveReportId] = useState<FinFlowReportId>(initialReportId);
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<string | null>(initialParty);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [, setCurrentPage] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialParty prop changes
  useEffect(() => {
    if (initialParty) {
      setSelectedPartyForLedger(initialParty);
    }
  }, [initialParty]);

  // Sync fullscreen state with document fullscreenchange
  useEffect(() => {
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
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }
  };

  const handleExportExcel = () => {
    handleReportExcelExport({
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
    });
  };

  const handlePrint = () => {
    printAccountingReport(activeReportMeta.label.toUpperCase());
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
      {/* 1. LEFT SIDEBAR: Report Directory */}
      <ReportsSidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        sidebarSearch={sidebarSearch}
        setSidebarSearch={setSidebarSearch}
        categoriesMap={categoriesMap}
        activeReportId={activeReportId}
        onSelectReport={handleSelectReport}
        totalReports={FINFLOW_REPORTS_MENU.length}
      />

      {/* 2. RIGHT MAIN WORKSPACE: High-Density Active Report View */}
      <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 h-full min-h-0 overflow-hidden">
        {/* Top Header Ribbon & Controls */}
        <ReportsHeaderControls
          activeReportMeta={activeReportMeta}
          activeReportId={activeReportId}
          periodPreset={periodPreset}
          setPeriodPreset={setPeriodPreset}
          setCustomRange={setCustomRange}
          tableSearch={tableSearch}
          setTableSearch={setTableSearch}
          onExportExcel={handleExportExcel}
          onPrint={handlePrint}
          onRefetch={refetchAll}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Report Content Body */}
        <div
          className={`flex-1 min-h-0 flex flex-col ${
            [
              "party_statement",
              "party_outstanding",
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
          {activeReportId === "sale_register" && (
            <SaleRegisterTable
              sales={filteredSales}
              search={tableSearch}
              formatCurrency={formatCurrency}
            />
          )}

          {activeReportId === "purchase_register" && (
            <PurchaseRegisterTable
              purchases={filteredPurchases}
              search={tableSearch}
              formatCurrency={formatCurrency}
            />
          )}

          {activeReportId === "day_book" && (
            <DayBookTable
              daybook={daybook}
              daybookDate={daybookDate}
              setDaybookDate={setDaybookDate}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {activeReportId === "all_transactions" && (
            <AllTransactionsTable
              transactions={allTransactions}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {activeReportId === "bill_profit" && (
            <BillWiseProfitTable
              data={billWiseProfit}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {activeReportId === "cash_flow" && (
            <CashFlowView cashFlow={cashFlow} formatCurrency={formatCurrency} />
          )}

          {activeReportId === "pnl" && (
            <ProfitAndLossView pnl={profitAndLoss} formatCurrency={formatCurrency} />
          )}

          {activeReportId === "balance_sheet" && (
            <BalanceSheetView bs={balanceSheet} formatCurrency={formatCurrency} />
          )}

          {activeReportId === "trial_balance" && (
            <TrialBalanceView tb={trialBalance} formatCurrency={formatCurrency} />
          )}

          {activeReportId === "party_statement" && (
            <DetailedPartyReport
              initialPartyName={selectedPartyForLedger || initialParty}
              initialDateRange={activeDateRange}
            />
          )}

          {activeReportId === "party_outstanding" && (
            <PartyReport
              onSelectPartyForLedger={(name) => {
                setSelectedPartyForLedger(name);
                setActiveReportId("party_statement");
              }}
            />
          )}

          {activeReportId === "sale_aging" && (
            <SaleAgingTable
              aging={receivablesAging}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {activeReportId === "gstr1" && (
            <GstrSummaryTable
              sales={filteredSales}
              formatCurrency={formatCurrency}
              gstin={profile?.gstin}
              type="gstr1"
            />
          )}

          {activeReportId === "gstr2b" && (
            <GstrSummaryTable
              purchases={filteredPurchases}
              formatCurrency={formatCurrency}
              gstin={profile?.gstin}
              type="gstr2b"
            />
          )}

          {activeReportId === "gstr3b" && (
            <Gstr3BView
              sales={filteredSales}
              purchases={filteredPurchases}
              formatCurrency={formatCurrency}
            />
          )}

          {activeReportId === "gstr9" && (
            <Gstr9AnnualView
              sales={filteredSales}
              purchases={filteredPurchases}
              formatCurrency={formatCurrency}
              gstin={profile?.gstin}
            />
          )}

          {activeReportId === "gst_slabs" && (
            <GstSlabsTable slabs={gstSlabReport} formatCurrency={formatCurrency} />
          )}

          {activeReportId === "stock_summary" && (
            <StockSummaryTable
              stock={stockSummary}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {activeReportId === "item_pnl" && (
            <ItemWisePnlTable
              items={itemWiseProfit}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {activeReportId === "expense_register" && (
            <ExpenseRegisterTable
              expenses={filteredExpenses}
              formatCurrency={formatCurrency}
              search={tableSearch}
            />
          )}

          {activeReportId === "expense_category" && (
            <ExpenseCategoryTable
              expenses={filteredExpenses}
              formatCurrency={formatCurrency}
            />
          )}

          {activeReportId === "sale_orders" && (
            <SalesOrderRegister
              userId={userId}
              parties={accounting.allParties}
              products={accounting.allProducts}
            />
          )}

          {activeReportId === "purchase_orders" && (
            <PurchaseOrderRegister
              userId={userId}
              parties={accounting.allParties}
              products={accounting.allProducts}
            />
          )}

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

export default FinFlowReportsStudio;
