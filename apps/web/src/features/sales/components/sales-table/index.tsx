import React, { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableLoadingRows } from "@/components/shared/PageStates";
import { SalesTableProps } from "./types";
import { SalesTableFilterBar } from "./SalesTableFilterBar";
import { SalesTableRow } from "./SalesTableRow";

export const SalesTable: React.FC<SalesTableProps> = ({
  invoices,
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
  onWhatsApp,
  onGenerateEInvoice,
  onDelete,
  onOpenRecordPayment,
  onOpenTranscript,
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const sortedAndFilteredInvoices = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    const filtered = invoices.filter((invoice) => {
      const matchesSearch =
        !lowerSearch ||
        (invoice.customer_name && invoice.customer_name.toLowerCase().includes(lowerSearch)) ||
        (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(lowerSearch));
      const matchesFilter = filterStatus === "all" || invoice.status === filterStatus;
      return matchesFilter && matchesSearch;
    });

    if (filtered.length <= 1) return filtered;

    return [...filtered].sort((a, b) => {
      if (sortBy === "date-desc") {
        return (b.date || "").localeCompare(a.date || "");
      }
      if (sortBy === "date-asc") {
        return (a.date || "").localeCompare(b.date || "");
      }
      if (sortBy === "amount-desc") {
        return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      }
      if (sortBy === "amount-asc") {
        return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      }
      return 0;
    });
  }, [invoices, searchTerm, filterStatus, sortBy]);

  const rowVirtualizer = useVirtualizer({
    count: sortedAndFilteredInvoices.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      <SalesTableFilterBar
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <div className="overflow-auto flex-1 min-h-0 w-full" ref={tableContainerRef}>
        <table className="w-full text-left border-collapse min-w-[1050px] relative">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <th className="px-4 py-2.5">Invoice</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Issue Date</th>
              <th className="px-4 py-2.5 text-right">Tax</th>
              <th className="px-4 py-2.5 text-right">Total Amount</th>
              <th className="px-4 py-2.5 text-right">Paid</th>
              <th className="px-4 py-2.5 text-right">Balance Due</th>
              <th className="px-4 py-2.5 text-center">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <TableLoadingRows cols={9} rows={6} />
            ) : sortedAndFilteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                  No invoices matching your criteria.
                </td>
              </tr>
            ) : (
              <>
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}
                    />
                  </tr>
                )}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const invoice = sortedAndFilteredInvoices[virtualRow.index];
                  return (
                    <SalesTableRow
                      key={invoice.id}
                      invoice={invoice}
                      onEdit={onEdit}
                      onPrint={onPrint}
                      onPreview={onPreview}
                      onDownload={onDownload}
                      onShare={onShare}
                      onWhatsApp={onWhatsApp}
                      onGenerateEInvoice={onGenerateEInvoice}
                      onDelete={onDelete}
                      onOpenRecordPayment={onOpenRecordPayment}
                      onOpenTranscript={onOpenTranscript}
                    />
                  );
                })}
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        height: `${
                          rowVirtualizer.getTotalSize() -
                          rowVirtualizer.getVirtualItems()[
                            rowVirtualizer.getVirtualItems().length - 1
                          ].end
                        }px`,
                      }}
                    />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
