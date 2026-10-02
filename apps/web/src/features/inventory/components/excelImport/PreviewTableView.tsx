import React from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ParsedProduct } from "./types";

interface PreviewTableViewProps {
    parsedProducts: ParsedProduct[];
    duplicateAction: "skip" | "update";
    onDuplicateActionChange: (action: "skip" | "update") => void;
}

export const PreviewTableView: React.FC<PreviewTableViewProps> = ({
    parsedProducts,
    duplicateAction,
    onDuplicateActionChange,
}) => {
    const totalCount = parsedProducts.length;
    const errorCount = parsedProducts.filter((p) => p.status === "error").length;
    const duplicateCount = parsedProducts.filter((p) => p.status === "duplicate").length;
    const readyCount = parsedProducts.filter((p) => p.status === "ready").length;

    return (
        <div className="space-y-6">
            {/* Stats Banner */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Rows</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">{totalCount}</p>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/30 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Ready</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{readyCount}</p>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-950/10 rounded-xl p-3 border border-amber-100 dark:border-amber-900/30 text-center">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Duplicates</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{duplicateCount}</p>
                </div>
                <div className="bg-red-50/50 dark:bg-red-950/10 rounded-xl p-3 border border-red-100 dark:border-red-900/30 text-center">
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Errors</p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-400 mt-0.5">{errorCount}</p>
                </div>
            </div>

            {/* Duplicate Handling Option */}
            {duplicateCount > 0 && (
                <div className="p-4 rounded-xl border bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 space-y-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Duplicate Product Names Detected
                        </h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        {duplicateCount} products share names with items already in your inventory. Choose how you want to handle them:
                    </p>
                    <RadioGroup
                        value={duplicateAction}
                        onValueChange={(val: "skip" | "update") => onDuplicateActionChange(val)}
                        className="flex gap-6 mt-1"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="skip" id="dup_skip" />
                            <Label htmlFor="dup_skip" className="text-xs font-medium cursor-pointer">
                                Skip (Ignore and do not import duplicates)
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="update" id="dup_update" />
                            <Label htmlFor="dup_update" className="text-xs font-medium cursor-pointer">
                                Overwrite/Update (Replace existing item values with Excel data)
                            </Label>
                        </div>
                    </RadioGroup>
                </div>
            )}

            {/* Parsing Error Note */}
            {errorCount > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-xl flex gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-400">
                        <strong>Attention Required:</strong> Correct the rows flagged with red errors before starting the import. The import cannot proceed while validation errors exist.
                    </p>
                </div>
            )}

            {/* Preview Grid */}
            <div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[40%]">Product Name</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parsedProducts.map((p, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="font-semibold text-slate-800 dark:text-slate-100 max-w-[200px] truncate">
                                    {p.name || <span className="text-red-400 italic">Missing Name</span>}
                                </TableCell>
                                <TableCell>₹{p.price}</TableCell>
                                <TableCell>{p.stock_quantity}</TableCell>
                                <TableCell>{p.unit}</TableCell>
                                <TableCell className="text-right">
                                    {p.status === "ready" && (
                                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-none">
                                            Ready
                                        </Badge>
                                    )}
                                    {p.status === "duplicate" && (
                                        <Badge
                                            variant="outline"
                                            className={
                                                duplicateAction === "skip"
                                                    ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400"
                                                    : "border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400"
                                            }
                                        >
                                            {duplicateAction === "skip" ? "Will Skip" : "Will Update"}
                                        </Badge>
                                    )}
                                    {p.status === "error" && (
                                        <Badge variant="destructive" className="text-xs" title={p.errorDetails}>
                                            Error
                                        </Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
