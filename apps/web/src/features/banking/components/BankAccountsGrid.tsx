import React, { useState } from "react";
import { 
    Building2, 
    Copy, 
    Check, 
    CheckCircle2, 
    Edit2, 
    Trash2, 
    Plus, 
    Eye, 
    EyeOff, 
    AlertTriangle,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import { BankAccount, getBankTheme } from "./types";

interface BankAccountsGridProps {
    accounts: BankAccount[];
    balances: Record<string, number>;
    onAddAccount: () => void;
    onEditAccount: (account: BankAccount) => void;
    onDeleteAccount: (accountId: string) => void;
    onSetDefault: (accountId: string) => void;
    onDeposit: (accountId: string) => void;
    onWithdraw: (accountId: string) => void;
}

export const BankAccountsGrid: React.FC<BankAccountsGridProps> = ({
    accounts,
    balances,
    onAddAccount,
    onEditAccount,
    onDeleteAccount,
    onSetDefault,
    onDeposit,
    onWithdraw
}) => {
    const [revealedAccounts, setRevealedAccounts] = useState<Record<string, boolean>>({});
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const toggleReveal = (id: string) => {
        setRevealedAccounts(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string, label: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        toast.success(`${label} copied to clipboard!`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const maskAccountNumber = (accNo: string) => {
        if (!accNo) return "••••";
        if (accNo.length <= 4) return accNo;
        return "•••• •••• " + accNo.slice(-4);
    };

    if (accounts.length === 0) {
        return (
            <div className="border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-3 bg-card/50">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base text-foreground">No Bank Accounts Configured</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                    Connect your business bank accounts or cash-in-hand register to track passbook entries, auto-reconcile statements, and print details on invoices.
                </p>
                <Button onClick={onAddAccount} className="rounded-xl text-xs gap-1.5 font-bold mt-2">
                    <Plus className="w-4 h-4" /> Add First Bank Account
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((acc) => {
                const bal = balances[acc.id] ?? acc.initialBalance ?? 0;
                const isOD = acc.accountType === "overdraft";
                const odLimit = acc.odLimit || 0;
                const availableOD = isOD ? Math.max(0, odLimit + bal) : bal;
                const isRevealed = revealedAccounts[acc.id];
                const theme = getBankTheme(acc.bankName, acc.colorTheme);

                return (
                    <div 
                        key={acc.id}
                        className={cn(
                            "relative rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all",
                            acc.isDefault ? "ring-2 ring-primary/20 border-primary shadow-md" : "border-border/80 bg-card"
                        )}
                    >
                        {/* Top Bank Header with Branding Banner */}
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold shadow-xs">
                                        <Building2 className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-foreground capitalize tracking-tight">
                                            {acc.bankName}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize font-medium">
                                                {acc.accountType}
                                            </Badge>
                                            {acc.branchName && (
                                                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                                    {acc.branchName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {acc.isDefault ? (
                                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Default (Invoices)
                                    </Badge>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onSetDefault(acc.id)}
                                        className="h-6 text-[10px] font-semibold text-muted-foreground hover:text-primary px-2"
                                    >
                                        Set Default
                                    </Button>
                                )}
                            </div>

                            {/* Ledger Balance Card */}
                            <div className="bg-muted/40 border border-border/50 p-3.5 rounded-xl flex items-center justify-between">
                                <div>
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                                        Book Ledger Balance
                                    </span>
                                    <span className={cn(
                                        "text-lg font-bold font-mono tracking-tight",
                                        bal < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                                    )}>
                                        ₹{bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => onDeposit(acc.id)}
                                        className="w-7 h-7 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                        title="Inward Credit (+)"
                                    >
                                        <ArrowDownLeft className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => onWithdraw(acc.id)}
                                        className="w-7 h-7 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                        title="Outward Debit (-)"
                                    >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Overdraft Progress Bar if applicable */}
                            {isOD && odLimit > 0 && (
                                <div className="space-y-1 pt-0.5">
                                    <div className="flex items-center justify-between text-[9px] font-bold">
                                        <span className="text-muted-foreground">OD Limit Available:</span>
                                        <span className={availableOD < (odLimit * 0.15) ? "text-rose-600" : "text-emerald-600"}>
                                            ₹{availableOD.toLocaleString()} / ₹{odLimit.toLocaleString()}
                                        </span>
                                    </div>
                                    <Progress 
                                        value={Math.min(100, Math.max(0, (availableOD / odLimit) * 100))} 
                                        className="h-1.5"
                                    />
                                </div>
                            )}

                            {/* Account Details Box */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/70 text-[11px]">
                                <div className="space-y-0.5">
                                    <span className="text-[8px] uppercase font-bold text-muted-foreground block">
                                        Account Number
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-foreground">
                                            {isRevealed ? acc.accountNumber : maskAccountNumber(acc.accountNumber)}
                                        </span>
                                        <button 
                                            onClick={() => toggleReveal(acc.id)} 
                                            className="text-muted-foreground hover:text-foreground"
                                            title={isRevealed ? "Mask" : "Reveal"}
                                        >
                                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(acc.accountNumber, "Account Number", `${acc.id}-acc`)}
                                            className="text-muted-foreground hover:text-foreground"
                                            title="Copy Account Number"
                                        >
                                            {copiedKey === `${acc.id}-acc` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <span className="text-[8px] uppercase font-bold text-muted-foreground block">
                                        IFSC Code
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-foreground uppercase">
                                            {acc.ifscCode}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(acc.ifscCode, "IFSC Code", `${acc.id}-ifsc`)}
                                            className="text-muted-foreground hover:text-foreground"
                                            title="Copy IFSC Code"
                                        >
                                            {copiedKey === `${acc.id}-ifsc` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs">
                            <span className="text-[10px] text-muted-foreground font-medium">
                                {acc.accountType === "cash" ? "Cash Register" : "CTS-2010 Enabled"}
                            </span>

                            <div className="flex items-center gap-1">
                                <Button
                                    onClick={() => onEditAccount(acc)}
                                    variant="ghost"
                                    size="icon"
                                    className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
                                    title="Edit Account"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    onClick={() => onDeleteAccount(acc.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                    title="Delete Account"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
