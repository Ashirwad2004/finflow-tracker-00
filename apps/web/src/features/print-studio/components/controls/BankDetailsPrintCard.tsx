import { Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BankDetailsInfo } from "@/utils/generateInvoicePDF";

interface BankDetailsPrintCardProps {
  printBankDetails: boolean;
  onTogglePrintBank: (checked: boolean) => void;
  bankAccounts: any[];
  selectedBankId: string;
  onBankSelect: (id: string) => void;
  activeBankAccount: BankDetailsInfo | null;
}

export function BankDetailsPrintCard({
  printBankDetails,
  onTogglePrintBank,
  bankAccounts,
  selectedBankId,
  onBankSelect,
  activeBankAccount,
}: BankDetailsPrintCardProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Landmark className="w-3.5 h-3.5 text-primary" />
          4. Bank Details on Invoice
        </h2>
        <Switch checked={printBankDetails} onCheckedChange={onTogglePrintBank} />
      </div>

      {printBankDetails ? (
        <div className="space-y-2.5 animate-fade-in">
          {bankAccounts.length > 0 ? (
            <>
              {bankAccounts.length > 1 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground block">
                    Select Account to Print
                  </label>
                  <Select
                    value={
                      selectedBankId ||
                      (bankAccounts.find((a: any) => a.isDefault)?.id || bankAccounts[0]?.id)
                    }
                    onValueChange={onBankSelect}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Choose bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((acc: any) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">
                          {acc.bankName} (
                          {acc.accountNumber.slice(-4) ? `...${acc.accountNumber.slice(-4)}` : acc.accountNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeBankAccount && (
                <div className="p-2.5 rounded-lg border bg-muted/40 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100">
                      {activeBankAccount.bankName}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                    >
                      Active
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    A/c: {activeBankAccount.accountNumber}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    IFSC: {activeBankAccount.ifscCode || "N/A"}{" "}
                    {activeBankAccount.branchName ? `• ${activeBankAccount.branchName}` : ""}
                  </div>
                </div>
              )}

              <div className="pt-0.5">
                <Link
                  to="/bank-details"
                  className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  Manage Bank Accounts & Books &rarr;
                </Link>
              </div>
            </>
          ) : (
            <div className="p-3 border border-dashed border-amber-300 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
              <p className="text-[10px] text-amber-800 dark:text-amber-200 leading-snug">
                No bank account saved yet. Add your bank details to display on customer invoices.
              </p>
              <Link to="/bank-details">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-400 text-amber-900 dark:text-amber-100"
                >
                  <Landmark className="w-3 h-3 mr-1" />
                  + Add Bank Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">
          Bank details will not be printed on downloaded or printed invoices.
        </p>
      )}
    </div>
  );
}
