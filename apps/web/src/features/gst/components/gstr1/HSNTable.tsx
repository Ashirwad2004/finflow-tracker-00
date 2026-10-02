import React from "react";
import { Tag, FileSpreadsheet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SectionCard } from "./SectionCard";
import { HSNRecord } from "./types";
import { formatINR } from "./gstr1Utils";

interface HSNTableProps {
    records: HSNRecord[];
    onExportCSV: () => void;
}

export const HSNTable: React.FC<HSNTableProps> = ({ records, onExportCSV }) => {
    return (
        <SectionCard
            title="Table 12 — HSN-Wise Summary of Outward Supplies"
            subtitle="Item-level HSN/SAC code breakdown (mandatory if turnover > ₹1.5 Cr)"
            icon={Tag}
            count={records.length}
            badge="Table 12"
            color="border-l-amber-500"
        >
            <div className="flex items-center justify-between px-4 pb-2">
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Add HSN codes to items in inventory for accurate reporting. Currently showing item descriptions as HSN fallback.
                </div>
                <Button variant="outline" size="sm" onClick={onExportCSV} className="gap-2 text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export CSV
                </Button>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                            <TableHead className="font-bold text-xs">HSN/SAC</TableHead>
                            <TableHead className="font-bold text-xs">Description</TableHead>
                            <TableHead className="font-bold text-xs text-right">UQC</TableHead>
                            <TableHead className="font-bold text-xs text-right">Qty</TableHead>
                            <TableHead className="font-bold text-xs text-right">Tax Rate</TableHead>
                            <TableHead className="font-bold text-xs text-right">Taxable Value</TableHead>
                            <TableHead className="font-bold text-xs text-right">IGST</TableHead>
                            <TableHead className="font-bold text-xs text-right">CGST</TableHead>
                            <TableHead className="font-bold text-xs text-right">SGST</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-slate-400 text-sm">
                                    No items found
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((r, i) => (
                                <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <TableCell className="font-mono text-xs font-bold text-amber-800 dark:text-amber-400">
                                        {r.hsn_code}
                                    </TableCell>
                                    <TableCell className="text-xs max-w-[180px] truncate">{r.description}</TableCell>
                                    <TableCell className="text-right text-xs">{r.uqc}</TableCell>
                                    <TableCell className="text-right text-xs font-semibold">{r.quantity}</TableCell>
                                    <TableCell className="text-right text-xs font-bold">{r.tax_rate}%</TableCell>
                                    <TableCell className="text-right text-xs font-semibold">
                                        {formatINR(r.taxable_value)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-purple-700">
                                        {r.igst > 0 ? formatINR(r.igst) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-indigo-700">
                                        {r.cgst > 0 ? formatINR(r.cgst) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-sky-700">
                                        {r.sgst > 0 ? formatINR(r.sgst) : "—"}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    {records.length > 0 && (
                        <tfoot>
                            <TableRow className="bg-amber-50 dark:bg-amber-950/20 font-bold">
                                <TableCell colSpan={5} className="text-xs font-bold">
                                    Total
                                </TableCell>
                                <TableCell className="text-right text-xs font-bold">
                                    {formatINR(records.reduce((s, r) => s + r.taxable_value, 0))}
                                </TableCell>
                                <TableCell className="text-right text-xs font-bold text-purple-700">
                                    {formatINR(records.reduce((s, r) => s + r.igst, 0))}
                                </TableCell>
                                <TableCell className="text-right text-xs font-bold text-indigo-700">
                                    {formatINR(records.reduce((s, r) => s + r.cgst, 0))}
                                </TableCell>
                                <TableCell className="text-right text-xs font-bold text-sky-700">
                                    {formatINR(records.reduce((s, r) => s + r.sgst, 0))}
                                </TableCell>
                            </TableRow>
                        </tfoot>
                    )}
                </Table>
            </div>
        </SectionCard>
    );
};
