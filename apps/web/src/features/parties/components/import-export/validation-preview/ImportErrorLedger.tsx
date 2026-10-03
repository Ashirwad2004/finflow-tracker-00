import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download } from "lucide-react";
import { ParsedPartyRow } from "../../types/partyImportExportTypes";
import { ImportStats } from "./types";

interface ImportErrorLedgerProps {
    stats: ImportStats;
    parsedRows: ParsedPartyRow[];
    onDownloadErrorReport: () => void;
}

export const ImportErrorLedger: React.FC<ImportErrorLedgerProps> = ({
    stats,
    parsedRows,
    onDownloadErrorReport,
}) => {
    if (stats.errors === 0 && stats.conflicts === 0 && stats.warnings === 0) {
        return null;
    }

    return (
        <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    Records Needing Attention ({stats.errors + stats.conflicts + stats.warnings} entries)
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onDownloadErrorReport}
                    className="h-7 text-xs font-bold gap-1 rounded-lg border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50"
                >
                    <Download className="w-3 h-3" />
                    Download Error Report (.xlsx)
                </Button>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] font-mono pr-2">
                {parsedRows
                    .filter(
                        (r) =>
                            r.healthStatus === "error" ||
                            r.duplicateStatus === "conflict" ||
                            r.warnings.length > 0
                    )
                    .slice(0, 10)
                    .map((r, eIdx) => (
                        <div key={eIdx} className="flex items-start gap-2 text-rose-700 dark:text-rose-400">
                            <span className="font-bold shrink-0">Row {r.rowNumber}:</span>
                            <span>
                                {[...r.errors, ...r.warnings, r.duplicateReason].filter(Boolean).join(" — ")}
                            </span>
                        </div>
                    ))}
                {parsedRows.filter((r) => r.healthStatus === "error" || r.duplicateStatus === "conflict").length >
                    10 && (
                    <p className="text-[10px] text-slate-500 font-sans italic pt-1">
                        ...and{" "}
                        {parsedRows.filter((r) => r.healthStatus === "error" || r.duplicateStatus === "conflict")
                            .length - 10}{" "}
                        more. Download error report for complete details.
                    </p>
                )}
            </div>
        </div>
    );
};
