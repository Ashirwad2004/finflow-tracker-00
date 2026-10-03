import React from "react";
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
import { Purchase } from "../../types";
import { formatDateSafe } from "../../hooks/usePurchasesPageCalculations";

interface PurchasesMobileCardsProps {
  purchases: Purchase[];
  isLoading: boolean;
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

export const PurchasesMobileCards: React.FC<PurchasesMobileCardsProps> = ({
  purchases,
  isLoading,
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
  if (isLoading) {
    return <div className="p-6 text-center text-slate-400 text-xs">Loading purchase bills...</div>;
  }

  if (purchases.length === 0) {
    return <div className="p-8 text-center text-slate-500 text-xs">No purchase bills matching your criteria.</div>;
  }

  return (
    <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[65vh]">
      {purchases.map((purchase) => {
        const amtPaid = Number(purchase.amount_paid || 0);
        const balDue = Number(
          purchase.balance_due != null
            ? purchase.balance_due
            : Math.max(0, purchase.total_amount - amtPaid)
        );
        const isSettled = balDue <= 0.001 && purchase.total_amount > 0;

        return (
          <div
            key={purchase.id}
            onClick={() => onEdit(purchase)}
            className="p-3.5 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {purchase.bill_number || `#${purchase.id.substring(0, 6)}`}
                </span>
                {isSettled || purchase.status === "paid" ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                    Paid
                  </span>
                ) : amtPaid > 0 && balDue > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200">
                    Partial
                  </span>
                ) : isRecordOverdue(purchase) ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
                    Overdue
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                    Unpaid
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {balDue > 0 && (
                    <DropdownMenuItem
                      onClick={() => onOpenRecordPayment(purchase)}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                    >
                      <ReceiptIndianRupee className="w-4 h-4 mr-2" /> Record Payment Out
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onOpenTranscript(purchase)} className="cursor-pointer">
                    <ScrollText className="w-4 h-4 mr-2 text-slate-500" /> Payment Transcript
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPrint(purchase)}>
                    <Printer className="w-4 h-4 mr-2" /> Print Bill
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPreview(purchase)}>
                    <Eye className="w-4 h-4 mr-2" /> Preview PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload(purchase)}>
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onShare(purchase)}>
                    <Share2 className="w-4 h-4 mr-2" /> Share Bill
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(purchase)}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit Bill
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(purchase)}
                    className="text-red-500 hover:text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Bill
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                {purchase.vendor_name}
              </span>
              <span className="text-slate-400 text-[11px]">{formatDateSafe(purchase.date, "MMM dd, yyyy")}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Amount</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(purchase.total_amount)}
                </span>
              </div>
              {balDue > 0 ? (
                <div className="text-right">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block">Balance Due</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(balDue)}</span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-[10px] text-emerald-600 block">Payment</span>
                  <span className="font-bold text-emerald-600">Fully Settled</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
