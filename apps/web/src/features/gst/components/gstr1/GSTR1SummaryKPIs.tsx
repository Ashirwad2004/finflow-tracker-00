import React from "react";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface GSTR1SummaryKPIsProps {
    summary: {
        totalTaxable: number;
        totalTax: number;
        totalValue: number;
        igst: number;
        cgst: number;
        sgst: number;
    };
    salesCount: number;
}

export const GSTR1SummaryKPIs: React.FC<GSTR1SummaryKPIsProps> = ({ summary, salesCount }) => {
    const { formatCurrency } = useCurrency();
    const totalTax = summary.igst + summary.cgst + summary.sgst;

    return (
        <div className="space-y-4">
            {/* ── Table 3.1: Summary Dashboard ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: "Total Invoice Value",
                        value: formatCurrency(summary.totalValue),
                        color: "text-slate-800 dark:text-white",
                        bg: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
                    },
                    {
                        label: "Total Taxable Value",
                        value: formatCurrency(summary.totalTaxable),
                        color: "text-emerald-700 dark:text-emerald-400",
                        bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
                    },
                    {
                        label: "Total GST Collected",
                        value: formatCurrency(totalTax),
                        color: "text-orange-700 dark:text-orange-400",
                        bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
                    },
                    {
                        label: "Total Invoices",
                        value: `${salesCount} invoices`,
                        color: "text-blue-700 dark:text-blue-400",
                        bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
                    },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            {label}
                        </p>
                        <p className={`text-xl font-black ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Tax breakdown */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    {
                        label: "IGST (Inter-State)",
                        value: summary.igst,
                        color: "text-purple-700 dark:text-purple-400",
                        bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
                    },
                    {
                        label: "CGST (Intra-State)",
                        value: summary.cgst,
                        color: "text-indigo-700 dark:text-indigo-400",
                        bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800",
                    },
                    {
                        label: "SGST (Intra-State)",
                        value: summary.sgst,
                        color: "text-sky-700 dark:text-sky-400",
                        bg: "bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800",
                    },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            {label}
                        </p>
                        <p className={`text-lg font-black ${color}`}>{formatCurrency(value)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
