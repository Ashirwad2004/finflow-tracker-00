import React, { useRef } from "react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { PurchasesTableProps } from "./types";
import { usePurchasesTableFilter } from "./usePurchasesTableFilter";
import { PurchasesFilterToolbar } from "./PurchasesFilterToolbar";
import { PurchasesMobileCards } from "./PurchasesMobileCards";
import { PurchasesDesktopTable } from "./PurchasesDesktopTable";

export const PurchasesTable: React.FC<PurchasesTableProps> = ({
  purchases,
  isLoading,
  searchTerm,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  onEdit,
  onPrint,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  onOpenRecordPayment,
  onOpenTranscript,
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { formatCurrency } = useCurrency();

  const { sortedAndFilteredPurchases, rowVirtualizer } = usePurchasesTableFilter({
    purchases,
    searchTerm,
    filterStatus,
    sortBy,
    tableContainerRef,
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      <PurchasesFilterToolbar
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <PurchasesMobileCards
        purchases={sortedAndFilteredPurchases}
        isLoading={isLoading}
        formatCurrency={formatCurrency}
        onEdit={onEdit}
        onPrint={onPrint}
        onPreview={onPreview}
        onDownload={onDownload}
        onShare={onShare}
        onDelete={onDelete}
        onOpenRecordPayment={onOpenRecordPayment}
        onOpenTranscript={onOpenTranscript}
      />

      <PurchasesDesktopTable
        purchases={sortedAndFilteredPurchases}
        isLoading={isLoading}
        rowVirtualizer={rowVirtualizer}
        tableContainerRef={tableContainerRef}
        formatCurrency={formatCurrency}
        onEdit={onEdit}
        onPrint={onPrint}
        onPreview={onPreview}
        onDownload={onDownload}
        onShare={onShare}
        onDelete={onDelete}
        onOpenRecordPayment={onOpenRecordPayment}
        onOpenTranscript={onOpenTranscript}
      />
    </div>
  );
};

export default PurchasesTable;
export * from "./types";
export * from "./usePurchasesTableFilter";
