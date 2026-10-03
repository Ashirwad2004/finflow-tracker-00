import React, { RefObject } from "react";
import { Virtualizer } from "@tanstack/react-virtual";
import { isRecordOverdue } from "@/core/utils/overdue";
import {
  MoreHorizontal,
  Printer,
  Eye,
  Download,
  Share2,
  Pencil,
  Trash2,
  ScrollText,
  ReceiptIndianRupee,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableLoadingRows } from "@/components/shared/PageStates";
import { Purchase } from "../../types";
import { formatDateSafe } from "../../hooks/usePurchasesPageCalculations";

interface PurchasesDesktopTableProps {
  purchases: Purchase[];
  isLoading: boolean;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  tableContainerRef: RefObject<HTMLDivElement | null>;
  formatCurrency: (amount: number) => string;
  onEdit: (purchase: Purchase) => void;
  onPrint: (purchase: Purchase) => void;
  onPreview: (purchase: Purchase) => void;
  onDownload: (purchase: Purchase) => void;
  onShare: (purchase: Purchase) => void;
  onDelete: (purchase: Purchase) => void;
  onOpenRecordPayment: (purchase: Purchase) => void;
  onOpenTranscript: (purchase: Purchase) => void;
}

export const PurchasesDesktopTable: React.FC<PurchasesDesktopTableProps> = ({
  purchases,
  isLoading,
  rowVirtualizer,
  tableContainerRef,
  formatCurrency,
  onEdit,
  onPrint,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  onOpenRecordPayment,
  onOpenTranscript,
}) => {
  return (
    <div className="hidden md:block overflow-auto max-h-[65vh] w-full" ref={tableContainerRef as any}>
      <table className="w-full text-left border-collapse min-w-[1050px] relative">
        <thead className="sticky top-0 z-10 shadow-sm">
          <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <th className="px-4 py-2.5">Bill Ref</th>
            <th className="px-4 py-2.5">Vendor</th>
            <th className="px-4 py-2.5">Date</th>
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
            <TableLoadingRows cols={9} rows={5} />
          ) : purchases.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                No purchases matching your criteria.
              </td>
            </tr>
          ) : (
            <>
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr>
                  <td colSpan={9} style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
                </tr>
              )}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const purchase = purchases[virtualRow.index];
                const amtPaid = Number(purchase.amount_paid || 0);
                const balDue = Number(
                  purchase.balance_due != null
                    ? purchase.balance_due
                    : Math.max(0, purchase.total_amount - amtPaid)
                );
                const isSettled = balDue <= 0.001 && purchase.total_amount > 0;

                return (
                  <tr
                    key={purchase.id}
                    onClick={() => onEdit(purchase)}
                    className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {purchase.bill_number ? purchase.bill_number : `#${purchase.id.substring(0, 6)}`}
                        </p>
                        {purchase.bill_number?.startsWith("PAY-") && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 uppercase tracking-wider">
                            Payment Out
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{purchase.items?.length || 0} items</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {purchase.vendor_name?.substring(0, 2).toUpperCase() || "NA"}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                          {purchase.vendor_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <div>{formatDateSafe(purchase.date, "MMM dd, yyyy")}</div>
                      {purchase.due_date && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Due: {formatDateSafe(purchase.due_date, "MMM dd")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-right">
                      {purchase.tax_amount ? formatCurrency(purchase.tax_amount) : formatCurrency(0)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-extrabold text-slate-900 dark:text-white text-right">
                      {formatCurrency(purchase.total_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">
                      {formatCurrency(amtPaid)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-right">
                      {balDue > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRecordPayment(purchase);
                          }}
                          className="font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline transition-colors block ml-auto"
                          title="Click to Record Payment Out"
                        >
                          {formatCurrency(balDue)}
                        </button>
                      ) : (
                        <span className="text-slate-400 font-semibold">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isSettled || purchase.status === "paid" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTranscript(purchase);
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:scale-105 transition-transform"
                          title="Paid — Click to view Payment Ledger"
                        >
                          Paid
                        </button>
                      ) : amtPaid > 0 && amtPaid < purchase.total_amount ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRecordPayment(purchase);
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 hover:scale-105 transition-transform"
                          title={`Partial (Due: ${formatCurrency(balDue)}) — Click to Pay`}
                        >
                          Partial
                        </button>
                      ) : isRecordOverdue(purchase) && amtPaid === 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRecordPayment(purchase);
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 hover:scale-105 transition-transform"
                          title="Overdue — Click to Pay"
                        >
                          Overdue
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRecordPayment(purchase);
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:scale-105 transition-transform"
                          title="Unpaid — Click to Pay"
                        >
                          Unpaid
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity">
                        {balDue > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRecordPayment(purchase);
                            }}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-2xs transition-all mr-1"
                            title="Record Payment Out"
                          >
                            <ReceiptIndianRupee className="w-3 h-3" />
                            <span>Payment Out</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrint(purchase);
                          }}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all"
                          title="Print Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            {balDue > 0 && (
                              <DropdownMenuItem
                                onClick={() => onOpenRecordPayment(purchase)}
                                className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                              >
                                <ReceiptIndianRupee className="w-4 h-4 mr-2 text-indigo-500" />
                                Record Payment Out
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => onOpenTranscript(purchase)}
                              className="cursor-pointer"
                            >
                              <ScrollText className="w-4 h-4 mr-2 text-slate-500" />
                              Payment Transcript / Ledger
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPrint(purchase)}>
                              <Printer className="w-4 h-4 mr-2" />
                              Print Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPreview(purchase)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDownload(purchase)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onShare(purchase)}>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(purchase)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDelete(purchase)}
                              className="text-red-500 hover:text-red-600 focus:text-red-600 dark:text-red-400 dark:hover:text-red-300 dark:focus:text-red-300"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Bill
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
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
  );
};
