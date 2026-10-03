import { MessageCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TableLoadingRows } from "@/components/shared/PageStates";
import { EnrichedPartyItem } from "./types";

interface PartyReportTableProps {
    salesLoading: boolean;
    purchasesLoading: boolean;
    filteredData: EnrichedPartyItem[];
    formatCurrency: (amount: number) => string;
    onSendWhatsAppReminder: (party: EnrichedPartyItem) => void;
    onSelectPartyForLedger?: (partyName: string) => void;
}

export const PartyReportTable = ({
    salesLoading,
    purchasesLoading,
    filteredData,
    formatCurrency,
    onSendWhatsAppReminder,
    onSelectPartyForLedger,
}: PartyReportTableProps) => {
    if (salesLoading || purchasesLoading) {
        return (
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Party Details</TableHead>
                        <TableHead className="text-right">Sales Volume</TableHead>
                        <TableHead className="text-right">To Receive (Dr)</TableHead>
                        <TableHead className="text-right">To Pay (Cr)</TableHead>
                        <TableHead className="text-right">Net Position</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableLoadingRows cols={6} rows={6} />
                </TableBody>
            </Table>
        );
    }

    if (filteredData.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground text-xs space-y-1">
                <p className="font-semibold text-foreground">No parties found</p>
                <p>Try adjusting your search query or filter criteria.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-muted/60 text-xs font-bold">
                    <TableRow>
                        <TableHead className="py-3">Party Name & Contact</TableHead>
                        <TableHead className="py-3 text-center">Type</TableHead>
                        <TableHead className="py-3 text-right">Turnover Volume</TableHead>
                        <TableHead className="py-3 text-right text-blue-700 dark:text-blue-400">
                            To Receive (Dr)
                        </TableHead>
                        <TableHead className="py-3 text-right text-amber-700 dark:text-amber-400">
                            To Pay (Cr)
                        </TableHead>
                        <TableHead className="py-3 text-right font-extrabold">Net Position</TableHead>
                        <TableHead className="py-3 text-center">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                    {filteredData.map((party) => {
                        const isDr = party.netBalance > 0;
                        const isSettled = party.netBalance === 0;

                        return (
                            <TableRow key={party.name} className="hover:bg-accent/40 transition-colors">
                                <TableCell className="font-medium py-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            {party.name}
                                        </span>
                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                            {party.phone && <span>📞 {party.phone}</span>}
                                            <span>•</span>
                                            <span>
                                                {party.salesCount} sale{party.salesCount !== 1 ? "s" : ""},{" "}
                                                {party.purchasesCount} purchase{party.purchasesCount !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>

                                <TableCell className="text-center py-3">
                                    <Badge variant="outline" className="text-[10px] capitalize">
                                        {party.type || "customer"}
                                    </Badge>
                                </TableCell>

                                <TableCell className="text-right py-3 font-mono">
                                    <div>{formatCurrency(party.totalSales + party.totalPurchases)}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                        S: {formatCurrency(party.totalSales)} | P: {formatCurrency(party.totalPurchases)}
                                    </div>
                                </TableCell>

                                <TableCell className="text-right py-3 font-mono font-semibold">
                                    {party.receivable > 0 ? (
                                        <div className="text-blue-700 dark:text-blue-400">
                                            <div>{formatCurrency(party.receivable)}</div>
                                            {party.overdueDaysMax > 30 && (
                                                <span className="text-[9px] px-1 py-0.2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-sans">
                                                    {party.overdueDaysMax}d overdue
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>

                                <TableCell className="text-right py-3 font-mono font-semibold">
                                    {party.payable > 0 ? (
                                        <div className="text-amber-700 dark:text-amber-400">
                                            {formatCurrency(party.payable)}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>

                                <TableCell className="text-right py-3 font-mono font-bold">
                                    {isSettled ? (
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        >
                                            Settled (Nil)
                                        </Badge>
                                    ) : isDr ? (
                                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-mono">
                                            +{formatCurrency(party.netBalance)} Dr
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-mono">
                                            -{formatCurrency(Math.abs(party.netBalance))} Cr
                                        </Badge>
                                    )}
                                </TableCell>

                                <TableCell className="text-center py-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                        {party.receivable > 0 && party.phone && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-[11px] gap-1"
                                                onClick={() => onSendWhatsAppReminder(party)}
                                                title="Send WhatsApp payment reminder"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                Remind
                                            </Button>
                                        )}
                                        {onSelectPartyForLedger && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                                                onClick={() => onSelectPartyForLedger(party.name)}
                                                title="View full ledger"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Ledger
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};
