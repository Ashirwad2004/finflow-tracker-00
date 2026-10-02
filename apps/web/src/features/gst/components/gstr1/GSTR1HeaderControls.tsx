import React from "react";
import { Download, ListChecks, ShieldCheck, Lock, AlertCircle } from "lucide-react";
import { PERIODS } from "./gstr1Utils";

interface GSTR1HeaderControlsProps {
    bizGSTIN: string;
    selectedPeriod: number;
    setSelectedPeriod: (index: number) => void;
    isCA: boolean;
    isLocked: boolean;
    isPendingReview: boolean;
    onRunHealthCheck: () => void;
    onSetPeriodStatus: (status: "pending_review" | "locked") => void;
    onExportFullGSTR1: () => void;
    onDownloadGSTNJson: () => void;
}

export const GSTR1HeaderControls: React.FC<GSTR1HeaderControlsProps> = ({
    bizGSTIN,
    selectedPeriod,
    setSelectedPeriod,
    isCA,
    isLocked,
    isPendingReview,
    onRunHealthCheck,
    onSetPeriodStatus,
    onExportFullGSTR1,
    onDownloadGSTNJson,
}) => {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-5 h-5 text-orange-600" />
                    <h2 className="text-lg font-bold text-orange-900 dark:text-orange-200">GSTR-1 Return</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-700">
                        As per CGST Rules 2017
                    </span>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                    {bizGSTIN ? (
                        <>
                            GSTIN: <span className="font-mono font-bold">{bizGSTIN}</span>
                        </>
                    ) : (
                        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                            <AlertCircle className="w-3.5 h-3.5" /> GSTIN not set in Profile — add it for accurate B2B classification
                        </span>
                    )}
                </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
                <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                    className="h-9 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-800 dark:text-slate-200 min-w-[220px]"
                >
                    {PERIODS.map((p, i) => (
                        <option key={i} value={i}>
                            {p.label}
                        </option>
                    ))}
                </select>
                <button
                    onClick={onRunHealthCheck}
                    className="h-9 px-3 text-sm font-bold flex items-center gap-1.5 rounded-lg border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                >
                    <ListChecks className="w-4 h-4" />
                    Run Health Check
                </button>
                {!isCA ? (
                    <button
                        onClick={() => onSetPeriodStatus("pending_review")}
                        disabled={isLocked || isPendingReview}
                        className={`h-9 px-3 text-sm font-bold flex items-center gap-1.5 rounded-lg border transition-colors ${
                            isLocked || isPendingReview
                                ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                                : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        {isLocked ? "Locked" : isPendingReview ? "Pending CA Review" : "Submit for Review"}
                    </button>
                ) : (
                    <button
                        onClick={() => onSetPeriodStatus("locked")}
                        disabled={isLocked}
                        className={`h-9 px-3 text-sm font-bold flex items-center gap-1.5 rounded-lg border transition-colors ${
                            isLocked
                                ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        }`}
                    >
                        <Lock className="w-4 h-4" />
                        {isLocked ? "Period Locked" : "Approve & Lock"}
                    </button>
                )}
                <button
                    onClick={onExportFullGSTR1}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-all shadow-sm"
                >
                    <Download className="w-4 h-4" />
                    Export Full GSTR-1
                </button>
                <button
                    onClick={onDownloadGSTNJson}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-sm"
                >
                    <Download className="w-4 h-4" />
                    Download JSON (Utility)
                </button>
            </div>
        </div>
    );
};
