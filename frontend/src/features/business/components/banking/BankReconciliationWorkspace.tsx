import React, { useState, useMemo } from "react";
import { 
    CheckCircle2, 
    Upload, 
    RefreshCw, 
    Plus, 
    Check, 
    AlertTriangle, 
    ArrowDownLeft, 
    ArrowUpRight, 
    Sparkles,
    FileSpreadsheet,
    ShieldCheck,
    Search,
    Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import { BankAccount, BankTransaction, BankStatementLine } from "./types";
import { computeAutoMatches, guessCategoryFromNarration } from "../../services/reconciliationEngine";

interface BankReconciliationWorkspaceProps {
    accounts: BankAccount[];
    transactions: BankTransaction[];
    statementLines: BankStatementLine[];
    selectedAccountId: string;
    onSelectAccount: (accId: string) => void;
    onOpenImportModal: () => void;
    onToggleReconciliation: (txId: string, isReconciled: boolean) => Promise<void>;
    onApplyAutoMatches: (matches: { txId: string; stmtLineId: string }[]) => Promise<void>;
    onCreateTxFromStatementLine: (line: BankStatementLine, category: string) => Promise<void>;
    onGenerateSampleFeed?: () => Promise<void>;
    onClearStatementFeeds?: () => Promise<void>;
}

export const BankReconciliationWorkspace: React.FC<BankReconciliationWorkspaceProps> = ({
    accounts,
    transactions,
    statementLines,
    selectedAccountId,
    onSelectAccount,
    onOpenImportModal,
    onToggleReconciliation,
    onApplyAutoMatches,
    onCreateTxFromStatementLine,
    onGenerateSampleFeed,
    onClearStatementFeeds
}) => {
    const [statusFilter, setStatusFilter] = useState<"all" | "unreconciled" | "reconciled">("unreconciled");
    const [searchQuery, setSearchQuery] = useState("");
    const [isMatching, setIsMatching] = useState(false);

    // Active account
    const activeAccount = accounts.find(a => a.id === selectedAccountId);

    // Filter transactions for this account
    const accountTxs = useMemo(() => {
        return transactions.filter(t => !selectedAccountId || selectedAccountId === "all" || t.accountId === selectedAccountId);
    }, [transactions, selectedAccountId]);

    // Filter statement lines for this account
    const accountLines = useMemo(() => {
        return statementLines.filter(l => !selectedAccountId || selectedAccountId === "all" || l.accountId === selectedAccountId);
    }, [statementLines, selectedAccountId]);

    // Ledger balance
    const ledgerBalance = useMemo(() => {
        let total = 0;
        if (selectedAccountId && selectedAccountId !== "all") {
            total = activeAccount ? activeAccount.initialBalance : 0;
        } else {
            total = accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
        }
        accountTxs.forEach(t => {
            if (t.type === "deposit") total += t.amount;
            else total -= t.amount;
        });
        return total;
    }, [activeAccount, accountTxs, selectedAccountId, accounts]);

    // Statement balance (latest line's balance or sum of deposits - withdrawals)
    const statementBalance = useMemo(() => {
        if (accountLines.length === 0) return ledgerBalance;
        const lastWithBalance = [...accountLines].reverse().find(l => l.balance !== undefined);
        if (lastWithBalance && lastWithBalance.balance !== undefined && selectedAccountId && selectedAccountId !== "all") {
            return lastWithBalance.balance;
        }
        let total = 0;
        if (selectedAccountId && selectedAccountId !== "all") {
            total = activeAccount ? activeAccount.initialBalance : 0;
        } else {
            total = accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
        }
        accountLines.forEach(l => {
            total += l.deposit - l.withdrawal;
        });
        return total;
    }, [accountLines, activeAccount, ledgerBalance, selectedAccountId, accounts]);

    const difference = Math.abs(ledgerBalance - statementBalance);
    const isBalanced = difference < 0.01;

    // Filtered Ledger Txs
    const filteredTxs = useMemo(() => {
        return accountTxs.filter(t => {
            if (statusFilter === "unreconciled" && t.isReconciled) return false;
            if (statusFilter === "reconciled" && !t.isReconciled) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchDesc = t.description?.toLowerCase().includes(q);
                const matchRef = t.referenceNo?.toLowerCase().includes(q);
                const matchParty = t.partyName?.toLowerCase().includes(q);
                if (!matchDesc && !matchRef && !matchParty) return false;
            }
            return true;
        });
    }, [accountTxs, statusFilter, searchQuery]);

    // Filtered Statement Lines
    const filteredLines = useMemo(() => {
        return accountLines.filter(l => {
            if (statusFilter === "unreconciled" && (l.status === "matched" || l.status === "created_in_ledger")) return false;
            if (statusFilter === "reconciled" && l.status === "unmatched") return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchNarr = l.narration?.toLowerCase().includes(q);
                const matchRef = l.referenceNo?.toLowerCase().includes(q);
                if (!matchNarr && !matchRef) return false;
            }
            return true;
        });
    }, [accountLines, statusFilter, searchQuery]);

    // Run Auto-Match Engine
    const handleRunAutoMatch = async () => {
        setIsMatching(true);
        try {
            const unreconciledTxs = accountTxs.filter(t => !t.isReconciled).map(t => ({
                id: t.id,
                accountId: t.accountId,
                date: t.date,
                type: t.type,
                amount: t.amount,
                referenceNo: t.referenceNo,
                description: t.description,
                isReconciled: t.isReconciled,
                matchedStatementLineId: t.matchedStatementLineId
            }));

            const unmatchedLines = accountLines.filter(l => l.status === "unmatched").map(l => ({
                id: l.id,
                importId: l.importId,
                accountId: l.accountId,
                date: l.date,
                narration: l.narration,
                referenceNo: l.referenceNo,
                withdrawal: l.withdrawal,
                deposit: l.deposit,
                balance: l.balance,
                status: l.status,
                matchedTxId: l.matchedTxId
            }));

            if (unmatchedLines.length === 0 && unreconciledTxs.length === 0) {
                toast.info("All transactions and statement lines are already reconciled!");
                return;
            }

            const matches = computeAutoMatches(unreconciledTxs, unmatchedLines);

            if (matches.length === 0) {
                toast.info("No matching entries found based on UTR numbers or amounts.");
                return;
            }

            await onApplyAutoMatches(matches.map(m => ({ txId: m.txId, stmtLineId: m.stmtLineId })));
            toast.success(`Auto-matched and reconciled ${matches.length} bank statement items!`);
        } catch (err: any) {
            console.error("Auto match failed:", err);
            toast.error(err.message || "Auto-match failed.");
        } finally {
            setIsMatching(false);
        }
    };

    const handleQuickAddStatementLine = async (line: BankStatementLine) => {
        const isDeposit = line.deposit > 0;
        const suggestedCategory = guessCategoryFromNarration(line.narration, isDeposit);
        try {
            await onCreateTxFromStatementLine(line, suggestedCategory);
            toast.success(`Created ${suggestedCategory} transaction in ledger and reconciled!`);
        } catch (err: any) {
            console.error("Failed to create tx from statement line:", err);
            toast.error(err.message || "Failed to record transaction.");
        }
    };

    return (
        <div className="space-y-4">
            {/* Reconciliation Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="bg-card border border-border/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Company General Ledger Balance
                    </span>
                    <span className="text-xl font-bold font-mono text-foreground mt-1">
                        ₹{ledgerBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                        Internal books balance for {activeAccount?.bankName || "All Accounts"}
                    </span>
                </div>

                <div className="bg-card border border-border/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Bank Statement Balance
                    </span>
                    <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        ₹{statementBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                        {accountLines.length > 0 ? `From ${accountLines.length} uploaded statement lines` : "No statement uploaded"}
                    </span>
                </div>

                <div className={cn(
                    "bg-card border p-4 rounded-2xl flex flex-col justify-between shadow-xs",
                    isBalanced ? "border-emerald-500/30" : "border-amber-500/30"
                )}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            Reconciliation Variance
                        </span>
                        {isBalanced ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[9px] font-bold">
                                Balanced
                            </Badge>
                        ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[9px] font-bold">
                                Delta
                            </Badge>
                        )}
                    </div>
                    <span className={cn(
                        "text-xl font-bold font-mono mt-1",
                        isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    )}>
                        ₹{difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                        {isBalanced ? "General ledger perfectly matches bank feeds!" : "Pending reconciliation entries"}
                    </span>
                </div>
            </div>

            {/* Action Bar & Controls */}
            <div className="bg-card border border-border/80 rounded-2xl p-3.5 flex flex-wrap gap-2.5 items-center justify-between shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Account Selector */}
                    <Select value={selectedAccountId} onValueChange={onSelectAccount}>
                        <SelectTrigger className="h-9 text-xs rounded-xl w-[170px]">
                            <SelectValue placeholder="Select Account" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Accounts</SelectItem>
                            {accounts.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                    {a.bankName} ({a.accountNumber.slice(-4)})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                        <SelectTrigger className="h-9 text-xs rounded-xl w-[130px]">
                            <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unreconciled">Unmatched</SelectItem>
                            <SelectItem value="reconciled">Matched</SelectItem>
                            <SelectItem value="all">All Records</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Search */}
                    <div className="relative w-48 sm:w-60">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Filter by Ref, Memo..."
                            className="h-9 pl-8 text-xs rounded-xl"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {onGenerateSampleFeed && (
                        <Button
                            onClick={onGenerateSampleFeed}
                            variant="outline"
                            className="h-9 text-xs rounded-xl font-bold gap-1.5"
                            title="Generate sample bank statement feed corresponding to your ledger"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Simulate Feed
                        </Button>
                    )}

                    <Button
                        onClick={handleRunAutoMatch}
                        disabled={isMatching || accountLines.length === 0}
                        variant="outline"
                        className="h-9 text-xs rounded-xl font-bold border-primary text-primary hover:bg-primary/5 gap-1.5"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isMatching ? "Matching..." : "Run Auto-Match"}
                    </Button>

                    <Button
                        onClick={onOpenImportModal}
                        className="h-9 text-xs rounded-xl font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Import Statement
                    </Button>

                    {accountLines.length > 0 && onClearStatementFeeds && (
                        <Button
                            onClick={onClearStatementFeeds}
                            variant="ghost"
                            className="h-9 text-xs rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2.5"
                            title="Clear all statement lines"
                        >
                            Clear Feeds
                        </Button>
                    )}
                </div>
            </div>

            {/* Side-by-side Workstation Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Left Side: General Ledger Postings */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-2.5">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                Internal General Ledger ({filteredTxs.length})
                            </h3>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                            {accountTxs.filter(t => !t.isReconciled).length} Pending Match
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
                                    filteredTxs.map(t => {
                                        const acc = accounts.find(a => a.id === t.accountId);
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
                                                        {t.type === "deposit" ? "+" : "-"}₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

                {/* Right Side: Uploaded Bank Statement Lines */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-2.5">
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                Uploaded Bank Feeds ({filteredLines.length})
                            </h3>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                            {accountLines.filter(l => l.status === "unmatched").length} Unmatched
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
                                    filteredLines.map(l => {
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
                                                    <span className="text-[10px] font-medium text-foreground block truncate max-w-[160px]" title={l.narration}>
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
                                                        {isDeposit ? "+" : "-"}₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                                            onClick={() => handleQuickAddStatementLine(l)}
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

            </div>
        </div>
    );
};
