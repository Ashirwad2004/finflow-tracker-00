/**
 * GSTR1Report.tsx
 *
 * A fully CA-compliant GSTR-1 report generator built from existing sales data.
 * Compliant with CGST Rules 2017: Tables 3.1, 4, 5, 7, 12, 13.
 */

import React from "react";
import { Receipt } from "lucide-react";
import {
  GSTR1HeaderControls,
  GSTR1SummaryKPIs,
  B2BTable,
  B2CLTable,
  B2CSTable,
  HSNTable,
  DocumentSummaryTable,
  HealthCheckModal,
  GSTR1FilingNote,
  useGSTR1Report,
} from "./gstr1";

export const GSTR1Report: React.FC = () => {
  const {
    period,
    selectedPeriod,
    setSelectedPeriod,
    bizGSTIN,
    isLoading,
    salesCount,
    summary,
    docSummary,
    b2bRecords,
    b2clRecords,
    b2csData,
    hsnSummary,
    healthErrors,
    showHealthModal,
    setShowHealthModal,
    isLocked,
    isPendingReview,
    isCA,
    runHealthCheck,
    setPeriodStatus,
    exportB2BCSV,
    exportB2CSCSV,
    exportHSNCSV,
    handleDownloadGSTNJson,
    handleExportFullGSTR1,
  } = useGSTR1Report();

  return (
    <div className="space-y-6">
      {/* Period selector + Header bar */}
      <GSTR1HeaderControls
        bizGSTIN={bizGSTIN}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        isCA={isCA}
        isLocked={isLocked}
        isPendingReview={isPendingReview}
        onRunHealthCheck={runHealthCheck}
        onSetPeriodStatus={setPeriodStatus}
        onExportFullGSTR1={handleExportFullGSTR1}
        onDownloadGSTNJson={handleDownloadGSTNJson}
      />

      {isLoading && (
        <div className="text-center py-16 text-slate-500 animate-pulse">
          Fetching invoices for {period.label}…
        </div>
      )}

      {!isLoading && salesCount === 0 && (
        <div className="border rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">No invoices found for {period.label}</p>
          <p className="text-sm mt-1">
            Create some invoices in the Sales section and they will appear here.
          </p>
        </div>
      )}

      {!isLoading && salesCount > 0 && (
        <>
          {/* Table 3.1: Summary Dashboard */}
          <GSTR1SummaryKPIs summary={summary} salesCount={salesCount} />

          {/* Table 4: B2B */}
          <B2BTable records={b2bRecords} onExportCSV={exportB2BCSV} />

          {/* Table 5: B2C Large */}
          <B2CLTable records={b2clRecords} />

          {/* Table 7: B2C Small */}
          <B2CSTable records={b2csData} onExportCSV={exportB2CSCSV} />

          {/* Table 12: HSN Summary */}
          <HSNTable records={hsnSummary} onExportCSV={exportHSNCSV} />

          {/* Table 13: Document Summary */}
          <DocumentSummaryTable docSummary={docSummary} />

          {/* Filing Note */}
          <GSTR1FilingNote />
        </>
      )}

      <HealthCheckModal
        open={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        errors={healthErrors}
      />
    </div>
  );
};

export default GSTR1Report;