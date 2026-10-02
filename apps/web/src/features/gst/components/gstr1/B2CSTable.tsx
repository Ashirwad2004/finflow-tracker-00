import React from "react";
import { UserMinus, FileSpreadsheet } from "lucide-react";
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
import { B2CSRecord } from "./types";
import { formatINR } from "./gstr1Utils";

interface B2CSTableProps {
    records: B2CSRecord[];
    onExportCSV: () => void;
}

export const B2CSTable: React.FC<B2CSTableProps> = ({ records, onExportCSV }) => {
    return (
        <SectionCard
            title="Table 7 — B2C Small (Unregistered, ≤ ₹2.5 Lakh)"
            subtitle="Consolidated (not invoice-wise) — state-wise aggregated outward supplies to unregistered buyers"
            icon={UserMinus}
            count={records.length}
            badge="Table 7"
            color="border-l-emerald-500"
        >
            <div className="flex justify-end px-4 pb-2">
                <Button variant="outline" size="sm" onClick={onExportCSV} className="gap-2 text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export CSV
                </Button>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                            <TableHead className="font-bold text-xs">Type</TableHead>
                            <TableHead className="font-bold text-xs">Place of Supply</TableHead>
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
                                <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                                    No B2C Small supplies in this period
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((r, i) => (
                                <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <TableCell>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                            OE
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs">{r.place_of_supply}</TableCell>
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
                            <TableRow className="bg-emerald-50 dark:bg-emerald-950/20 font-bold">
                                <TableCell colSpan={3} className="text-xs font-bold">
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
