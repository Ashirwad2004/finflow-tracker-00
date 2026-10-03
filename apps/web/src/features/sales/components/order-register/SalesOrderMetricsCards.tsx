import React from "react";
import { ShoppingBag, Clock, Boxes, CheckCircle } from "lucide-react";
import { SalesOrderMetrics } from "./types";

interface SalesOrderMetricsCardsProps {
  metrics: SalesOrderMetrics;
}

export const SalesOrderMetricsCards: React.FC<SalesOrderMetricsCardsProps> = ({
  metrics,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Total Booked
          </span>
          <ShoppingBag className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
          ₹{metrics.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {metrics.totalCount} orders booked
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Awaiting Delivery
          </span>
          <Clock className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
          {metrics.confirmedCount + metrics.partialCount}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          ₹{metrics.confirmedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}{" "}
          unfulfilled
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Reserved Stock
          </span>
          <Boxes className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
          {metrics.totalReservedUnits} <span className="text-xs font-normal">units</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          Physical shelf stock intact
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Fully Invoiced
          </span>
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {metrics.deliveredCount}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Converted to Sale Invoices
        </div>
      </div>
    </div>
  );
};
