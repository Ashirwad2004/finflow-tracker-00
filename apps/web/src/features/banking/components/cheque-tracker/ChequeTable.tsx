import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BankAccount, ChequeRecord } from "../types";

interface ChequeTableProps {
  cheques: ChequeRecord[];
  accounts: BankAccount[];
  onClearCheque: (cheque: ChequeRecord) => void;
  onUpdateStatus: (chequeId: string, status: ChequeRecord["status"]) => void;
  onOpenBounceModal: (cheque: ChequeRecord) => void;
}

export const ChequeTable: React.FC<ChequeTableProps> = ({
  cheques,
  accounts,
  onClearCheque,
  onUpdateStatus,
  onOpenBounceModal,
}) => {
  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[100px] text-xs font-bold">Cheque #</TableHead>
            <TableHead className="text-xs font-bold">Type</TableHead>
            <TableHead className="text-xs font-bold">Party / Drawer</TableHead>
            <TableHead className="text-xs font-bold">Bank Account</TableHead>
            <TableHead className="text-xs font-bold">Due Date (PDC)</TableHead>
            <TableHead className="text-xs font-bold text-right">Amount (₹)</TableHead>
            <TableHead className="text-xs font-bold text-center w-[100px]">Status</TableHead>
            <TableHead className="w-[150px] text-center text-xs font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cheques.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-36 text-center text-xs text-muted-foreground">
                No cheques found matching filters.
              </TableCell>
            </TableRow>
          ) : (
            cheques.map((c) => {
              const acc = accounts.find((a) => a.id === c.accountId);

              return (
                <TableRow key={c.id} className="hover:bg-muted/30 text-xs">
                  <TableCell className="font-mono font-bold text-xs py-2.5">
                    #{c.chequeNumber}
                  </TableCell>

                  <TableCell className="py-2.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 font-bold ${
                        c.chequeType === "received"
                          ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/5"
                          : "text-rose-600 border-rose-500/20 bg-rose-500/5"
                      }`}
                    >
                      {c.chequeType === "received" ? "Received (CR)" : "Issued (DR)"}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-2.5">
                    <span className="font-semibold text-foreground block truncate max-w-[140px]">
                      {c.partyName}
                    </span>
                    {c.bankName && (
                      <span className="text-[9px] text-muted-foreground block truncate max-w-[140px]">
                        {c.bankName}
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="py-2.5">
                    <span className="font-medium text-foreground block">
                      {acc?.bankName || "Unknown"}
                    </span>
                  </TableCell>

                  <TableCell className="font-mono text-[11px] py-2.5">
                    {c.dueDate}
                  </TableCell>

                  <TableCell
                    className={`text-right font-mono font-bold py-2.5 ${
                      c.chequeType === "received" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    ₹{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>

                  <TableCell className="text-center py-2.5">
                    {c.status === "cleared" && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[9px] px-1.5 py-0.5">
                        Cleared
                      </Badge>
                    )}
                    {c.status === "pending" && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[9px] px-1.5 py-0.5">
                        Pending
                      </Badge>
                    )}
                    {c.status === "deposited" && (
                      <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[9px] px-1.5 py-0.5">
                        Deposited
                      </Badge>
                    )}
                    {c.status === "bounced" && (
                      <Badge
                        className="bg-rose-500/10 text-rose-600 border-0 text-[9px] px-1.5 py-0.5"
                        title={c.bounceReason}
                      >
                        Bounced
                      </Badge>
                    )}
                    {c.status === "cancelled" && (
                      <Badge className="bg-muted text-muted-foreground border-0 text-[9px] px-1.5 py-0.5">
                        Cancelled
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-center py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {c.status !== "cleared" && c.status !== "cancelled" && (
                        <Button
                          size="sm"
                          onClick={() => onClearCheque(c)}
                          className="h-6 text-[9px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold"
                          title="Mark cleared & record in bank ledger"
                        >
                          Clear
                        </Button>
                      )}
                      {c.status === "pending" && c.chequeType === "received" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdateStatus(c.id, "deposited")}
                          className="h-6 text-[9px] px-1.5 rounded-md"
                        >
                          Deposit
                        </Button>
                      )}
                      {c.status !== "cleared" && c.status !== "bounced" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenBounceModal(c)}
                          className="h-6 text-[9px] px-1 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          Bounce
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
