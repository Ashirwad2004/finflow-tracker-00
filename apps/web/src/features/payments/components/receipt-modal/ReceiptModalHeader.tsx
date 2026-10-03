import React from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Copy, Trash2 } from "lucide-react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentReceiptDetails } from "./types";

interface ReceiptModalHeaderProps {
  receiptData: PaymentReceiptDetails;
  isReceipt: boolean;
  copiedVoucher: boolean;
  hasDeleteHandler: boolean;
  onCopyVoucher: () => void;
  onRequestDelete: () => void;
}

export const ReceiptModalHeader: React.FC<ReceiptModalHeaderProps> = ({
  receiptData,
  isReceipt,
  copiedVoucher,
  hasDeleteHandler,
  onCopyVoucher,
  onRequestDelete,
}) => {
  return (
    <div
      className={`px-6 py-4 border-b shrink-0 flex items-center justify-between ${
        isReceipt
          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40"
          : "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
            isReceipt ? "bg-emerald-600" : "bg-indigo-600"
          }`}
        >
          {isReceipt ? (
            <ArrowDownLeft className="w-5 h-5" />
          ) : (
            <ArrowUpRight className="w-5 h-5" />
          )}
        </div>
        <div>
          <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>{isReceipt ? "Receipt Voucher" : "Payment Voucher"}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                isReceipt
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300"
                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-300"
              }`}
            >
              {isReceipt ? "Payment In" : "Payment Out"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {receiptData.voucherNumber}
            </span>
            <button
              onClick={onCopyVoucher}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Copy Voucher #"
            >
              {copiedVoucher ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
            <span>&bull;</span>
            <span>{receiptData.date}</span>
            {receiptData.time && <span>{receiptData.time}</span>}
          </DialogDescription>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {hasDeleteHandler && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRequestDelete}
            className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            title="Void or Delete this Voucher"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Void
          </Button>
        )}
      </div>
    </div>
  );
};
