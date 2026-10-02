import React from "react";
import { Users } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SectionCard } from "./SectionCard";
import { B2CLRecord } from "./types";
import { formatINR } from "./gstr1Utils";

interface B2CLTableProps {
    records: B2CLRecord[];
}

export const B2CLTable: React.FC<B2CLTableProps> = ({ records }) => {
    return (
        <SectionCard
            title="Table 5 — B2C Large (Unregistered, > ₹2.5 Lakh)"
            subtitle="Inter-state supplies > ₹2.5L to unregistered persons — invoice-level detail required"
            icon={Users}
            count={records.length}
            badge="Table 5"
            color="border-l-violet-500"
            defaultOpen={records.length > 0}
        >
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                            <TableHead className="font-bold text-xs">Invoice No.</TableHead>
                            <TableHead className="font-bold text-xs">Date</TableHead>
                            <TableHead className="font-bold text-xs text-right">Invoice Value</TableHead>
                            <TableHead className="font-bold text-xs">Place of Supply</TableHead>
                            <TableHead className="font-bold text-xs text-right">Taxable Value</TableHead>
                            <TableHead className="font-bold text-xs text-right">IGST</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                                    No B2C Large invoices in this period
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((r, i) => (
                                <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                                    <TableCell className="text-xs">{r.invoice_date}</TableCell>
                                    <TableCell className="text-right text-xs font-semibold">
                                        {formatINR(r.invoice_value)}
                                    </TableCell>
                                    <TableCell className="text-xs">{r.place_of_supply}</TableCell>
                                    <TableCell className="text-right text-xs">{formatINR(r.taxable_value)}</TableCell>
                                    <TableCell className="text-right text-xs text-purple-700 font-semibold">
                                        {formatINR(r.igst)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </SectionCard>
    );
};
