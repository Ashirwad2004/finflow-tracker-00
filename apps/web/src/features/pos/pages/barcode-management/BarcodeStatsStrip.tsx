import React from "react";
import { Package, CheckCircle2, AlertCircle, Layers } from "lucide-react";
import { BarcodeStats } from "./types";

interface BarcodeStatsStripProps {
  stats: BarcodeStats;
}

export const BarcodeStatsStrip: React.FC<BarcodeStatsStripProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Total Catalog
          </span>
          <div className="text-2xl font-black text-foreground mt-1 tracking-tight">
            {stats.total}
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
          <Package className="w-5 h-5" />
        </div>
      </div>

      <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Tagged Barcodes
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">
            {stats.withBarcode}
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Missing Barcodes
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tracking-tight">
            {stats.missing}
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <AlertCircle className="w-5 h-5" />
        </div>
      </div>

      <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
        <div className="flex-1 pr-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Catalog Coverage
          </span>
          <div className="text-2xl font-black text-primary mt-1 tracking-tight">
            {stats.coverage}%
          </div>
          <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.coverage}%` }}
            />
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Layers className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
