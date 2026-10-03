import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { POSPaymentMethodType } from "../../types";

interface POSOtherMethodsViewProps {
  selectedMethod: POSPaymentMethodType;
  cardReference: string;
  onCardReferenceChange: (val: string) => void;
  bankReference: string;
  onBankReferenceChange: (val: string) => void;
  creditAmountPaid: number;
  onCreditAmountPaidChange: (val: number) => void;
  totalAmount: number;
  customerName: string;
  splitCash: number;
  onSplitCashChange: (val: number) => void;
  splitUpi: number;
  onSplitUpiChange: (val: number) => void;
  splitCard: number;
  onSplitCardChange: (val: number) => void;
  splitCredit: number;
  onSplitCreditChange: (val: number) => void;
  splitRemaining: number;
  formatCurrency: (amount: number) => string;
}

export const POSOtherMethodsView: React.FC<POSOtherMethodsViewProps> = ({
  selectedMethod,
  cardReference,
  onCardReferenceChange,
  bankReference,
  onBankReferenceChange,
  creditAmountPaid,
  onCreditAmountPaidChange,
  totalAmount,
  customerName,
  splitCash,
  onSplitCashChange,
  splitUpi,
  onSplitUpiChange,
  splitCard,
  onSplitCardChange,
  splitCredit,
  onSplitCreditChange,
  splitRemaining,
  formatCurrency,
}) => {
  return (
    <>
      {/* CARD VIEW */}
      {selectedMethod === "card" && (
        <div className="space-y-3">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Card Transaction Reference / Approval Code
          </Label>
          <Input
            type="text"
            placeholder="e.g. Card slip approval code / RRN"
            value={cardReference}
            onChange={(e) => onCardReferenceChange(e.target.value)}
            className="h-9.5 text-xs bg-background border-border rounded-xl font-mono"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Swipe or tap card on POS terminal machine. Record the approval code for accounting reconciliation.
          </p>
        </div>
      )}

      {/* BANK TRANSFER VIEW */}
      {selectedMethod === "bank_transfer" && (
        <div className="space-y-3">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            NEFT / RTGS / IMPS Reference Number
          </Label>
          <Input
            type="text"
            placeholder="e.g. Bank UTR / Transaction ID"
            value={bankReference}
            onChange={(e) => onBankReferenceChange(e.target.value)}
            className="h-9.5 text-xs bg-background border-border rounded-xl font-mono"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Direct wire transfer to store bank account.
          </p>
        </div>
      )}

      {/* CREDIT VIEW */}
      {selectedMethod === "credit" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Initial Payment Received (₹)
            </Label>
            <Input
              type="number"
              min="0"
              max={totalAmount}
              value={creditAmountPaid || ""}
              placeholder="0"
              onChange={(e) => onCreditAmountPaidChange(parseFloat(e.target.value) || 0)}
              className="h-9.5 text-xs mt-1 bg-background border-border rounded-xl font-mono font-bold"
            />
          </div>

          <div className="p-3.5 rounded-2xl border bg-amber-500/10 border-amber-500/20 flex items-center justify-between shadow-2xs">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Remaining Balance Due
            </span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
              {formatCurrency(Math.max(0, totalAmount - creditAmountPaid))}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Added to debtor balance ledger for <strong>{customerName}</strong>.
          </p>
        </div>
      )}

      {/* SPLIT VIEW */}
      {selectedMethod === "split" && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                Cash Amount
              </Label>
              <Input
                type="number"
                value={splitCash || ""}
                onChange={(e) => onSplitCashChange(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono font-bold bg-background border-border rounded-lg"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                UPI Amount
              </Label>
              <Input
                type="number"
                value={splitUpi || ""}
                onChange={(e) => onSplitUpiChange(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono font-bold bg-background border-border rounded-lg"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                Card Amount
              </Label>
              <Input
                type="number"
                value={splitCard || ""}
                onChange={(e) => onSplitCardChange(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono font-bold bg-background border-border rounded-lg"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                Credit / Udhaar
              </Label>
              <Input
                type="number"
                value={splitCredit || ""}
                onChange={(e) => onSplitCreditChange(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono font-bold bg-background border-border rounded-lg"
              />
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border text-xs flex justify-between font-bold ${
              splitRemaining === 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            <span>Unallocated Balance</span>
            <span className="font-mono">{formatCurrency(splitRemaining)}</span>
          </div>
        </div>
      )}
    </>
  );
};
