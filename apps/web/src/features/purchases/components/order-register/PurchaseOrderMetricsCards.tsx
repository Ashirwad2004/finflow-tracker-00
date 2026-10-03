import React from "react";
import { ShoppingCart, Clock, Boxes, CheckCircle } from "lucide-react";
import { PurchaseOrderMetrics } from "./types";

interface PurchaseOrderMetricsCardsProps {
  metrics: PurchaseOrderMetrics;
}

export const PurchaseOrderMetricsCards: React.FC<PurchaseOrderMetricsCardsProps> = ({
  metrics,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Total Procurement
          </span>
          <ShoppingCart className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
          ₹{metrics.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {metrics.totalCount} orders issued
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Awaiting Inbound
          </span>
          <Clock className="w-4 h-4 text-teal-500" />
        </div>
        <div className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400">
          {metrics.sentCount + metrics.partialCount}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          ₹{metrics.sentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}{" "}
          in transit
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Expected Influx
          </span>
          <Boxes className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {metrics.totalExpectedUnits} <span className="text-xs font-normal">units</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          Awaiting warehouse receipt
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Fully Billed
          </span>
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {metrics.receivedCount}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Converted to Purchase Bills
        </div>
      </div>
    </div>
  );
};
