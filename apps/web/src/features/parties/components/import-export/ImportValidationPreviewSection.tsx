import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    CheckCircle,
    AlertTriangle,
    AlertCircle,
    ShieldCheck,
    Download,
} from "lucide-react";
import {
    ParsedPartyRow,
    RowResolutionAction,
} from "../../types/partyImportExportTypes";

export interface ImportStats {
    total: number;
    ready: number;
    duplicates: number;
    conflicts: number;
    errors: number;
    warnings: number;
    needsAttention: number;
    customers: number;
    vendors: number;
    both: number;
}

export interface PlannedActions {
    toCreate: number;
    toMerge: number;
    toSkip: number;
    excludedErrors: number;
}

interface ImportValidationPreviewSectionProps {
    stats: ImportStats;
    parsedRows: ParsedPartyRow[];
    visibleRows: ParsedPartyRow[];
    previewFilter: "all" | "ready" | "duplicates" | "conflicts" | "errors";
    setPreviewFilter: (filter: "all" | "ready" | "duplicates" | "conflicts" | "errors") => void;
    globalDuplicateAction: RowResolutionAction;
    handleApplyGlobalDuplicateAction: (action: "merge" | "skip" | "create_new") => void;
    handleToggleRowAction: (rowNumber: number, action: RowResolutionAction) => void;
    handleDownloadErrorReport: () => void;
    onBackToMap: () => void;
    onProceedToConfirm: () => void;
    plannedActions: PlannedActions;
}

