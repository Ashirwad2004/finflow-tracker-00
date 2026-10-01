import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAccountingData } from "../hooks/useAccountingData";
import { FinFlowReportsStudio, FinFlowReportId, FINFLOW_REPORTS_MENU } from "../components/reports/FinFlowReportsStudio";

const ReportsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const accounting = useAccountingData();

  // URL state synchronization
  const rawReport = searchParams.get("report") || searchParams.get("tab") || "sale_register";
  const urlParty = searchParams.get("party") || null;

  // Map legacy tabs if someone bookmarked ?tab=party-report or ?tab=gst-hub
  const activeReportId: FinFlowReportId = useMemo(() => {
    if (rawReport === "party-report" || rawReport === "parties") return "party_outstanding";
    if (rawReport === "detailed-ledger") return "party_statement";
    if (rawReport === "gst-hub" || rawReport === "gst") return "gstr1";
    if (rawReport === "stock") return "stock_summary";
    if (rawReport === "expenses") return "expense_register";
    if (rawReport === "orders") return "sale_orders";
    if (rawReport === "health") return "business_health";

    const exists = FINFLOW_REPORTS_MENU.some((m) => m.id === rawReport);
    return exists ? (rawReport as FinFlowReportId) : "sale_register";
  }, [rawReport]);

  return (
    <AppLayout>
      <div className="h-full w-full p-1 sm:p-2 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
        <FinFlowReportsStudio
          accounting={accounting}
          initialReportId={activeReportId}
          initialParty={urlParty}
        />
      </div>
    </AppLayout>
  );
};

export default ReportsPage;