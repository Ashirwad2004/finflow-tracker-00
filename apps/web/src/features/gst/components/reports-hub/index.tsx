import React, { useState, useMemo } from "react";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { GSTR1Report } from "../GSTR1Report";
import { GSTR2BReport } from "../GSTR2BReport";
import { GSTR3BReport } from "../GSTR3BReport";
import { GstViewPreference } from "./types";
import { INDIAN_GST_STATES, getDynamicGstPeriods } from "./constants";
import { useGstReconciliation } from "./useGstReconciliation";
import { GstSwitcherToolbar } from "./GstSwitcherToolbar";
import { ReconciliationSummaryCards } from "./ReconciliationSummaryCards";
import { ReconciliationLedgerTable } from "./ReconciliationLedgerTable";
import { ComplianceNotes } from "./ComplianceNotes";

export const GstReportsHub: React.FC = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  // Customer preference: persisted in localStorage
  const [activeTab, setActiveTab] = useState<GstViewPreference>(() => {
    const saved = localStorage.getItem("rupeebill_gst_preference");
    if (saved === "gstr1" || saved === "gstr2b" || saved === "gstr3b" || saved === "reconciliation") {
      return saved;
    }
    return "gstr1";
  });

  const handleTabChange = (tab: GstViewPreference) => {
    setActiveTab(tab);
    localStorage.setItem("rupeebill_gst_preference", tab);
  };

  const periods = useMemo(() => getDynamicGstPeriods(new Date()), []);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const activePeriod = periods[selectedPeriodIndex] || periods[0];

  // Effective GSTIN & State Code with fallback
  const [fallbackStateCode, setFallbackStateCode] = useState<string>(() => {
    return localStorage.getItem("rupeebill_fallback_state_code") || "27";
  });

  const handleStateCodeChange = (code: string) => {
    setFallbackStateCode(code);
    localStorage.setItem("rupeebill_fallback_state_code", code);
  };

  const { profile, recon, refetchRecon } = useGstReconciliation(
    user?.id,
    activePeriod,
    (profile?.gst_number || "").trim().length >= 2
      ? (profile?.gst_number || "").trim().slice(0, 2)
      : fallbackStateCode
  );

  const bizGSTIN = (profile?.gst_number || "").trim();
  const effectiveStateCode = bizGSTIN.length >= 2 ? bizGSTIN.slice(0, 2) : fallbackStateCode;

  return (
    <div className="space-y-6">
      <GstSwitcherToolbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        bizGSTIN={bizGSTIN}
        effectiveStateCode={effectiveStateCode}
        onStateCodeChange={handleStateCodeChange}
        periods={periods}
        selectedPeriodIndex={selectedPeriodIndex}
        onPeriodIndexChange={setSelectedPeriodIndex}
      />

      <div>
        {activeTab === "gstr1" && (
          <div className="animate-fade-in">
            <GSTR1Report />
          </div>
        )}

        {activeTab === "gstr2b" && (
          <div className="animate-fade-in">
            <GSTR2BReport />
          </div>
        )}

        {activeTab === "gstr3b" && (
          <div className="animate-fade-in">
            <GSTR3BReport />
          </div>
        )}

        {activeTab === "reconciliation" && (
          <div className="space-y-6 animate-fade-in">
            <ReconciliationSummaryCards recon={recon} formatCurrency={formatCurrency} />

            <ReconciliationLedgerTable
              recon={recon}
              activePeriod={activePeriod}
              onRecalculate={() => refetchRecon()}
              formatCurrency={formatCurrency}
            />

            <ComplianceNotes />
          </div>
        )}
      </div>
    </div>
  );
};

export default GstReportsHub;
export * from "./types";
export * from "./constants";
export * from "./useGstReconciliation";
