import React from "react";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { ImportStats } from "./types";

interface ImportStatsDashboardProps {
    stats: ImportStats;
}

export const ImportStatsDashboard: React.FC<ImportStatsDashboardProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total Records
                </p>
                <p className="text-xl font-black text-foreground mt-0.5">
                    {stats.total.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                    {stats.customers} Cust &bull; {stats.vendors} Vend &bull; {stats.both} Both
                </p>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-3.5 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Ready to Add
                </p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {stats.ready.toLocaleString()}
                </p>
                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                    New Verified Parties
                </p>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 p-3.5 rounded-xl">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Needs Review
                </p>
                <p className="text-xl font-black text-amber-800 dark:text-amber-300 mt-0.5">
                    {stats.needsAttention.toLocaleString()}
                </p>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    {stats.duplicates} Duplicates &bull; {stats.conflicts} Conflicts
                </p>
            </div>

            <div
                className={`p-3.5 rounded-xl border ${
                    stats.errors > 0
                        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
            >
                <p
                    className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        stats.errors > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"
                    }`}
                >
                    <AlertCircle className="w-3 h-3" />
                    Errors to Fix
                </p>
                <p
                    className={`text-xl font-black mt-0.5 ${
                        stats.errors > 0 ? "text-rose-700 dark:text-rose-400" : "text-slate-400"
                    }`}
                >
                    {stats.errors.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                    {stats.errors > 0 ? "Excluded from import" : "0 Errors Found"}
                </p>
            </div>
        </div>
    );
};
