import React from "react";
import { FileSpreadsheet, Upload, Check, Plus } from "lucide-react";
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
import { BankStatementLine } from "../types";

interface BankFeedsPaneProps {
  filteredLines: BankStatementLine[];
  unmatchedCount: number;
  onOpenImportModal: () => void;
  onQuickAddStatementLine: (line: BankStatementLine) => Promise<void>;
}

export const BankFeedsPane: React.FC<BankFeedsPaneProps> = ({
  filteredLines,
  unmatchedCount,
  onOpenImportModal,
  onQuickAddStatementLine,
}) => {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between border-b pb-2.5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Uploaded Bank Feeds ({filteredLines.length})
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          {unmatchedCount} Unmatched
        </span>
      </div>

      <div className="border border-border/60 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-[10px] font-bold py-2">Date / Info</TableHead>
              <TableHead className="text-[10px] font-bold py-2">Narration / Ref</TableHead>
              <TableHead className="text-[10px] font-bold py-2 text-right">Amount (₹)</TableHead>
              <TableHead className="w-[100px] text-center text-[10px] font-bold py-2">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground space-y-2">
                  <p>No statement lines available.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenImportModal}
                    className="h-7 text-[10px] rounded-lg gap-1"
                  >
                    <Upload className="w-3 h-3" /> Upload Statement
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map((l) => {
                const isDeposit = l.deposit > 0;
                const amount = isDeposit ? l.deposit : l.withdrawal;
                const isMatched = l.status === "matched" || l.status === "created_in_ledger";

                return (
                  <TableRow key={l.id} className="hover:bg-muted/20 text-xs">
                    <TableCell className="py-2.5">
                      <span className="font-mono text-[10px] font-semibold block">{l.date}</span>
                      <span className="text-[9px] font-mono text-muted-foreground block truncate max-w-[100px]">
                        {l.referenceNo || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span
                        className="text-[10px] font-medium text-foreground block truncate max-w-[160px]"
                        title={l.narration}
                      >
                        {l.narration}
                      </span>
                      {l.balance !== undefined && (
                        <span className="text-[8px] font-mono text-muted-foreground block">
                          Bal: ₹{l.balance.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono font-bold">
                      <span className={isDeposit ? "text-emerald-600" : "text-rose-600"}>
                        {isDeposit ? "+" : "-"}₹
                        {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      {isMatched ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[9px] px-2 py-0.5 rounded-md font-bold">
                          <Check className="w-3 h-3 mr-0.5" /> Reconciled
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onQuickAddStatementLine(l)}
                          className="h-6 text-[9px] px-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-0 rounded-md font-bold gap-1"
                          title="Add to ledger & reconcile"
                        >
                          <Plus className="w-3 h-3" /> Post & Match
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
