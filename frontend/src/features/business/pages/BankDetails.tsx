import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useMemo } from "react";
import { 
    Plus, 
    Building2, 
    Trash2, 
    Edit2, 
    CheckCircle2, 
    Landmark, 
    ArrowDownLeft, 
    ArrowUpRight, 
    ArrowLeftRight, 
    Search, 
    Download, 
    AlertTriangle,
    Check,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    IndianRupee,
    Briefcase,
    Calendar,
    HelpCircle,
    BadgeAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip as ChartTooltip,
    ResponsiveContainer,
    CartesianGrid,
    BarChart,
    Bar,
    Cell
} from "recharts";
import { format, subDays, isAfter, parseISO } from "date-fns";

// ─── Interfaces & Schemas ───────────────────────────────────────────────────

export interface BankAccount {
    id: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    isDefault: boolean;
    accountType: "checking" | "savings" | "overdraft" | "cash";
    initialBalance: number;
    odLimit?: number; // Only for overdraft accounts
}

export interface BankTransaction {
    id: string;
    accountId: string;
    date: string;
    type: "deposit" | "withdrawal";
    amount: number;
    category: "Sales" | "Vendor Payment" | "Salary" | "Utilities" | "Rent" | "Transfer" | "Tax" | "Other";
    referenceId: string; // UTR or Ref Number
    description: string;
    isReconciled: boolean;
    reconciledAt?: string;
    transferToAccountId?: string; // If part of a transfer
}

export interface MockStatementRecord {
    id: string;
    date: string;
    description: string;
    amount: number; // positive = credit, negative = debit
    referenceId: string;
    matchedTransactionId?: string;
}

