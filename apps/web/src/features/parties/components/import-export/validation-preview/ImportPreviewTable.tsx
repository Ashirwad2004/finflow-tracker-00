import React from "react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ParsedPartyRow, RowResolutionAction } from "../../types/partyImportExportTypes";
import { ImportStats } from "./types";

interface ImportPreviewTableProps {
    stats: ImportStats;
    visibleRows: ParsedPartyRow[];
    previewFilter: "all" | "ready" | "duplicates" | "conflicts" | "errors";
    onSetPreviewFilter: (filter: "all" | "ready" | "duplicates" | "conflicts" | "errors") => void;
    onToggleRowAction: (rowNumber: number, action: RowResolutionAction) => void;
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({
    stats,
    visibleRows,
    previewFilter,
    onSetPreviewFilter,
    onToggleRowAction,
}) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onSetPreviewFilter("all")}
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
                    onClick={() => onSetPreviewFilter("ready")}
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
                        onClick={() => onSetPreviewFilter("duplicates")}
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
                        onClick={() => onSetPreviewFilter("conflicts")}
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
                        onClick={() => onSetPreviewFilter("errors")}
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
                                                    onToggleRowAction(
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
    );
};
