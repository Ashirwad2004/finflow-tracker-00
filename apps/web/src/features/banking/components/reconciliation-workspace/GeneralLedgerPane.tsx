import React from "react";
import { ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BankAccount, BankTransaction } from "../types";

interface GeneralLedgerPaneProps {
  filteredTxs: BankTransaction[];
  accounts: BankAccount[];
  pendingCount: number;
  onToggleReconciliation: (txId: string, isReconciled: boolean) => Promise<void>;
}

export const GeneralLedgerPane: React.FC<GeneralLedgerPaneProps> = ({
  filteredTxs,
  accounts,
  pendingCount,
  onToggleReconciliation,
}) => {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between border-b pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Internal General Ledger ({filteredTxs.length})
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          {pendingCount} Pending Match
        </span>
      </div>

      <div className="border border-border/60 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-[10px] font-bold py-2">Date / Bank</TableHead>
              <TableHead className="text-[10px] font-bold py-2">Ref / UTR</TableHead>
              <TableHead className="text-[10px] font-bold py-2 text-right">Amount (₹)</TableHead>
              <TableHead className="w-[85px] text-center text-[10px] font-bold py-2">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTxs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground">
                  No ledger postings match criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredTxs.map((t) => {
                const acc = accounts.find((a) => a.id === t.accountId);
                return (
                  <TableRow key={t.id} className="hover:bg-muted/20 text-xs">
                    <TableCell className="py-2.5">
                      <span className="font-mono text-[10px] font-semibold block">{t.date}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px] block">
                        {acc?.bankName || "Bank"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="font-mono text-[10px] font-bold text-foreground block truncate max-w-[130px]">
                        {t.referenceNo}
                      </span>
                      <span className="text-[9px] text-muted-foreground truncate max-w-[130px] block">
                        {t.description}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono font-bold">
                      <span className={t.type === "deposit" ? "text-emerald-600" : "text-rose-600"}>
                        {t.type === "deposit" ? "+" : "-"}₹
                        {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      {t.isReconciled ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onToggleReconciliation(t.id, false)}
                          className="h-6 text-[9px] px-2 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md font-bold"
                          title="Click to un-reconcile"
                        >
                          <Check className="w-3 h-3 mr-0.5" /> Matched
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onToggleReconciliation(t.id, true)}
                          className="h-6 text-[9px] px-2 rounded-md font-bold hover:bg-primary/5"
                        >
                          Reconcile
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
