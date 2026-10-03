import React from "react";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface PurchasesMetricsStripProps {
    outstandingTotal: number;
    overdueTotal: number;
    spentThisMonth: number;
}

export const PurchasesMetricsStrip: React.FC<PurchasesMetricsStripProps> = ({
    outstandingTotal,
    overdueTotal,
    spentThisMonth,
}) => {
    const { formatCurrency } = useCurrency();

    return (
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm mb-3 divide-x divide-slate-100 dark:divide-slate-800 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 flex-1">
                <div className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Unpaid Bills</p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                        {formatCurrency(outstandingTotal)}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5 flex-1">
                <div className="h-7 w-7 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overdue Bills</p>
                    <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400 leading-tight">
                        {formatCurrency(overdueTotal)}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5 flex-1">
                <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Spent this Month</p>
                    <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
                        {formatCurrency(spentThisMonth)}
                    </p>
                </div>
            </div>
        </div>
    );
};