export const ImportValidationPreviewSection: React.FC<ImportValidationPreviewSectionProps> = ({
    stats,
    parsedRows,
    visibleRows,
    previewFilter,
    setPreviewFilter,
    globalDuplicateAction,
    handleApplyGlobalDuplicateAction,
    handleToggleRowAction,
    handleDownloadErrorReport,
    onBackToMap,
    onProceedToConfirm,
    plannedActions,
}) => {
    return (
        <div className="space-y-4">
            {/* Summary Dashboard as specified in enterprise spec */}
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

            {/* Detailed Error & Attention Ledger Box */}
            {(stats.errors > 0 || stats.conflicts > 0 || stats.warnings > 0) && (
                <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/50 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            Records Needing Attention ({stats.errors + stats.conflicts + stats.warnings} entries)
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDownloadErrorReport}
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
            )}

            {/* Duplicate Resolution Strategy Selector */}
            {stats.duplicates > 0 && (
                <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 p-3.5 rounded-xl space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <p className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-amber-600" />
                                How to Handle Existing Parties ({stats.duplicates} matched)
                            </p>
                            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                Choose how to handle parties that already exist in your directory. You can also change individual rows in the table below.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {(["merge", "skip", "create_new"] as const).map((strat) => (
                                <Button
                                    key={strat}
                                    size="sm"
                                    variant={globalDuplicateAction === strat ? "default" : "outline"}
                                    onClick={() => handleApplyGlobalDuplicateAction(strat)}
                                    className={`h-7 text-xs font-bold rounded-lg capitalize ${
                                        globalDuplicateAction === strat
                                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                                            : "border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                    }`}
                                >
                                    {strat === "merge" ? "Merge / Update" : strat === "skip" ? "Skip Duplicates" : "Create New"}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Tabs & Preview Table */}
            <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setPreviewFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            previewFilter === "all"
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        }`}
                    >
                        All ({stats.total})
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewFilter("ready")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            previewFilter === "ready"
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        }`}
                    >
                        Ready ({stats.ready})
                    </button>
                    {stats.duplicates > 0 && (
                        <button
                            type="button"
                            onClick={() => setPreviewFilter("duplicates")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                previewFilter === "duplicates"
                                ? "bg-amber-600 text-white"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            }`}
                        >
                            Duplicates ({stats.duplicates})
                        </button>
                    )}
                    {stats.conflicts > 0 && (
                        <button
                            type="button"
                            onClick={() => setPreviewFilter("conflicts")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                previewFilter === "conflicts"
                                ? "bg-purple-600 text-white"
                                : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                            }`}
                        >
                            Conflicts ({stats.conflicts})
                        </button>
                    )}
                    {stats.errors > 0 && (
                        <button
                            type="button"
                            onClick={() => setPreviewFilter("errors")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                previewFilter === "errors"
                                ? "bg-rose-600 text-white"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                            }`}
                        >
                            Errors ({stats.errors})
                        </button>
                    )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10 text-[11px] font-bold">
                            <TableRow>
                                <TableHead className="w-12 text-center">Row</TableHead>
                                <TableHead>Party Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Phone / GSTIN</TableHead>
                                <TableHead className="text-right">Opening Balance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                                        No records found under this filter.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleRows.map((row) => (
                                    <TableRow
                                        key={row.rowNumber}
                                        className={`text-xs ${
                                            row.healthStatus === "error"
                                                ? "bg-rose-50/50 dark:bg-rose-950/20"
                                                : row.duplicateStatus === "conflict"
                                                ? "bg-purple-50/40 dark:bg-purple-950/10"
                                                : row.duplicateStatus === "duplicate"
                                                ? "bg-amber-50/40 dark:bg-amber-950/10"
                                                : ""
                                        }`}
                                    >
                                        <TableCell className="text-center text-slate-400 font-mono text-[10px]">
                                            {row.rowNumber}
                                        </TableCell>
                                        <TableCell className="font-bold text-foreground">
                                            {row.name || <span className="text-rose-500 italic">Missing Name</span>}
                                            {row.duplicateReason && (
                                                <span className="block text-[10px] font-normal text-amber-700 dark:text-amber-400">
                                                    {row.duplicateReason}
                                                </span>
                                            )}
                                            {row.errors.length > 0 && (
                                                <span className="block text-[10px] font-normal text-rose-600 dark:text-rose-400">
                                                    {row.errors.join(", ")}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`capitalize text-[10px] font-semibold ${
                                                    row.type === "customer"
                                                        ? "text-blue-600 border-blue-200"
                                                        : row.type === "vendor"
                                                        ? "text-purple-600 border-purple-200"
                                                        : "text-emerald-600 border-emerald-200"
                                                }`}
                                            >
                                                {row.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                                            <div>{row.phone || "-"}</div>
                                            <div className="text-[10px] text-muted-foreground">{row.gst_number || "-"}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                            {row.opening_balance > 0 ? (
                                                <span>
                                                    ₹{row.opening_balance.toLocaleString()}{" "}
                                                    <span
                                                        className={`text-[10px] font-normal ${
                                                            row.opening_balance_type === "to_receive"
                                                                ? "text-emerald-600"
                                                                : "text-rose-600"
                                                        }`}
                                                    >
                                                        ({row.opening_balance_type === "to_receive" ? "Dr" : "Cr"})
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 font-normal">₹0</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {row.healthStatus === "error" ? (
                                                <Badge variant="destructive" className="text-[10px]">
                                                    Syntax Error
                                                </Badge>
                                            ) : row.duplicateStatus === "conflict" ? (
                                                <Badge className="bg-purple-600 text-white hover:bg-purple-600 text-[10px]">
                                                    Conflict
                                                </Badge>
                                            ) : row.duplicateStatus === "duplicate" ? (
                                                <Badge className="bg-amber-500 text-white hover:bg-amber-500 text-[10px]">
                                                    Duplicate Match
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px]">
                                                    Ready (New)
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {row.healthStatus === "error" ? (
                                                <span className="text-[10px] text-rose-500 font-bold">Exclude</span>
                                            ) : (
                                                <select
                                                    value={row.resolutionAction}
                                                    onChange={(e) =>
                                                        handleToggleRowAction(
                                                            row.rowNumber,
                                                            e.target.value as RowResolutionAction
                                                        )
                                                    }
                                                    className="h-6 text-[10px] font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1"
                                                >
                                                    <option value="create_new">Create New</option>
                                                    {row.matchedPartyId && <option value="merge">Merge</option>}
                                                    <option value="skip">Skip</option>
                                                </select>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Transition to Confirmation */}
            <div className="flex items-center justify-between pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBackToMap}
                    className="text-xs rounded-xl"
                >
                    &larr; Back to Column Mapping
                </Button>
                <Button
                    size="sm"
                    onClick={onProceedToConfirm}
                    disabled={plannedActions.toCreate === 0 && plannedActions.toMerge === 0}
                    className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl gap-1.5"
                >
                    Review & Confirm Batch Import &rarr;
                </Button>
            </div>
        </div>
    );
};
