import React from "react";
import { ListChecks } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SectionCard } from "./SectionCard";

interface DocumentSummaryTableProps {
    docSummary: {
        total: number;
        from: string;
        to: string;
        cancelled: number;
    };
}

export const DocumentSummaryTable: React.FC<DocumentSummaryTableProps> = ({ docSummary }) => {
    return (
        <SectionCard
            title="Table 13 — Document Summary"
            subtitle="Summary of invoices issued during the return period"
            icon={ListChecks}
            count={1}
            badge="Table 13"
            color="border-l-slate-400"
            defaultOpen={true}
        >
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                            <TableHead className="font-bold text-xs">Document Type</TableHead>
                            <TableHead className="font-bold text-xs">Sr. From</TableHead>
                            <TableHead className="font-bold text-xs">Sr. To</TableHead>
                            <TableHead className="font-bold text-xs text-right">Total Issued</TableHead>
                            <TableHead className="font-bold text-xs text-right">Cancelled</TableHead>
                            <TableHead className="font-bold text-xs text-right">Net Issued</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell className="font-semibold text-sm">
                                Invoices for Outward Supply
                            </TableCell>
                            <TableCell className="font-mono text-xs">{docSummary.from}</TableCell>
                            <TableCell className="font-mono text-xs">{docSummary.to}</TableCell>
                            <TableCell className="text-right text-sm font-bold">
                                {docSummary.total + docSummary.cancelled}
                            </TableCell>
                            <TableCell className="text-right text-sm text-rose-600 font-semibold">
                                {docSummary.cancelled}
                            </TableCell>
                            <TableCell className="text-right text-sm font-bold text-emerald-700">
                                {docSummary.total}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </SectionCard>
    );
};
