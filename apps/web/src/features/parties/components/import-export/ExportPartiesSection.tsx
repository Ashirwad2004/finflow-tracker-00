import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Download } from "lucide-react";
import { Party } from "../../types";

interface ExportPartiesSectionProps {
    existingParties: Party[];
    exportFilter: "all" | "customer" | "vendor" | "both";
    setExportFilter: (filter: "all" | "customer" | "vendor" | "both") => void;
    handleExecuteExportExcel: () => void;
    handleExecuteExportPDF: () => void;
}

export const ExportPartiesSection: React.FC<ExportPartiesSectionProps> = ({
    existingParties,
    exportFilter,
    setExportFilter,
    handleExecuteExportExcel,
    handleExecuteExportPDF,
}) => {
    return (
        <div className="space-y-5 py-2">
            <div className="bg-slate-50 dark:bg-slate-900 border rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-sm text-foreground">Select Party Directory Filter</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(["all", "customer", "vendor", "both"] as const).map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => setExportFilter(opt)}
                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                                exportFilter === opt
                                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                            }`}
                        >
                            <span className="capitalize text-xs font-bold">
                                {opt === "all" ? "All Parties" : opt === "both" ? "Both (Cust & Vend)" : `${opt}s`}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {opt === "all" 
                                    ? `${existingParties.length} records`
                                    : `${existingParties.filter((p) => p.type === opt).length} records`}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3 bg-card flex flex-col justify-between">
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm">Microsoft Excel (.xlsx)</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            Spreadsheet with party names, contacts, GSTIN, opening balances, total billed, paid, and balance due.
                        </p>
                    </div>
                    <Button
                        onClick={handleExecuteExportExcel}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 rounded-xl"
                    >
                        <Download className="w-4 h-4" />
                        Download Excel
                    </Button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3 bg-card flex flex-col justify-between">
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm">Formatted PDF Directory</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            Print-ready clean accounting master directory with business header, party ledgers, and summary totals.
                        </p>
                    </div>
                    <Button
                        onClick={handleExecuteExportPDF}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 h-9 rounded-xl"
                    >
                        <Download className="w-4 h-4" />
                        Download PDF
                    </Button>
                </div>
            </div>
        </div>
    );
};
