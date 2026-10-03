import React from "react";
import { Clock, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface ChequeMetricsStripProps {
  pendingReceivables: number;
  pendingPayables: number;
}

export const ChequeMetricsStrip: React.FC<ChequeMetricsStripProps> = ({
  pendingReceivables,
  pendingPayables,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Cheques in Transit (Net)
          </span>
          <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
            ₹
            {(pendingReceivables - pendingPayables).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">
            Pending Receivables (Inward)
          </span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            +₹
            {pendingReceivables.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
          <ArrowDownLeft className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider block">
            Pending Payables (Outward)
          </span>
          <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
            -₹
            {pendingPayables.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
          <ArrowUpRight className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
