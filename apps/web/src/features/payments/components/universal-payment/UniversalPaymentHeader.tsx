import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface UniversalPaymentHeaderProps {
  isReceipt: boolean;
}

export function UniversalPaymentHeader({ isReceipt }: UniversalPaymentHeaderProps) {
  return (
    <div
      className={`px-6 py-4.5 border-b shrink-0 ${
        isReceipt
          ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-100 dark:border-emerald-950/40"
          : "bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-100 dark:border-indigo-950/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              isReceipt
                ? "bg-emerald-600 shadow-emerald-500/20"
                : "bg-indigo-600 shadow-indigo-500/20"
            }`}
          >
            {isReceipt ? (
              <ArrowDownLeft className="w-6 h-6" />
            ) : (
              <ArrowUpRight className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                {isReceipt ? "Record Payment In" : "Record Payment Out"}
              </DialogTitle>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isReceipt
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                }`}
              >
                {isReceipt ? "Receipt Voucher" : "Payment Voucher"}
              </span>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isReceipt
                ? "Receive customer payment against outstanding invoices or on account"
                : "Make vendor disbursement against purchase bills or advance payment"}
            </DialogDescription>
          </div>
        </div>
      </div>
    </div>
  );
}
