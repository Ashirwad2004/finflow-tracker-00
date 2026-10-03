import React from "react";
import { Building2, FileSpreadsheet } from "lucide-react";
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
import { B2BRecord } from "./types";
import { formatINR } from "./gstr1Utils";

interface B2BTableProps {
    records: B2BRecord[];
    onExportCSV: () => void;
}

export const B2BTable: React.FC<B2BTableProps> = ({ records, onExportCSV }) => {
    return (
        <SectionCard
            title="Table 4 — B2B Supplies (Registered Customers)"
            subtitle="Outward taxable supplies to GST-registered recipients"
            icon={Building2}
            count={records.length}
            badge="Table 4"
            color="border-l-blue-500"
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
                            <TableHead className="font-bold text-xs">GSTIN</TableHead>
                            <TableHead className="font-bold text-xs">Customer</TableHead>
                            <TableHead className="font-bold text-xs">Invoice No.</TableHead>
                            <TableHead className="font-bold text-xs">Date</TableHead>
                            <TableHead className="font-bold text-xs text-right">Invoice Value</TableHead>
                            <TableHead className="font-bold text-xs text-right">Taxable Value</TableHead>
                            <TableHead className="font-bold text-xs text-right">IGST</TableHead>
                            <TableHead className="font-bold text-xs text-right">CGST</TableHead>
                            <TableHead className="font-bold text-xs text-right">SGST</TableHead>
                            <TableHead className="font-bold text-xs">POS</TableHead>
                            <TableHead className="font-bold text-xs text-center">RC</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-8 text-slate-400 text-sm">
                                    No B2B invoices in this period
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((r, i) => (
                                <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <TableCell className="font-mono text-xs">{r.gstin}</TableCell>
                                    <TableCell className="text-sm font-medium">{r.customer_name}</TableCell>
                                    <TableCell className="text-xs font-mono">{r.invoice_number}</TableCell>
                                    <TableCell className="text-xs">{r.invoice_date}</TableCell>
                                    <TableCell className="text-right text-xs font-semibold">
                                        {formatINR(r.invoice_value)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">{formatINR(r.taxable_value)}</TableCell>
                                    <TableCell className="text-right text-xs text-purple-700">
                                        {r.igst > 0 ? formatINR(r.igst) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-indigo-700">
                                        {r.cgst > 0 ? formatINR(r.cgst) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-sky-700">
                                        {r.sgst > 0 ? formatINR(r.sgst) : "—"}
                                    </TableCell>
                                    <TableCell className="text-xs">{r.place_of_supply}</TableCell>
                                    <TableCell className="text-center">
                                        <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                r.reverse_charge
                                                    ? "bg-red-100 text-red-600"
                                                    : "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            {r.reverse_charge ? "Y" : "N"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    {records.length > 0 && (
                        <tfoot>
                            <TableRow className="bg-blue-50 dark:bg-blue-950/20 font-bold">
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
                                <TableCell colSpan={2} />
                            </TableRow>
                        </tfoot>
                    )}
                </Table>
            </div>
        </SectionCard>
    );
};
