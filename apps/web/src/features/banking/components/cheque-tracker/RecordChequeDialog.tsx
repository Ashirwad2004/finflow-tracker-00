import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { BankAccount } from "../types";

interface RecordChequeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  accounts: BankAccount[];
  chequeType: "received" | "issued";
  onChequeTypeChange: (val: "received" | "issued") => void;
  accountId: string;
  onAccountIdChange: (val: string) => void;
  chequeNumber: string;
  onChequeNumberChange: (val: string) => void;
  amount: string;
  onAmountChange: (val: string) => void;
  partyName: string;
  onPartyNameChange: (val: string) => void;
  bankName: string;
  onBankNameChange: (val: string) => void;
  issueDate: string;
  onIssueDateChange: (val: string) => void;
  dueDate: string;
  onDueDateChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
}

export const RecordChequeDialog: React.FC<RecordChequeDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting,
  accounts,
  chequeType,
  onChequeTypeChange,
  accountId,
  onAccountIdChange,
  chequeNumber,
  onChequeNumberChange,
  amount,
  onAmountChange,
  partyName,
  onPartyNameChange,
  bankName,
  onBankNameChange,
  issueDate,
  onIssueDateChange,
  dueDate,
  onDueDateChange,
  notes,
  onNotesChange,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Record Cheque / PDC
          </DialogTitle>
          <DialogDescription className="text-xs">
            Track post-dated cheques (PDCs) and bank clearings. Clearing a cheque automatically posts to the bank ledger.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                Cheque Type
              </label>
              <Select
                value={chequeType}
                onValueChange={(v) => onChequeTypeChange(v as "received" | "issued")}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Cheque Received (From Customer)</SelectItem>
                  <SelectItem value="issued">Cheque Issued (To Vendor)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                Bank Book
              </label>
              <Select value={accountId} onValueChange={onAccountIdChange}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.bankName} ({a.accountNumber.slice(-4)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                Cheque Number (6 Digits)
              </label>
              <Input
                value={chequeNumber}
                onChange={(e) => onChequeNumberChange(e.target.value)}
                placeholder="e.g. 004812"
                maxLength={6}
                className="h-9 text-xs font-mono font-bold rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                Amount (₹)
              </label>
              <Input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="e.g. 50000"
                className="h-9 text-xs font-mono font-bold rounded-xl"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                Party / Drawer Name
              </label>
              <Input
                value={partyName}
                onChange={(e) => onPartyNameChange(e.target.value)}
                placeholder="Customer or Supplier name"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                Drawer's Bank Name
              </label>
              <Input
                value={bankName}
                onChange={(e) => onBankNameChange(e.target.value)}
                placeholder="e.g. HDFC Bank"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                Issue Date
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => onIssueDateChange(e.target.value)}
                className="h-9 text-xs rounded-xl font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                Due Date (PDC Maturity)
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => onDueDateChange(e.target.value)}
                className="h-9 text-xs rounded-xl font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
              Remarks / Notes
            </label>
            <Input
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Invoice or bill reference..."
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : (
                "Save Cheque"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
