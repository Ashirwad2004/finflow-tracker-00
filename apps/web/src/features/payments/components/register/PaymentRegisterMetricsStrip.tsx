import { ArrowDownLeft, ArrowUpRight, Banknote, QrCode, Plus } from "lucide-react";
import { PaymentRegisterMetrics, PaymentRegisterType } from "./types";

interface PaymentRegisterMetricsStripProps {
  type: PaymentRegisterType;
  metrics: PaymentRegisterMetrics;
  formatCurrency: (amount: number) => string;
  onQuickAction: () => void;
}

export const PaymentRegisterMetricsStrip = ({
  type,
  metrics,
  formatCurrency,
  onQuickAction,
}: PaymentRegisterMetricsStripProps) => {
  const isIn = type === "in";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Metric 1: Total */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isIn ? "Total Payment In" : "Total Payment Out"}
          </p>
          <p
            className={`text-xl font-black mt-0.5 ${
              isIn ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(metrics.totalAmount)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {metrics.count} total transactions
          </p>
        </div>
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
            isIn
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
          }`}
        >
          {isIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
        </div>
      </div>

      {/* Metric 2: Cash */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isIn ? "Cash Collection" : "Cash Outflow"}
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(metrics.cashAmount)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {isIn ? "Received in Hand" : "Paid from Register"}
          </p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
          <Banknote className="w-5 h-5" />
        </div>
      </div>

      {/* Metric 3: Online */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Bank & Online / UPI
          </p>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {formatCurrency(metrics.onlineAmount)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {isIn ? "Direct to Bank / QR" : "Bank Transfer / UPI"}
          </p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
          <QrCode className="w-5 h-5" />
        </div>
      </div>

      {/* Metric 4: Quick Action */}
      <div
        className={`p-4 rounded-xl text-white shadow-sm flex flex-col justify-between ${
          isIn
            ? "bg-gradient-to-br from-emerald-600 to-teal-700"
            : "bg-gradient-to-br from-rose-600 to-red-700"
        }`}
      >
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">
            Quick Action
          </span>
          <p className="text-sm font-extrabold text-white mt-0.5">
            {isIn ? "Record New Payment In" : "Record New Payment Out"}
          </p>
        </div>
        <button
          onClick={onQuickAction}
          className={`mt-2 w-full py-1.5 px-3 bg-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
            isIn ? "text-emerald-700 hover:bg-emerald-50" : "text-rose-700 hover:bg-rose-50"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{isIn ? "+ Add Payment In" : "+ Add Payment Out"}</span>
        </button>
      </div>
    </div>
  );
};
