import React, { useState, useMemo } from "react";
import { 
    Search, 
    Download, 
    Printer, 
    Trash2, 
    CheckCircle2, 
    Clock, 
    ArrowDownLeft, 
    ArrowUpRight,
    FileSpreadsheet,
    Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { format, subDays, startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import { BankAccount, BankTransaction } from "./types";

interface BankLedgerPassbookProps {
    accounts: BankAccount[];
    transactions: BankTransaction[];
    onDeleteTransaction: (txId: string) => Promise<void>;
    onToggleReconciliation: (txId: string, isReconciled: boolean) => Promise<void>;
}

export const BankLedgerPassbook: React.FC<BankLedgerPassbookProps> = ({
    accounts,
    transactions,
    onDeleteTransaction,
    onToggleReconciliation
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [accountFilter, setAccountFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "this_month" | "last_month">("all");

    // Chronologically sorted transactions for correct running balance calculation
    const sortedChronological = useMemo(() => {
        return [...transactions].sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            return (a.createdAt || "").localeCompare(b.createdAt || "");
        });
    }, [transactions]);

    // Compute running balance map: txId -> balance
    const runningBalances = useMemo(() => {
        const balancesByAccount: Record<string, number> = {};
        const map: Record<string, number> = {};

        // Initialize with initial balances
        accounts.forEach(a => {
            balancesByAccount[a.id] = a.initialBalance || 0;
        });

        sortedChronological.forEach(tx => {
            if (balancesByAccount[tx.accountId] === undefined) {
                const acc = accounts.find(a => a.id === tx.accountId);
                balancesByAccount[tx.accountId] = acc?.initialBalance || 0;
            }

            if (tx.type === "deposit") {
                balancesByAccount[tx.accountId] += tx.amount;
            } else {
                balancesByAccount[tx.accountId] -= tx.amount;
            }

            map[tx.id] = balancesByAccount[tx.accountId];
        });

        return map;
    }, [sortedChronological, accounts]);

    // Apply filters
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const todayStr = format(now, "yyyy-MM-dd");

        return transactions.filter(tx => {
            // Account filter
            if (accountFilter !== "all" && tx.accountId !== accountFilter) {
                return false;
            }

            // Type filter
            if (typeFilter !== "all" && tx.type !== typeFilter) {
                return false;
            }

            // Date preset filter
            if (datePreset === "today") {
                if (tx.date !== todayStr) return false;
            } else if (datePreset === "7d") {
                const sevenDaysAgo = subDays(now, 7);
                if (isBefore(parseISO(tx.date), sevenDaysAgo)) return false;
            } else if (datePreset === "this_month") {
                const monthStart = startOfMonth(now);
                if (isBefore(parseISO(tx.date), monthStart)) return false;
            } else if (datePreset === "last_month") {
                const lastMonthDate = subDays(startOfMonth(now), 1);
                const lastMonthStart = startOfMonth(lastMonthDate);
                const lastMonthEnd = endOfMonth(lastMonthDate);
                const txDate = parseISO(tx.date);
                if (isBefore(txDate, lastMonthStart) || isAfter(txDate, lastMonthEnd)) return false;
            }

            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchDesc = tx.description?.toLowerCase().includes(q);
                const matchRef = tx.referenceNo?.toLowerCase().includes(q);
                const matchCat = tx.category?.toLowerCase().includes(q);
                const matchParty = tx.partyName?.toLowerCase().includes(q);
                if (!matchDesc && !matchRef && !matchCat && !matchParty) return false;
            }

            return true;
        });
    }, [transactions, accountFilter, typeFilter, datePreset, searchQuery]);

    // Export to Excel (.xlsx)
    const handleExportExcel = () => {
        if (filteredTransactions.length === 0) {
            toast.error("No transactions to export.");
            return;
        }

        const dataRows = filteredTransactions.map(tx => {
            const acc = accounts.find(a => a.id === tx.accountId);
            return {
                "Date": tx.date,
                "Bank Account": acc ? `${acc.bankName} (${acc.accountNumber.slice(-4)})` : "Unknown",
                "Mode": tx.paymentMode || "NEFT",
                "Reference / UTR": tx.referenceNo,
                "Party": tx.partyName || "-",
                "Category": tx.category,
                "Narration": tx.description,
                "Debit (₹)": tx.type === "withdrawal" ? tx.amount : "",
                "Credit (₹)": tx.type === "deposit" ? tx.amount : "",
                "Running Balance (₹)": runningBalances[tx.id] ?? "",
                "Reconciled": tx.isReconciled ? "YES" : "NO"
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Passbook");
        XLSX.writeFile(workbook, `FinFlow_Bank_Passbook_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
        toast.success("Passbook exported to Excel successfully!");
    };

    // Export to CSV
    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) {
            toast.error("No transactions to export.");
            return;
        }

        const headers = ["Date", "Bank Account", "Mode", "Reference/UTR", "Party", "Category", "Narration", "Debit (INR)", "Credit (INR)", "Running Balance (INR)", "Reconciled"];
        const rows = filteredTransactions.map(tx => {
            const acc = accounts.find(a => a.id === tx.accountId);
            return [
                tx.date,
                acc ? `${acc.bankName} (${acc.accountNumber.slice(-4)})` : "Unknown",
                tx.paymentMode || "NEFT",
                tx.referenceNo,
                tx.partyName || "",
                tx.category,
                tx.description,
                tx.type === "withdrawal" ? tx.amount : 0,
                tx.type === "deposit" ? tx.amount : 0,
                runningBalances[tx.id] ?? 0,
                tx.isReconciled ? "YES" : "NO"
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `FinFlow_Bank_Ledger_${format(new Date(), "yyyy-MM-dd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Bank Ledger exported to CSV!");
    };

    // Print Passbook
    const handlePrintPassbook = () => {
        window.print();
    };

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-card border border-border/80 rounded-2xl p-3.5 flex flex-wrap gap-2.5 items-center justify-between shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative w-48 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search Ref, Party, Narration..."
                            className="pl-8 h-9 text-xs rounded-xl"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Account Filter */}
                    <Select value={accountFilter} onValueChange={setAccountFilter}>
                        <SelectTrigger className="h-9 text-xs rounded-xl w-[150px]">
                            <SelectValue placeholder="All Accounts" />
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

                    {/* Type Filter */}
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-9 text-xs rounded-xl w-[120px]">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="deposit">Credits (+)</SelectItem>
                            <SelectItem value="withdrawal">Debits (-)</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Date Presets */}
                    <Select value={datePreset} onValueChange={(v) => setDatePreset(v as any)}>
                        <SelectTrigger className="h-9 text-xs rounded-xl w-[130px]">
                            <SelectValue placeholder="Date range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Dates</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="last_month">Last Month</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Export Options */}
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleExportExcel}
                        variant="outline"
                        className="h-9 text-xs rounded-xl font-bold gap-1.5"
                        title="Export to Microsoft Excel"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        Excel
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        variant="outline"
                        className="h-9 text-xs rounded-xl font-bold gap-1.5"
                        title="Export to CSV"
                    >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                    </Button>
                </div>
            </div>

            {/* Passbook Table */}
            <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[95px] text-xs font-bold">Date</TableHead>
                            <TableHead className="text-xs font-bold">Bank Book</TableHead>
                            <TableHead className="text-xs font-bold">Mode</TableHead>
                            <TableHead className="text-xs font-bold">Ref / UTR</TableHead>
                            <TableHead className="text-xs font-bold">Party / Memo</TableHead>
                            <TableHead className="text-xs font-bold">Category</TableHead>
                            <TableHead className="text-xs font-bold text-right">Debit (DR)</TableHead>
                            <TableHead className="text-xs font-bold text-right">Credit (CR)</TableHead>
                            <TableHead className="text-xs font-bold text-right">Running Bal</TableHead>
                            <TableHead className="w-[75px] text-center text-xs font-bold">BRS</TableHead>
                            <TableHead className="w-[45px] text-center"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="h-36 text-center text-xs text-muted-foreground">
                                    No ledger transactions found matching filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTransactions.map((tx) => {
                                const acc = accounts.find(a => a.id === tx.accountId);
                                const runBal = runningBalances[tx.id];

                                return (
                                    <TableRow key={tx.id} className="hover:bg-muted/30 text-xs">
                                        <TableCell className="font-mono text-[11px] py-2.5">
                                            {tx.date}
                                        </TableCell>

                                        <TableCell className="font-medium py-2.5">
                                            <span className="block font-semibold text-foreground">
                                                {acc?.bankName || "Unknown"}
                                            </span>
                                            {acc && (
                                                <span className="text-[9px] font-mono text-muted-foreground block">
                                                    •••• {acc.accountNumber.slice(-4)}
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell className="py-2.5">
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                                                {tx.paymentMode || "NEFT"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="font-mono font-bold text-[10px] py-2.5">
                                            <span className="truncate max-w-[110px] block" title={tx.referenceNo}>
                                                {tx.referenceNo}
                                            </span>
                                        </TableCell>

                                        <TableCell className="py-2.5">
                                            {tx.partyName && (
                                                <span className="font-semibold text-foreground block truncate max-w-[130px]">
                                                    {tx.partyName}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground block truncate max-w-[130px]" title={tx.description}>
                                                {tx.description}
                                            </span>
                                        </TableCell>

                                        <TableCell className="py-2.5">
                                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md truncate max-w-[110px] inline-block">
                                                {tx.category}
                                            </span>
                                        </TableCell>

                                        {/* Debit */}
                                        <TableCell className="text-right font-mono font-bold py-2.5 text-rose-600 dark:text-rose-400">
                                            {tx.type === "withdrawal" ? `₹${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                                        </TableCell>

                                        {/* Credit */}
                                        <TableCell className="text-right font-mono font-bold py-2.5 text-emerald-600 dark:text-emerald-400">
                                            {tx.type === "deposit" ? `₹${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                                        </TableCell>

                                        {/* Running Balance */}
                                        <TableCell className="text-right font-mono font-bold py-2.5 text-foreground">
                                            {runBal !== undefined ? `₹${runBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                                        </TableCell>

                                        {/* BRS Match Status */}
                                        <TableCell className="text-center py-2.5">
                                            {tx.isReconciled ? (
                                                <span 
                                                    onClick={() => onToggleReconciliation(tx.id, false)}
                                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded-full cursor-pointer"
                                                    title="Reconciled. Click to un-reconcile"
                                                >
                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Reconciled
                                                </span>
                                            ) : (
                                                <span 
                                                    onClick={() => onToggleReconciliation(tx.id, true)}
                                                    className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded-full cursor-pointer"
                                                    title="Click to mark reconciled"
                                                >
                                                    <Clock className="w-2.5 h-2.5" /> Pending
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-center py-2.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDeleteTransaction(tx.id)}
                                                className="w-6 h-6 rounded-lg text-muted-foreground hover:text-rose-500"
                                                title="Delete transaction"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
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