const BankDetailsPage = () => {
    // ─── State Hooks ─────────────────────────────────────────────────────────
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [mockStatement, setMockStatement] = useState<MockStatementRecord[]>([]);
    
    // Dialogs
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isTxOpen, setIsTxOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    
    // Edit references
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    
    // Account Form state
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [branchName, setBranchName] = useState("");
    const [accountType, setAccountType] = useState<BankAccount["accountType"]>("checking");
    const [initialBalance, setInitialBalance] = useState("0");
    const [odLimit, setOdLimit] = useState("0");

    // Transaction Form state
    const [txAccountId, setTxAccountId] = useState("");
    const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
    const [txAmount, setTxAmount] = useState("");
    const [txDate, setTxDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [txCategory, setTxCategory] = useState<BankTransaction["category"]>("Sales");
    const [txRef, setTxRef] = useState("");
    const [txDesc, setTxDesc] = useState("");

    // Transfer Form state
    const [fromAccountId, setFromAccountId] = useState("");
    const [toAccountId, setToAccountId] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferDate, setTransferDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [transferRef, setTransferRef] = useState("");
    const [transferDesc, setTransferDesc] = useState("");

    // Ledger Filters
    const [ledgerSearch, setLedgerSearch] = useState("");
    const [ledgerAccountFilter, setLedgerAccountFilter] = useState("all");
    const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");

    // ─── Data Loading & Initialization ───────────────────────────────────────
    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        try {
            const savedAccounts = localStorage.getItem("finflow_bank_accounts");
            const savedTransactions = localStorage.getItem("finflow_bank_transactions");
            const savedStatement = localStorage.getItem("finflow_mock_statement");

            if (savedAccounts) {
                setAccounts(JSON.parse(savedAccounts));
            } else {
                seedDefaultData();
                return;
            }

            if (savedTransactions) {
                setTransactions(JSON.parse(savedTransactions));
            }
            if (savedStatement) {
                setMockStatement(JSON.parse(savedStatement));
            }
        } catch (e) {
            console.error("Failed to parse banking records", e);
        }
    };

    const seedDefaultData = () => {
        const defaultAccounts: BankAccount[] = [
            {
                id: "acc-sbi",
                bankName: "State Bank of India",
                accountNumber: "332405891234",
                ifscCode: "SBIN0001609",
                branchName: "Main Branch, CP",
                isDefault: true,
                accountType: "checking",
                initialBalance: 250000
            },
            {
                id: "acc-hdfc",
                bankName: "HDFC Bank",
                accountNumber: "501004891234",
                ifscCode: "HDFC0000003",
                branchName: "Vasant Kunj",
                isDefault: false,
                accountType: "savings",
                initialBalance: 75000
            },
            {
                id: "acc-icici",
                bankName: "ICICI Business Account",
                accountNumber: "000405001234",
                ifscCode: "ICIC0000004",
                branchName: "Saket District Centre",
                isDefault: false,
                accountType: "overdraft",
                initialBalance: 0,
                odLimit: 500000
            }
        ];

        const today = new Date();
        const defaultTransactions: BankTransaction[] = [
            {
                id: "tx-1",
                accountId: "acc-sbi",
                date: format(subDays(today, 5), "yyyy-MM-dd"),
                type: "deposit",
                amount: 120000,
                category: "Sales",
                referenceId: "UTR9834212984",
                description: "Invoice #1024 Settlement",
                isReconciled: true,
                reconciledAt: format(subDays(today, 4), "yyyy-MM-dd")
            },
            {
                id: "tx-2",
                accountId: "acc-sbi",
                date: format(subDays(today, 4), "yyyy-MM-dd"),
                type: "withdrawal",
                amount: 45000,
                category: "Vendor Payment",
                referenceId: "UTR9382103982",
                description: "Raw Material procurement",
                isReconciled: true,
                reconciledAt: format(subDays(today, 3), "yyyy-MM-dd")
            },
            {
                id: "tx-3",
                accountId: "acc-hdfc",
                date: format(subDays(today, 3), "yyyy-MM-dd"),
                type: "deposit",
                amount: 1250,
                category: "Other",
                referenceId: "UTR1029302919",
                description: "Quarterly Savings Interest Credit",
                isReconciled: true,
                reconciledAt: format(subDays(today, 2), "yyyy-MM-dd")
            },
            {
                id: "tx-4",
                accountId: "acc-icici",
                date: format(subDays(today, 2), "yyyy-MM-dd"),
                type: "withdrawal",
                amount: 65000,
                category: "Rent",
                referenceId: "UTR2930491029",
                description: "Corporate Office Rent",
                isReconciled: false
            },
            {
                id: "tx-5",
                accountId: "acc-sbi",
                date: format(subDays(today, 1), "yyyy-MM-dd"),
                type: "deposit",
                amount: 42000,
                category: "Sales",
                referenceId: "UTR9082312093",
                description: "UPI Client Receivables",
                isReconciled: false
            }
        ];

        // Seed some mock statement items that match or mismatch the ledger
        const defaultStatement: MockStatementRecord[] = [
            {
                id: "st-1",
                date: format(subDays(today, 5), "yyyy-MM-dd"),
                description: "STATE BANK OF INDIA INWARD CR UTR9834212984",
                amount: 120000,
                referenceId: "UTR9834212984",
                matchedTransactionId: "tx-1"
            },
            {
                id: "st-2",
                date: format(subDays(today, 4), "yyyy-MM-dd"),
                description: "STATE BANK OF INDIA OUTWARD DR UTR9382103982",
                amount: -45000,
                referenceId: "UTR9382103982",
                matchedTransactionId: "tx-2"
            },
            {
                id: "st-3",
                date: format(subDays(today, 3), "yyyy-MM-dd"),
                description: "HDFC BANK INTEREST CR UTR1029302919",
                amount: 1250,
                referenceId: "UTR1029302919",
                matchedTransactionId: "tx-3"
            },
            // Unreconciled bank statement feeds matching UTRs but not matched in UI yet
            {
                id: "st-4",
                date: format(subDays(today, 2), "yyyy-MM-dd"),
                description: "ICICI BANK CHQ DEBIT DR UTR2930491029",
                amount: -65000,
                referenceId: "UTR2930491029"
            },
            {
                id: "st-5",
                date: format(subDays(today, 1), "yyyy-MM-dd"),
                description: "UPI INWARD CREDIT PAYMENT UTR9082312093",
                amount: 42000,
                referenceId: "UTR9082312093"
            },
            {
                id: "st-6",
                date: format(today, "yyyy-MM-dd"),
                description: "BANK CHARGES DR TAX REF CHARGES",
                amount: -250,
                referenceId: "MOCKCHG992" // Mismatch to show statement reconciliation logic
            }
        ];

        setAccounts(defaultAccounts);
        setTransactions(defaultTransactions);
        setMockStatement(defaultStatement);

        localStorage.setItem("finflow_bank_accounts", JSON.stringify(defaultAccounts));
        localStorage.setItem("finflow_bank_transactions", JSON.stringify(defaultTransactions));
        localStorage.setItem("finflow_mock_statement", JSON.stringify(defaultStatement));
        
        toast.success("Accountant Workspace initialized with sample bank books!");
    };

    const saveAccounts = (list: BankAccount[]) => {
        setAccounts(list);
        localStorage.setItem("finflow_bank_accounts", JSON.stringify(list));
    };

    const saveTransactions = (list: BankTransaction[]) => {
        setTransactions(list);
        localStorage.setItem("finflow_bank_transactions", JSON.stringify(list));
    };

    const saveStatement = (list: MockStatementRecord[]) => {
        setMockStatement(list);
        localStorage.setItem("finflow_mock_statement", JSON.stringify(list));
    };

    // ─── Accountant Ledger Math ──────────────────────────────────────────────
    
    // Calculates balances dynamically to emulate a real-world accounting registry
    const accountBalances = useMemo(() => {
        const balances: Record<string, number> = {};
        
        accounts.forEach(a => {
            balances[a.id] = Number(a.initialBalance) || 0;
        });

        transactions.forEach(tx => {
            if (balances[tx.accountId] !== undefined) {
                if (tx.type === "deposit") {
                    balances[tx.accountId] += tx.amount;
                } else {
                    balances[tx.accountId] -= tx.amount;
                }
            }
        });

        return balances;
    }, [accounts, transactions]);

    const totalLiquidAssets = useMemo(() => {
        return Object.values(accountBalances).reduce((sum, val) => sum + val, 0);
    }, [accountBalances]);

    // Calculate Inflows and Outflows (last 30 days)
    const stats30Days = useMemo(() => {
        const thirtyDaysAgo = subDays(new Date(), 30);
        let inbound = 0;
        let outbound = 0;

        transactions.forEach(t => {
            if (isAfter(parseISO(t.date), thirtyDaysAgo)) {
                if (t.type === "deposit") {
                    inbound += t.amount;
                } else {
                    outbound += t.amount;
                }
            }
        });

        return { inbound, outbound, net: inbound - outbound };
    }, [transactions]);

    // ─── Account Actions ─────────────────────────────────────────────────────
    const handleOpenAccountDialog = (acc?: BankAccount) => {
        if (acc) {
            setEditingAccount(acc);
            setBankName(acc.bankName);
            setAccountNumber(acc.accountNumber);
            setIfscCode(acc.ifscCode);
            setBranchName(acc.branchName);
            setAccountType(acc.accountType);
            setInitialBalance(acc.initialBalance.toString());
            setOdLimit(acc.odLimit ? acc.odLimit.toString() : "0");
        } else {
            setEditingAccount(null);
            setBankName("");
            setAccountNumber("");
            setIfscCode("");
            setBranchName("");
            setAccountType("checking");
            setInitialBalance("0");
            setOdLimit("0");
        }
        setIsAccountOpen(true);
    };

    const handleAccountSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim() || !branchName.trim()) {
            toast.error("Please fill in all bank details.");
            return;
        }

        // Standard IFSC validation
        if (ifscCode.trim().length !== 11) {
            toast.error("IFSC Code must be exactly 11 characters.");
            return;
        }

        let updated: BankAccount[];

        if (editingAccount) {
            updated = accounts.map(a => 
                a.id === editingAccount.id 
                    ? { 
                        ...a, 
                        bankName, 
                        accountNumber, 
                        ifscCode: ifscCode.toUpperCase(), 
                        branchName,
                        accountType,
                        initialBalance: Number(initialBalance) || 0,
                        odLimit: accountType === "overdraft" ? Number(odLimit) || 0 : undefined
                      } 
                    : a
            );
            toast.success("Bank details updated successfully!");
        } else {
            const newAcc: BankAccount = {
                id: crypto.randomUUID(),
                bankName,
                accountNumber,
                ifscCode: ifscCode.toUpperCase(),
                branchName,
                accountType,
                isDefault: accounts.length === 0,
                initialBalance: Number(initialBalance) || 0,
                odLimit: accountType === "overdraft" ? Number(odLimit) || 0 : undefined
            };
            updated = [...accounts, newAcc];
            toast.success("New bank book created!");
        }

        saveAccounts(updated);
        setIsAccountOpen(false);
    };

    const handleDeleteAccount = (id: string) => {
        const target = accounts.find(a => a.id === id);
        if (!target) return;

        if (target.isDefault && accounts.length > 1) {
            toast.error("Please set another account as default before removing this bank book.");
            return;
        }

        // Check if there are transactions bound to this account
        const hasTransactions = transactions.some(t => t.accountId === id);
        if (hasTransactions) {
            toast.error("Cannot delete a bank book with transaction records. Archive or delete transactions first.");
            return;
        }

        const filtered = accounts.filter(a => a.id !== id);
        if (target.isDefault && filtered.length > 0) {
            filtered[0].isDefault = true;
        }

        saveAccounts(filtered);
        toast.success("Bank book removed successfully.");
    };

    const handleSetDefault = (id: string) => {
        const updated = accounts.map(a => ({
            ...a,
            isDefault: a.id === id
        }));
        saveAccounts(updated);
        toast.success("Default invoice bank account updated!");
    };

    // ─── Transaction Actions ─────────────────────────────────────────────────
    const handleOpenTxDialog = (type: "deposit" | "withdrawal", accountId?: string) => {
        setTxAccountId(accountId || (accounts[0]?.id || ""));
        setTxType(type);
        setTxAmount("");
        setTxDate(format(new Date(), "yyyy-MM-dd"));
        setTxCategory(type === "deposit" ? "Sales" : "Vendor Payment");
        setTxRef("UTR" + Math.floor(1000000000 + Math.random() * 9000000000).toString());
        setTxDesc("");
        setIsTxOpen(true);
    };

    const handleTxSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!txAccountId || !txAmount || Number(txAmount) <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }

        const targetAcc = accounts.find(a => a.id === txAccountId);
        if (!targetAcc) return;

        // Overdraft liability warning check
        if (txType === "withdrawal") {
            const currentBal = accountBalances[txAccountId];
            const remainingOD = targetAcc.accountType === "overdraft" 
                ? (targetAcc.odLimit || 0) + currentBal 
                : currentBal;

            if (Number(txAmount) > remainingOD) {
                toast.error(`Transaction exceeds available funds/overdraft limit! Max draw: ₹${remainingOD.toLocaleString()}`);
                return;
            }
        }

        const newTx: BankTransaction = {
            id: crypto.randomUUID(),
            accountId: txAccountId,
            date: txDate,
            type: txType,
            amount: Number(txAmount),
            category: txCategory,
            referenceId: txRef || ("REF" + Date.now()),
            description: txDesc || `${txType === "deposit" ? "Deposit" : "Withdrawal"} - ${txCategory}`,
            isReconciled: false
        };

        saveTransactions([newTx, ...transactions]);
        setIsTxOpen(false);
        toast.success(`Ledger posted: ${txType === "deposit" ? "+" : "-"}₹${newTx.amount.toLocaleString()}`);
    };

    // ─── Account-to-Account Transfers ────────────────────────────────────────
    const handleOpenTransferDialog = () => {
        if (accounts.length < 2) {
            toast.error("At least two bank books are required to initiate an internal transfer.");
            return;
        }
        setFromAccountId(accounts[0]?.id || "");
        setToAccountId(accounts[1]?.id || "");
        setTransferAmount("");
        setTransferDate(format(new Date(), "yyyy-MM-dd"));
        setTransferRef("TXN" + Math.floor(1000000000 + Math.random() * 9000000000).toString());
        setTransferDesc("Contra fund transfer");
        setIsTransferOpen(true);
    };

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (fromAccountId === toAccountId) {
            toast.error("Source and destination accounts must be different.");
            return;
        }

        const amt = Number(transferAmount);
        if (!amt || amt <= 0) {
            toast.error("Please enter a valid transfer amount.");
            return;
        }

        const sourceAcc = accounts.find(a => a.id === fromAccountId);
        const destAcc = accounts.find(a => a.id === toAccountId);
        if (!sourceAcc || !destAcc) return;

        // Check if source has enough funds
        const currentBal = accountBalances[fromAccountId];
        const maxLimit = sourceAcc.accountType === "overdraft" 
            ? (sourceAcc.odLimit || 0) + currentBal 
            : currentBal;

        if (amt > maxLimit) {
            toast.error(`Transfer exceeds available funds. Max limit: ₹${maxLimit.toLocaleString()}`);
            return;
        }

        const commonRef = transferRef || ("TXN" + Date.now());

        // Create Contra (double-entry) ledger postings
        const debitTxId = crypto.randomUUID();
        const creditTxId = crypto.randomUUID();

        const debitTx: BankTransaction = {
            id: debitTxId,
            accountId: fromAccountId,
            date: transferDate,
            type: "withdrawal",
            amount: amt,
            category: "Transfer",
            referenceId: commonRef,
            description: transferDesc || `Transfer to ${destAcc.bankName}`,
            isReconciled: false,
            transferToAccountId: toAccountId
        };

        const creditTx: BankTransaction = {
            id: creditTxId,
            accountId: toAccountId,
            date: transferDate,
            type: "deposit",
            amount: amt,
            category: "Transfer",
            referenceId: commonRef,
            description: transferDesc || `Transfer from ${sourceAcc.bankName}`,
            isReconciled: false
        };

        saveTransactions([debitTx, creditTx, ...transactions]);
        setIsTransferOpen(false);
        toast.success(`Contra posted: ₹${amt.toLocaleString()} moved.`);
    };

    const handleDeleteTransaction = (id: string) => {
        const updated = transactions.filter(t => t.id !== id);
        saveTransactions(updated);
        toast.success("Transaction removed from ledger.");
    };

    // ─── Reconciliation Controls ─────────────────────────────────────────────
    const handleReconcileToggle = (txId: string) => {
        const updated = transactions.map(t => {
            if (t.id === txId) {
                const newState = !t.isReconciled;
                return {
                    ...t,
                    isReconciled: newState,
                    reconciledAt: newState ? format(new Date(), "yyyy-MM-dd") : undefined
                };
            }
            return t;
        });

        // Also update matching mock statement item status
        const tx = transactions.find(t => t.id === txId);
        if (tx) {
            const isReconciling = !tx.isReconciled;
            const updatedStatement = mockStatement.map(st => {
                if (st.referenceId === tx.referenceId) {
                    return { ...st, matchedTransactionId: isReconciling ? tx.id : undefined };
                }
                return st;
            });
            saveStatement(updatedStatement);
        }

        saveTransactions(updated);
        toast.success(tx?.isReconciled ? "Transaction un-reconciled." : "Transaction reconciled with bank statement!");
    };

    const handleAutoMatchReconciliation = () => {
        let matchCount = 0;
        const tempStatement = [...mockStatement];
        
        const updatedTxs = transactions.map(t => {
            if (t.isReconciled) return t;

            // Search for matching UTR/Ref in mock statement
            const matchIndex = tempStatement.findIndex(st => 
                st.referenceId === t.referenceId && 
                Math.abs(st.amount) === t.amount &&
                !st.matchedTransactionId
            );

            if (matchIndex !== -1) {
                matchCount++;
                tempStatement[matchIndex].matchedTransactionId = t.id;
                return {
                    ...t,
                    isReconciled: true,
                    reconciledAt: tempStatement[matchIndex].date
                };
            }
            return t;
        });

        if (matchCount > 0) {
            saveTransactions(updatedTxs);
            saveStatement(tempStatement);
            toast.success(`Automated match completed! Reconciled ${matchCount} transactions with bank feeds.`);
        } else {
            toast.info("No matching reference numbers or amounts found in the bank feeds.");
        }
    };

    // Simulated Bank Statement Generator tool
    const handleGenerateBankStatement = () => {
        const today = new Date();
        // Generate new random statement feeds that match current unreconciled ledger entries
        const unreconciled = transactions.filter(t => !t.isReconciled);
        if (unreconciled.length === 0) {
            // Generate standard generic feeds
            const genericFeeds: MockStatementRecord[] = [
                {
                    id: "gen-" + Math.random(),
                    date: format(today, "yyyy-MM-dd"),
                    description: "BANK INTEREST REBATE CR",
                    amount: 550,
                    referenceId: "MOCKINT" + Math.floor(Math.random() * 1000)
                },
                {
                    id: "gen-" + Math.random(),
                    date: format(today, "yyyy-MM-dd"),
                    description: "UPI INWARD CREDIT MOCKPAY",
                    amount: 15000,
                    referenceId: "UTR" + Math.floor(Math.random() * 9000000000)
                }
            ];
            saveStatement([...genericFeeds, ...mockStatement]);
            toast.success("Simulated bank statement feed populated with new activities.");
            return;
        }

        const newFeeds = unreconciled.map(t => {
            const acc = accounts.find(a => a.id === t.accountId);
            const prefix = acc ? acc.bankName.toUpperCase() : "BANK FEED";
            return {
                id: "st-feed-" + crypto.randomUUID(),
                date: t.date,
                description: `${prefix} ${t.type === "deposit" ? "CR" : "DR"} ${t.description.toUpperCase()} REF ${t.referenceId}`,
                amount: t.type === "deposit" ? t.amount : -t.amount,
                referenceId: t.referenceId
            };
        });

        // Add 1 mismatching bank charges feed for reality
        newFeeds.push({
            id: "st-feed-charge-" + Math.random(),
            date: format(today, "yyyy-MM-dd"),
            description: "SYSTEM CONVENIENCE FEE DR MOCKREF",
            amount: -120,
            referenceId: "FEE" + Date.now().toString().slice(-4)
        });

        saveStatement([...newFeeds, ...mockStatement]);
        toast.success(`Generated ${newFeeds.length} new statement line feeds corresponding to your ledger.`);
    };

    const handleClearStatementFeeds = () => {
        // Reset matches to false
        const resetTxs = transactions.map(t => ({ ...t, isReconciled: false, reconciledAt: undefined }));
        saveTransactions(resetTxs);
        saveStatement([]);
        toast.success("Bank statement feed cleared. Ledger reconciliation reset.");
    };

    // ─── CSV Export ──────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) {
            toast.error("No transactions to export.");
            return;
        }

        const headers = ["Date", "Bank Account", "Type", "Category", "Amount (INR)", "Reference/UTR", "Description", "Reconciled"];
        const rows = filteredTransactions.map(t => {
            const acc = accounts.find(a => a.id === t.accountId);
            return [
                t.date,
                acc ? `${acc.bankName} (${acc.accountNumber.slice(-4)})` : "Unknown",
                t.type.toUpperCase(),
                t.category,
                t.amount,
                t.referenceId,
                t.description,
                t.isReconciled ? "YES" : "NO"
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `General_Ledger_${format(new Date(), "yyyy-MM-dd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Bank Ledger exported successfully to CSV!");
    };

    // ─── Filtered Transactions for Ledger ────────────────────────────────────
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = 
                t.description.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                t.referenceId.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                t.category.toLowerCase().includes(ledgerSearch.toLowerCase());
            
            const matchesAccount = ledgerAccountFilter === "all" || t.accountId === ledgerAccountFilter;
            const matchesType = ledgerTypeFilter === "all" || t.type === ledgerTypeFilter;

            return matchesSearch && matchesAccount && matchesType;
        });
    }, [transactions, ledgerSearch, ledgerAccountFilter, ledgerTypeFilter]);

    // ─── Chart Data Construction ─────────────────────────────────────────────
    const chartData = useMemo(() => {
        // Build 30-day chronological overview of inflow vs outflow
        const data: Record<string, { date: string; Inbound: number; Outbound: number }> = {};
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const dateStr = format(subDays(today, i), "yyyy-MM-dd");
            const dayLabel = format(subDays(today, i), "dd MMM");
            data[dateStr] = { date: dayLabel, Inbound: 0, Outbound: 0 };
        }

        transactions.forEach(t => {
            if (data[t.date]) {
                if (t.type === "deposit") {
                    data[t.date].Inbound += t.amount;
                } else {
                    data[t.date].Outbound += t.amount;
                }
            }
        });

        return Object.values(data);
    }, [transactions]);

    return (
        <AppLayout>
            <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6 animate-fade-in pb-12">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-105 dark:border-slate-800/80 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-850 dark:text-slate-100">
                            <Landmark className="w-6 h-6 text-primary" />
                            Business Banking Hub
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1">
                            Accounting general ledger, multi-book registers, real-life bank reconciliation workstation, and liquidity metrics.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button 
                            onClick={handleOpenTransferDialog} 
                            variant="outline"
                            className="rounded-xl text-xs font-bold gap-1.5 h-9"
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            Internal Transfer
                        </Button>
                        <Button 
                            onClick={() => handleOpenTxDialog("deposit")} 
                            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-600/95 text-white"
                        >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Receive (Credit)
                        </Button>
                        <Button 
                            onClick={() => handleOpenTxDialog("withdrawal")} 
                            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-rose-600 hover:bg-rose-600/95 text-white"
                        >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Pay (Debit)
                        </Button>
                        <Button 
                            onClick={() => handleOpenAccountDialog()} 
                            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary hover:bg-primary/95 text-white"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Account
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics Dashboard Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Liquid Assets Card */}
                    <div className="bg-card border border-border/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Liquid Assets</span>
                            <span className="text-lg font-bold text-slate-850 dark:text-slate-100">
                                ₹{totalLiquidAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Monthly Inflow */}
                    <div className="bg-card border border-border/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">30D Inflow (Credits)</span>
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                +₹{stats30Days.inbound.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>

                    {/* Monthly Outflow */}
                    <div className="bg-card border border-border/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">30D Outflow (Debits)</span>
                            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                                -₹{stats30Days.outbound.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>

                    {/* Net Cash Flow */}
                    <div className="bg-card border border-border/80 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            stats30Days.net >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        )}>
                            {stats30Days.net >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Net Cash Flow (30D)</span>
                            <span className={cn(
                                "text-lg font-bold",
                                stats30Days.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}>
                                {stats30Days.net >= 0 ? "+" : ""}₹{stats30Days.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content Workspace Tabs */}
                <Tabs defaultValue="accounts" className="w-full space-y-4">
                    <TabsList className="bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl w-full max-w-md grid grid-cols-4">
                        <TabsTrigger value="accounts" className="rounded-lg text-xs py-1.5">Accounts</TabsTrigger>
                        <TabsTrigger value="ledger" className="rounded-lg text-xs py-1.5">Ledger</TabsTrigger>
                        <TabsTrigger value="reconcile" className="rounded-lg text-xs py-1.5">Reconcile</TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-lg text-xs py-1.5">Analytics</TabsTrigger>
                    </TabsList>

                    {/* ────────────────── ACCOUNTS REGISTER TAB ────────────────── */}
                    <TabsContent value="accounts" className="space-y-4 outline-none">
                        {accounts.length === 0 ? (
                            <div className="border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-3 bg-card/50">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Landmark className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-sm">No bank accounts configured</h3>
                                <p className="text-xs text-muted-foreground max-w-xs">
                                    Create a business checking, savings, or overdraft registry to track transactions.
                                </p>
                                <Button size="sm" onClick={() => handleOpenAccountDialog()} className="rounded-xl text-xs">
                                    Create First Bank Book
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {accounts.map((acc) => {
                                    const bal = accountBalances[acc.id] || 0;
                                    const isOD = acc.accountType === "overdraft";
                                    const isLowOD = isOD && (acc.odLimit !== undefined) && ((acc.odLimit + bal) < (acc.odLimit * 0.1));

                                    return (
                                        <div 
                                            key={acc.id}
                                            className={cn(
                                                "relative bg-card rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 hover:shadow-md",
                                                acc.isDefault ? "border-primary ring-2 ring-primary/5 shadow-sm" : "border-border/80"
                                            )}
                                        >
                                            {/* Default Badge */}
                                            {acc.isDefault && (
                                                <div className="absolute top-4 right-4 flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Default
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-650 dark:text-slate-350">
                                                        <Building2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-sm text-slate-805 dark:text-slate-100">{acc.bankName}</h3>
                                                        <span className="text-[10px] text-muted-foreground capitalize font-semibold">{acc.accountType} Account</span>
                                                    </div>
                                                </div>

                                                {/* Dynamic Balance indicator */}
                                                <div className="bg-slate-50 dark:bg-slate-905/60 p-3 rounded-xl">
                                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Ledger Balance</span>
                                                    <span className={cn(
                                                        "text-base font-bold font-mono",
                                                        bal < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"
                                                    )}>
                                                        ₹{bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                {/* Overdraft limit details */}
                                                {isOD && acc.odLimit && (
                                                    <div className="space-y-1 pt-1">
                                                        <div className="flex items-center justify-between text-[9px] font-bold">
                                                            <span className="text-muted-foreground">Available Credit</span>
                                                            <span className={isLowOD ? "text-rose-600" : "text-emerald-600"}>
                                                                ₹{(acc.odLimit + bal).toLocaleString()} / ₹{acc.odLimit.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <Progress 
                                                            value={((acc.odLimit + bal) / acc.odLimit) * 100} 
                                                            className={cn("h-1.5", isLowOD ? "bg-rose-100 dark:bg-rose-950" : "")}
                                                        />
                                                        {isLowOD && (
                                                            <span className="text-[8px] text-rose-500 font-bold flex items-center gap-1">
                                                                <BadgeAlert className="w-3 h-3" /> Critical: Overdraft limit exhaustion warning.
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Account info list */}
                                                <div className="grid grid-cols-2 gap-y-2 pt-2 border-t text-[10px] font-mono">
                                                    <div>
                                                        <span className="text-[8px] text-muted-foreground uppercase block font-sans">Account Number</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{acc.accountNumber}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] text-muted-foreground uppercase block font-sans">IFSC Code</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{acc.ifscCode}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center justify-between border-t pt-3">
                                                <button 
                                                    onClick={() => handleSetDefault(acc.id)}
                                                    disabled={acc.isDefault}
                                                    className={cn(
                                                        "text-[10px] font-bold transition-all disabled:opacity-50",
                                                        acc.isDefault 
                                                            ? "text-primary cursor-default" 
                                                            : "text-slate-500 hover:text-primary"
                                                    )}
                                                >
                                                    {acc.isDefault ? "Selected for prints" : "Set as default"}
                                                </button>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        onClick={() => handleOpenAccountDialog(acc)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800"
                                                        title="Edit account details"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleDeleteAccount(acc.id)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                                        title="Remove account"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* ────────────────── GENERAL LEDGER TAB ────────────────── */}
                    <TabsContent value="ledger" className="space-y-4 outline-none">
                        <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search Ref, Category, description..." 
                                    className="pl-9 h-9 text-xs rounded-xl"
                                    value={ledgerSearch}
                                    onChange={e => setLedgerSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <Select value={ledgerAccountFilter} onValueChange={setLedgerAccountFilter}>
                                    <SelectTrigger className="h-9 text-xs rounded-xl w-[140px]">
                                        <SelectValue placeholder="Filter Account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Accounts</SelectItem>
                                        {accounts.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.bankName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={ledgerTypeFilter} onValueChange={setLedgerTypeFilter}>
                                    <SelectTrigger className="h-9 text-xs rounded-xl w-[120px]">
                                        <SelectValue placeholder="Filter Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="deposit">Credits (+)</SelectItem>
                                        <SelectItem value="withdrawal">Debits (-)</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button 
                                    onClick={handleExportCSV}
                                    variant="outline"
                                    className="h-9 text-xs rounded-xl gap-1.5 ml-auto md:ml-0 font-bold"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Export CSV
                                </Button>
                            </div>
                        </div>

                        {/* Ledger list table */}
                        <div className="bg-card border border-border/85 rounded-2xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                                        <TableHead className="w-[100px] text-xs font-bold">Date</TableHead>
                                        <TableHead className="text-xs font-bold">Bank Book</TableHead>
                                        <TableHead className="text-xs font-bold">Type</TableHead>
                                        <TableHead className="text-xs font-bold">Category</TableHead>
                                        <TableHead className="text-xs font-bold">Ref/UTR</TableHead>
                                        <TableHead className="text-xs font-bold">Description</TableHead>
                                        <TableHead className="text-xs font-bold text-right">Amount (₹)</TableHead>
                                        <TableHead className="text-xs font-bold text-center w-[120px]">Status</TableHead>
                                        <TableHead className="w-[60px] text-center"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTransactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground">
                                                No banking records match filters. Add a transaction or seed sample data.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTransactions.map((tx) => {
                                            const acc = accounts.find(a => a.id === tx.accountId);
                                            return (
                                                <TableRow key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                                    <TableCell className="font-mono text-[10px]">{tx.date}</TableCell>
                                                    <TableCell className="font-medium text-xs">
                                                        {acc ? acc.bankName : "Unknown Account"}
                                                        {acc && <span className="block text-[8px] font-mono text-muted-foreground">({acc.accountNumber.slice(-4)})</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        {tx.type === "deposit" ? (
                                                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-0 text-[9px] font-bold rounded-lg px-2">
                                                                CREDIT
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 border-0 text-[9px] font-bold rounded-lg px-2">
                                                                DEBIT
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-350">{tx.category}</TableCell>
                                                    <TableCell className="font-mono text-[10px] font-bold">{tx.referenceId}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={tx.description}>
                                                        {tx.description}
                                                    </TableCell>
                                                    <TableCell className={cn(
                                                        "text-xs font-mono font-bold text-right",
                                                        tx.type === "deposit" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                                    )}>
                                                        {tx.type === "deposit" ? "+" : "-"}₹{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {tx.isReconciled ? (
                                                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 text-[9px] py-0.5 rounded-full inline-flex gap-1 items-center">
                                                                <Check className="w-2.5 h-2.5" /> Reconciled
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 text-amber-600 text-[9px] py-0.5 rounded-full inline-flex gap-1 items-center">
                                                                <HelpCircle className="w-2.5 h-2.5" /> Unreconciled
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            onClick={() => handleDeleteTransaction(tx.id)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* ────────────────── RECONCILIATION TAB ────────────────── */}
                    <TabsContent value="reconcile" className="space-y-4 outline-none">
                        
                        {/* Reconciliation status summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-card border border-border/80 p-4 rounded-2xl flex flex-col justify-between">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">General Ledger Balance</span>
                                <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
                                    ₹{totalLiquidAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="bg-card border border-border/80 p-4 rounded-2xl flex flex-col justify-between">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Reconciled Statement balance</span>
                                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                    ₹{(
                                        accounts.reduce((sum, a) => sum + a.initialBalance, 0) +
                                        transactions.filter(t => t.isReconciled).reduce((sum, t) => sum + (t.type === "deposit" ? t.amount : -t.amount), 0)
                                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="bg-card border border-border/80 p-4 rounded-2xl flex flex-col justify-between">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Difference to Match</span>
                                <span className={cn(
                                    "text-lg font-bold font-mono",
                                    transactions.some(t => !t.isReconciled) ? "text-amber-500" : "text-emerald-500"
                                )}>
                                    ₹{transactions.filter(t => !t.isReconciled).reduce((sum, t) => sum + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Auto Match Toolbar */}
                        <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-wrap gap-2 items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                                Perform automated reconciliations by matching Ledger transaction UTR reference codes directly with incoming bank statement feeds.
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    onClick={handleAutoMatchReconciliation}
                                    variant="outline"
                                    className="rounded-xl text-xs h-9 font-bold border-primary text-primary hover:bg-primary/5 gap-1.5"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Run Auto-Match
                                </Button>
                                <Button 
                                    onClick={handleGenerateBankStatement}
                                    className="rounded-xl text-xs h-9 font-bold bg-slate-800 hover:bg-slate-700 text-white gap-1.5"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Simulate Statement Feed
                                </Button>
                                <Button 
                                    onClick={handleClearStatementFeeds}
                                    variant="ghost"
                                    className="rounded-xl text-xs h-9 font-bold text-rose-500 hover:bg-rose-500/5 gap-1.5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Reset Workspace
                                </Button>
                            </div>
                        </div>

                        {/* Reconciliation Workspace Splits */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            
                            {/* Left Side: General Ledger (Unreconciled) */}
                            <div className="bg-card border border-border/80 rounded-2xl p-4 space-y-3">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Landmark className="w-3.5 h-3.5 text-primary" /> Unreconciled General Ledger ({transactions.filter(t => !t.isReconciled).length} Posts)
                                </h3>
                                <div className="border border-border/60 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/40">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-bold">Date/Book</TableHead>
                                                <TableHead className="text-[10px] font-bold">Ref/UTR</TableHead>
                                                <TableHead className="text-[10px] font-bold text-right">Amount (₹)</TableHead>
                                                <TableHead className="w-[80px] text-center"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.filter(t => !t.isReconciled).length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground">
                                                        Perfect match! All ledger postings have been matched.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                transactions.filter(t => !t.isReconciled).map(t => {
                                                    const acc = accounts.find(a => a.id === t.accountId);
                                                    return (
                                                        <TableRow key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                                                            <TableCell>
                                                                <span className="block font-mono text-[9px]">{t.date}</span>
                                                                <span className="text-[9px] font-semibold block truncate max-w-[120px]">{acc?.bankName}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-mono text-[9px] font-bold block">{t.referenceId}</span>
                                                                <span className="text-[8px] text-muted-foreground block truncate max-w-[120px]">{t.description}</span>
                                                            </TableCell>
                                                            <TableCell className={cn(
                                                                "text-[10px] font-mono font-bold text-right",
                                                                t.type === "deposit" ? "text-emerald-600" : "text-rose-600"
                                                            )}>
                                                                {t.type === "deposit" ? "+" : "-"}₹{t.amount.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Button
                                                                    size="xs"
                                                                    onClick={() => handleReconcileToggle(t.id)}
                                                                    className="h-6 rounded px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px]"
                                                                >
                                                                    Mark Reconciled
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

                            {/* Right Side: Incoming Bank Statement Feeds */}
                            <div className="bg-card border border-border/80 rounded-2xl p-4 space-y-3">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 text-primary animate-pulse" /> Live Bank Statement Feeds ({mockStatement.length} Feeds)
                                </h3>
                                <div className="border border-border/60 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/40">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-bold">Date/Bank Info</TableHead>
                                                <TableHead className="text-[10px] font-bold">Ref/UTR</TableHead>
                                                <TableHead className="text-[10px] font-bold text-right">Amount (₹)</TableHead>
                                                <TableHead className="w-[80px] text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {mockStatement.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground">
                                                        No imported statements. Click "Simulate Statement Feed" above to start testing.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                mockStatement.map(st => (
                                                    <TableRow key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                                                        <TableCell>
                                                            <span className="block font-mono text-[9px]">{st.date}</span>
                                                            <span className="text-[8px] text-muted-foreground block truncate max-w-[150px]">{st.description}</span>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-[9px] font-bold">{st.referenceId}</TableCell>
                                                        <TableCell className={cn(
                                                            "text-[10px] font-mono font-bold text-right",
                                                            st.amount > 0 ? "text-emerald-600" : "text-rose-600"
                                                        )}>
                                                            {st.amount > 0 ? "+" : ""}₹{st.amount.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {st.matchedTransactionId ? (
                                                                <Badge className="bg-emerald-500/10 border-0 text-emerald-600 hover:bg-emerald-500/15 text-[8px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                                    <Check className="w-2.5 h-2.5" /> Matched
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-amber-500/10 border-0 text-amber-600 hover:bg-amber-500/15 text-[8px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                                    <AlertTriangle className="w-2.5 h-2.5" /> Pending
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                        </div>
                    </TabsContent>

                    {/* ────────────────── ANALYTICS & CHARTS TAB ────────────────── */}
                    <TabsContent value="analytics" className="space-y-6 outline-none">
                        
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Area Chart: cash flow trends */}
                            <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4">
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">30-Day Cash Flow Trends</h3>
                                    <p className="text-[10px] text-muted-foreground">Daily credit (Inflow) vs debit (Outflow) transaction aggregate tracking.</p>
                                </div>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                                            <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 9 }} />
                                            <YAxis tickLine={false} tick={{ fontSize: 9 }} />
                                            <ChartTooltip 
                                                contentStyle={{ 
                                                    backgroundColor: "rgba(255, 255, 255, 0.95)", 
                                                    border: "1px solid #e2e8f0", 
                                                    borderRadius: "12px",
                                                    fontSize: "11px"
                                                }} 
                                            />
                                            <Area type="monotone" dataKey="Inbound" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#inboundGrad)" />
                                            <Area type="monotone" dataKey="Outbound" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#outboundGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Bar Chart: Balance distribution across accounts */}
                            <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4">
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Liquidity Distribution</h3>
                                    <p className="text-[10px] text-muted-foreground">Current ledger balance distributed by configured bank books.</p>
                                </div>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={accounts.map(a => ({ name: a.bankName, Balance: accountBalances[a.id] || 0 }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                                            <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 8 }} />
                                            <YAxis tickLine={false} tick={{ fontSize: 9 }} />
                                            <ChartTooltip 
                                                contentStyle={{ 
                                                    backgroundColor: "rgba(255, 255, 255, 0.95)", 
                                                    border: "1px solid #e2e8f0", 
                                                    borderRadius: "12px",
                                                    fontSize: "11px"
                                                }}
                                            />
                                            <Bar dataKey="Balance" radius={[6, 6, 0, 0]}>
                                                {
                                                    accounts.map((entry, index) => {
                                                        const bal = accountBalances[entry.id] || 0;
                                                        return <Cell key={`cell-${index}`} fill={bal < 0 ? "#f43f5e" : "#3b82f6"} />;
                                                    })
                                                }
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    </TabsContent>
                </Tabs>

                {/* ─── DIALOG: ADD/EDIT BANK ACCOUNT ────────────────────────── */}
                <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                                {editingAccount ? "Edit Bank Account" : "Add Bank Account"}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Configure bank parameters accurately. Account details automatically map onto ledger and printed invoice headers.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={handleAccountSubmit} className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Bank Name</label>
                                    <Input 
                                        value={bankName}
                                        onChange={e => setBankName(e.target.value)}
                                        placeholder="e.g. State Bank of India"
                                        className="h-9 text-xs rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Account Type</label>
                                    <select 
                                        value={accountType}
                                        onChange={e => setAccountType(e.target.value as BankAccount["accountType"])}
                                        className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="checking">Checking (Current)</option>
                                        <option value="savings">Savings</option>
                                        <option value="overdraft">Credit Line (Overdraft)</option>
                                        <option value="cash">Cash In Hand / Safe</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-500 block">Account Number</label>
                                <Input 
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value)}
                                    placeholder="e.g. 332405891234"
                                    className="h-9 text-xs rounded-xl"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">IFSC Code</label>
                                    <Input 
                                        value={ifscCode}
                                        onChange={e => setIfscCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. SBIN0001609"
                                        maxLength={11}
                                        className="h-9 text-xs rounded-xl uppercase"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Branch Name</label>
                                    <Input 
                                        value={branchName}
                                        onChange={e => setBranchName(e.target.value)}
                                        placeholder="e.g. Connaught Place"
                                        className="h-9 text-xs rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Initial Book Balance (₹)</label>
                                    <Input 
                                        type="number"
                                        value={initialBalance}
                                        onChange={e => setInitialBalance(e.target.value)}
                                        placeholder="0"
                                        className="h-9 text-xs rounded-xl"
                                        required
                                    />
                                </div>
                                {accountType === "overdraft" && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-bold text-rose-500 block">Overdraft limit (₹)</label>
                                        <Input 
                                            type="number"
                                            value={odLimit}
                                            onChange={e => setOdLimit(e.target.value)}
                                            placeholder="500000"
                                            className="h-9 text-xs border-rose-500/40 rounded-xl"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="pt-3">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsAccountOpen(false)}
                                    className="h-9 text-xs rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/95 text-white"
                                >
                                    {editingAccount ? "Save Changes" : "Create Book"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ─── DIALOG: LOG TRANSACTION (CREDIT / DEBIT) ─────────────── */}
                <Dialog open={isTxOpen} onOpenChange={setIsTxOpen}>
                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                {txType === "deposit" ? (
                                    <><ArrowDownLeft className="w-5 h-5 text-emerald-500" /> Record Inward Credit</>
                                ) : (
                                    <><ArrowUpRight className="w-5 h-5 text-rose-500" /> Record Outward Debit</>
                                )}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Manually record bank transactions directly into the account general ledger book.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleTxSubmit} className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Bank Account</label>
                                    <select 
                                        value={txAccountId}
                                        onChange={e => setTxAccountId(e.target.value)}
                                        className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        {accounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.bankName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Amount (₹)</label>
                                    <Input 
                                        type="number"
                                        value={txAmount}
                                        onChange={e => setTxAmount(e.target.value)}
                                        placeholder="Amount in Rupees"
                                        className="h-9 text-xs rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Transaction Date</label>
                                    <Input 
                                        type="date"
                                        value={txDate}
                                        onChange={e => setTxDate(e.target.value)}
                                        className="h-9 text-xs rounded-xl font-mono"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Category</label>
                                    <select 
                                        value={txCategory}
                                        onChange={e => setTxCategory(e.target.value as BankTransaction["category"])}
                                        className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        {txType === "deposit" ? (
                                            <>
                                                <option value="Sales">Sales Revenue</option>
                                                <option value="Transfer">Internal Transfer (Inbound)</option>
                                                <option value="Other">Other Revenue / Capital</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Vendor Payment">Vendor Payment</option>
                                                <option value="Salary">Salaries & Wages</option>
                                                <option value="Utilities">Office Utilities</option>
                                                <option value="Rent">Commercial Rent</option>
                                                <option value="Tax">Government Tax</option>
                                                <option value="Transfer">Internal Transfer (Outbound)</option>
                                                <option value="Other">Other Expense</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-500 block">Reference ID / UTR Number</label>
                                <Input 
                                    value={txRef}
                                    onChange={e => setTxRef(e.target.value)}
                                    placeholder="e.g. UTR1029302919"
                                    className="h-9 text-xs rounded-xl font-mono font-bold"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-500 block">Narration / Description</label>
                                <Input 
                                    value={txDesc}
                                    onChange={e => setTxDesc(e.target.value)}
                                    placeholder="Short note about the payment..."
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>

                            <DialogFooter className="pt-3">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsTxOpen(false)}
                                    className="h-9 text-xs rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/95 text-white"
                                >
                                    Post Transaction
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ─── DIALOG: INTERNAL TRANSFER (CONTRA ENTRY) ────────────── */}
                <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <ArrowLeftRight className="w-5 h-5 text-primary" /> Post Contra Transfer
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Move assets between internal bank books. Enforces double-entry contra posting automatically.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleTransferSubmit} className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-rose-500 block">From Account (Debit)</label>
                                    <select 
                                        value={fromAccountId}
                                        onChange={e => setFromAccountId(e.target.value)}
                                        className="w-full h-9 rounded-xl border border-rose-500/30 bg-background px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        {accounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.bankName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-emerald-500 block">To Account (Credit)</label>
                                    <select 
                                        value={toAccountId}
                                        onChange={e => setToAccountId(e.target.value)}
                                        className="w-full h-9 rounded-xl border border-emerald-500/30 bg-background px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        {accounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.bankName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Transfer Amount (₹)</label>
                                    <Input 
                                        type="number"
                                        value={transferAmount}
                                        onChange={e => setTransferAmount(e.target.value)}
                                        placeholder="Amount to transfer"
                                        className="h-9 text-xs rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Transfer Date</label>
                                    <Input 
                                        type="date"
                                        value={transferDate}
                                        onChange={e => setTransferDate(e.target.value)}
                                        className="h-9 text-xs rounded-xl font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-500 block">Reference ID / UTR Number</label>
                                <Input 
                                    value={transferRef}
                                    onChange={e => setTransferRef(e.target.value)}
                                    placeholder="e.g. TXN10293029"
                                    className="h-9 text-xs rounded-xl font-mono font-bold"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-500 block">Narration / Memo</label>
                                <Input 
                                    value={transferDesc}
                                    onChange={e => setTransferDesc(e.target.value)}
                                    placeholder="Contra account transfer memo..."
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>

                            <DialogFooter className="pt-3">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsTransferOpen(false)}
                                    className="h-9 text-xs rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/95 text-white"
                                >
                                    Execute Transfer
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
};

export default BankDetailsPage;