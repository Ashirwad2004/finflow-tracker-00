import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
    Landmark, 
    ArrowDownLeft, 
    ArrowUpRight, 
    ArrowLeftRight, 
    Plus, 
    QrCode, 
    Edit2,
    ShieldCheck,
    CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/core/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { subDays, isAfter, parseISO, format } from "date-fns";

// Banking Modular Components
import { BankAccount, BankTransaction, BankStatementLine, ChequeRecord, AccountType } from "../components/banking/types";
import { BankKPIHeader } from "../components/banking/BankKPIHeader";
import { BankAccountsGrid } from "../components/banking/BankAccountsGrid";
import { BankAccountModal } from "../components/banking/BankAccountModal";
import { RecordTransactionModal } from "../components/banking/RecordTransactionModal";
import { ContraTransferModal } from "../components/banking/ContraTransferModal";
import { StatementImportModal } from "../components/banking/StatementImportModal";
import { BankReconciliationWorkspace } from "../components/banking/BankReconciliationWorkspace";
import { BankLedgerPassbook } from "../components/banking/BankLedgerPassbook";
import { ChequeTrackerTab } from "../components/banking/ChequeTrackerTab";
import { BankAnalyticsTab } from "../components/banking/BankAnalyticsTab";
import { ParsedStatementResult } from "../services/statementParser";

const BankDetailsPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Active Tab state
    const [activeTab, setActiveTab] = useState<string>("accounts");

    // Modal Visibility States
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [txModalType, setTxModalType] = useState<"deposit" | "withdrawal">("deposit");
    const [txModalAccountId, setTxModalAccountId] = useState<string | undefined>(undefined);

    const [isContraModalOpen, setIsContraModalOpen] = useState(false);
    const [isStatementImportOpen, setIsStatementImportOpen] = useState(false);
    const [reconcileSelectedAccountId, setReconcileSelectedAccountId] = useState<string>("all");

    // UPI Configuration State
    const [upiId, setUpiId] = useState<string>(() => localStorage.getItem("rupeebill_upi_id") || "");
    const [isEditingUpi, setIsEditingUpi] = useState(false);
    const [upiInputVal, setUpiInputVal] = useState("");

    // ─── 1. FETCH BANK ACCOUNTS ────────────────────────────────────────────────
    const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<BankAccount[]>({
        queryKey: ["bank_accounts", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("bank_accounts")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("is_archived", false)
                    .order("created_at", { ascending: true });

                if (!error && Array.isArray(data)) {
                    const mapped: BankAccount[] = data.map((row: any) => ({
                        id: row.id,
                        bankName: row.bank_name || "",
                        accountNumber: row.account_number || "",
                        ifscCode: row.ifsc_code || "",
                        branchName: row.branch_name || "",
                        isDefault: Boolean(row.is_default),
                        accountType: (row.account_type as AccountType) || "checking",
                        initialBalance: Number(row.initial_balance) || 0,
                        odLimit: row.od_limit ? Number(row.od_limit) : 0,
                        upiId: row.upi_id || undefined,
                        colorTheme: row.color_theme || "default",
                        isArchived: Boolean(row.is_archived),
                        notes: row.notes || undefined
                    }));

                    // Keep local mirror updated for synchronous PDF generation in invoices & PrintStudio
                    try {
                        localStorage.setItem(`finflow_bank_accounts_${user.id}`, JSON.stringify(mapped));
                    } catch {}

                    return mapped;
                }
            } catch (err) {
                console.error("[BankDetails] Error fetching bank accounts:", err);
            }

            // Fallback from cache if offline
            try {
                const cached = localStorage.getItem(`finflow_bank_accounts_${user?.id}`);
                if (cached) return JSON.parse(cached);
            } catch {}
            return [];
        },
        enabled: !!user?.id
    });

    // ─── 2. FETCH BANK TRANSACTIONS (GENERAL LEDGER) ───────────────────────────
    const { data: transactions = [], isLoading: isLoadingTxs } = useQuery<BankTransaction[]>({
        queryKey: ["bank_transactions", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("bank_transactions")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("date", { ascending: false })
                    .order("created_at", { ascending: false });

                if (!error && Array.isArray(data)) {
                    // Auto-migration check: If Supabase table is empty but localStorage has transactions, migrate them!
                    if (data.length === 0) {
                        try {
                            const localSaved = localStorage.getItem(`finflow_txs_${user.id}`);
                            if (localSaved) {
                                const parsed = JSON.parse(localSaved);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    // Seed into Supabase
                                    const rowsToInsert = parsed.map((item: any) => ({
                                        id: item.id || crypto.randomUUID(),
                                        user_id: user.id,
                                        account_id: item.accountId,
                                        date: item.date || format(new Date(), "yyyy-MM-dd"),
                                        type: item.type || "deposit",
                                        amount: Number(item.amount) || 0,
                                        category: item.category || "Sales Revenue",
                                        payment_mode: "NEFT",
                                        reference_no: item.referenceId || `MIG-${Date.now()}`,
                                        description: item.description || "Migrated entry",
                                        is_reconciled: Boolean(item.isReconciled)
                                    })).filter((r: any) => accounts.some(a => a.id === r.account_id));

                                    if (rowsToInsert.length > 0) {
                                        await (supabase as any).from("bank_transactions").insert(rowsToInsert);
                                        localStorage.removeItem(`finflow_txs_${user.id}`);
                                        return rowsToInsert.map((r: any) => ({
                                            id: r.id,
                                            accountId: r.account_id,
                                            date: r.date,
                                            type: r.type,
                                            amount: r.amount,
                                            category: r.category,
                                            paymentMode: r.payment_mode,
                                            referenceNo: r.reference_no,
                                            description: r.description,
                                            isReconciled: r.is_reconciled
                                        }));
                                    }
                                }
                            }
                        } catch (migrationErr) {
                            console.warn("Auto-migration from localStorage skipped:", migrationErr);
                        }
                    }

                    return data.map((row: any) => ({
                        id: row.id,
                        accountId: row.account_id,
                        date: row.date,
                        type: row.type,
                        amount: Number(row.amount),
                        category: row.category,
                        paymentMode: row.payment_mode || "NEFT",
                        referenceNo: row.reference_no || "",
                        description: row.description || "",
                        partyName: row.party_name || undefined,
                        isReconciled: Boolean(row.is_reconciled),
                        reconciledAt: row.reconciled_at || undefined,
                        matchedStatementLineId: row.matched_statement_line_id || undefined,
                        transferToAccountId: row.transfer_to_account_id || undefined,
                        linkedContraTxId: row.linked_contra_tx_id || undefined,
                        linkedChequeId: row.linked_cheque_id || undefined,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at
                    }));
                }
            } catch (err) {
                console.error("[BankDetails] Error fetching bank transactions:", err);
            }
            return [];
        },
        enabled: !!user?.id && accounts.length > 0
    });

    // ─── 3. FETCH BANK STATEMENT LINES (FOR BRS) ──────────────────────────────
    const { data: statementLines = [] } = useQuery<BankStatementLine[]>({
        queryKey: ["bank_statement_lines", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("bank_statement_lines")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("date", { ascending: false });

                if (!error && Array.isArray(data)) {
                    return data.map((r: any) => ({
                        id: r.id,
                        importId: r.import_id,
                        accountId: r.account_id,
                        date: r.date,
                        narration: r.narration,
                        referenceNo: r.reference_no || "",
                        withdrawal: Number(r.withdrawal) || 0,
                        deposit: Number(r.deposit) || 0,
                        balance: r.balance !== null && r.balance !== undefined ? Number(r.balance) : undefined,
                        status: r.status,
                        matchedTxId: r.matched_tx_id || undefined,
                        matchedAt: r.matched_at || undefined
                    }));
                }
            } catch (err) {
                console.error("[BankDetails] Error fetching statement lines:", err);
            }
            return [];
        },
        enabled: !!user?.id
    });

    // ─── 4. FETCH CHEQUE RECORDS ──────────────────────────────────────────────
    const { data: cheques = [] } = useQuery<ChequeRecord[]>({
        queryKey: ["cheque_records", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("cheque_records")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("due_date", { ascending: true });

                if (!error && Array.isArray(data)) {
                    return data.map((r: any) => ({
                        id: r.id,
                        accountId: r.account_id,
                        chequeType: r.cheque_type,
                        chequeNumber: r.cheque_number,
                        partyName: r.party_name,
                        partyId: r.party_id || undefined,
                        amount: Number(r.amount) || 0,
                        issueDate: r.issue_date,
                        dueDate: r.due_date,
                        clearanceDate: r.clearance_date || undefined,
                        bankName: r.bank_name || undefined,
                        status: r.status,
                        bounceReason: r.bounce_reason || undefined,
                        linkedTransactionId: r.linked_transaction_id || undefined,
                        notes: r.notes || undefined
                    }));
                }
            } catch (err) {
                console.error("[BankDetails] Error fetching cheque records:", err);
            }
            return [];
        },
        enabled: !!user?.id
    });

    // ─── 5. PROFILE & UPI SYNC ────────────────────────────────────────────────
    const { data: profile } = useQuery({
        queryKey: ["profile_bank_page", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await (supabase as any)
                .from("profiles")
                .select("upi_id, bank_name, bank_account_no, bank_ifsc, bank_branch")
                .eq("user_id", user.id)
                .maybeSingle();
            return data;
        },
        enabled: !!user?.id
    });

    useEffect(() => {
        if (profile?.upi_id) {
            setUpiId(profile.upi_id);
            setUpiInputVal(profile.upi_id);
            localStorage.setItem("rupeebill_upi_id", profile.upi_id);
        }
    }, [profile?.upi_id]);

    const handleSaveUpi = async () => {
        const val = upiInputVal.trim();
        setUpiId(val);
        setIsEditingUpi(false);
        if (val) {
            localStorage.setItem("rupeebill_upi_id", val);
        } else {
            localStorage.removeItem("rupeebill_upi_id");
        }

        if (user?.id) {
            try {
                await (supabase as any)
                    .from("profiles")
                    .update({ upi_id: val || null })
                    .eq("user_id", user.id);
                queryClient.invalidateQueries({ queryKey: ["profile"] });
                queryClient.invalidateQueries({ queryKey: ["profile_bank_page"] });
                toast.success("Merchant UPI ID saved!");
            } catch (err) {
                console.error("Failed to save UPI ID", err);
            }
        }
    };

    // ─── 6. COMPUTED BALANCES & METRICS ───────────────────────────────────────
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

    const stats30Days = useMemo(() => {
        const thirtyDaysAgo = subDays(new Date(), 30);
        let inbound = 0;
        let outbound = 0;

        transactions.forEach(t => {
            try {
                if (isAfter(parseISO(t.date), thirtyDaysAgo)) {
                    if (t.type === "deposit") inbound += t.amount;
                    else outbound += t.amount;
                }
            } catch {}
        });

        return { inbound, outbound };
    }, [transactions]);

    const pendingCheques = useMemo(() => {
        const pending = cheques.filter(c => c.status === "pending" || c.status === "deposited");
        return {
            count: pending.length,
            amount: pending.reduce((sum, c) => sum + c.amount, 0)
        };
    }, [cheques]);

    const unreconciledStatementLinesCount = useMemo(() => {
        return statementLines.filter(l => l.status === "unmatched").length;
    }, [statementLines]);

    // ─── 7. ACTIONS: BANK ACCOUNTS ────────────────────────────────────────────
    const handleSaveAccount = async (accountData: Partial<BankAccount>) => {
        if (!user?.id) return;

        if (editingAccount) {
            // Update
            const { error } = await (supabase as any)
                .from("bank_accounts")
                .update({
                    bank_name: accountData.bankName,
                    account_number: accountData.accountNumber,
                    ifsc_code: accountData.ifscCode,
                    branch_name: accountData.branchName,
                    account_type: accountData.accountType,
                    initial_balance: accountData.initialBalance,
                    od_limit: accountData.odLimit,
                    upi_id: accountData.upiId || null,
                    is_default: Boolean(accountData.isDefault),
                    updated_at: new Date().toISOString()
                })
                .eq("id", editingAccount.id)
                .eq("user_id", user.id);

            if (error) throw error;
            toast.success("Bank account updated successfully!");
        } else {
            // Insert
            const isFirst = accounts.length === 0;
            const newAccRow = {
                user_id: user.id,
                bank_name: accountData.bankName,
                account_number: accountData.accountNumber,
                ifsc_code: accountData.ifscCode,
                branch_name: accountData.branchName,
                account_type: accountData.accountType,
                initial_balance: accountData.initialBalance || 0,
                od_limit: accountData.odLimit || 0,
                upi_id: accountData.upiId || null,
                is_default: isFirst ? true : Boolean(accountData.isDefault)
            };

            const { error } = await (supabase as any)
                .from("bank_accounts")
                .insert(newAccRow);

            if (error) throw error;
            toast.success("New bank book created successfully!");
        }

        await queryClient.invalidateQueries({ queryKey: ["bank_accounts", user.id] });
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (!user?.id) return;
        const confirmDelete = window.confirm(
            "Are you sure you want to remove this bank account? All linked ledger transactions will also be archived."
        );
        if (!confirmDelete) return;

        try {
            const { error } = await (supabase as any)
                .from("bank_accounts")
                .delete()
                .eq("id", accountId)
                .eq("user_id", user.id);

            if (error) throw error;
            toast.success("Bank account removed.");
            await queryClient.invalidateQueries({ queryKey: ["bank_accounts", user.id] });
            await queryClient.invalidateQueries({ queryKey: ["bank_transactions", user.id] });
        } catch (err: any) {
            console.error("Delete account error:", err);
            toast.error(err.message || "Failed to remove account.");
        }
    };

    const handleSetDefault = async (accountId: string) => {
        if (!user?.id) return;
        try {
            // Unset all defaults
            await (supabase as any)
                .from("bank_accounts")
                .update({ is_default: false })
                .eq("user_id", user.id);

            // Set chosen default
            const { error } = await (supabase as any)
                .from("bank_accounts")
                .update({ is_default: true })
                .eq("id", accountId)
                .eq("user_id", user.id);

            if (error) throw error;

            // Sync to profile for invoices
            const target = accounts.find(a => a.id === accountId);
            if (target) {
                await (supabase as any)
                    .from("profiles")
                    .update({
                        bank_name: target.bankName,
                        bank_account_no: target.accountNumber,
                        bank_ifsc: target.ifscCode,
                        bank_branch: target.branchName
                    })
                    .eq("user_id", user.id);
            }

            toast.success("Default bank account updated for printed invoices!");
            await queryClient.invalidateQueries({ queryKey: ["bank_accounts", user.id] });
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
            await queryClient.invalidateQueries({ queryKey: ["profile_bank_page"] });
        } catch (err: any) {
            toast.error(err.message || "Failed to set default bank account.");
        }
    };

    // ─── 8. ACTIONS: TRANSACTIONS & CONTRA ─────────────────────────────────────
    const handleRecordTransaction = async (txData: Partial<BankTransaction>) => {
        if (!user?.id) return;

        const newRow = {
            user_id: user.id,
            account_id: txData.accountId,
            date: txData.date || format(new Date(), "yyyy-MM-dd"),
            type: txData.type,
            amount: txData.amount,
            category: txData.category,
            payment_mode: txData.paymentMode || "NEFT",
            reference_no: txData.referenceNo,
            party_name: txData.partyName || null,
            description: txData.description,
            is_reconciled: Boolean(txData.isReconciled)
        };

        const { error } = await (supabase as any)
            .from("bank_transactions")
            .insert(newRow);

        if (error) throw error;
        toast.success(`Ledger posted: ${txData.type === "deposit" ? "+" : "-"}₹${txData.amount?.toLocaleString()}`);
        await queryClient.invalidateQueries({ queryKey: ["bank_transactions", user.id] });
    };

    const handleContraTransfer = async (transferData: {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        date: string;
        referenceNo: string;
        description: string;
    }) => {
        if (!user?.id) return;

        const sourceAcc = accounts.find(a => a.id === transferData.fromAccountId);
        const destAcc = accounts.find(a => a.id === transferData.toAccountId);

        const debitId = crypto.randomUUID();
        const creditId = crypto.randomUUID();

        const debitRow = {
            id: debitId,
            user_id: user.id,
            account_id: transferData.fromAccountId,
            date: transferData.date,
            type: "withdrawal",
            amount: transferData.amount,
            category: "Transfer",
            payment_mode: "Net Banking",
            reference_no: transferData.referenceNo,
            description: transferData.description || `Contra transfer to ${destAcc?.bankName}`,
            transfer_to_account_id: transferData.toAccountId,
            linked_contra_tx_id: creditId,
            is_reconciled: false
        };

        const creditRow = {
            id: creditId,
            user_id: user.id,
            account_id: transferData.toAccountId,
            date: transferData.date,
            type: "deposit",
            amount: transferData.amount,
            category: "Transfer",
            payment_mode: "Net Banking",
            reference_no: transferData.referenceNo,
            description: transferData.description || `Contra transfer from ${sourceAcc?.bankName}`,
            transfer_to_account_id: transferData.fromAccountId,
            linked_contra_tx_id: debitId,
            is_reconciled: false
        };

        const { error } = await (supabase as any)
            .from("bank_transactions")
            .insert([debitRow, creditRow]);

        if (error) throw error;
        toast.success(`Contra posted: ₹${transferData.amount.toLocaleString()} transferred.`);
        await queryClient.invalidateQueries({ queryKey: ["bank_transactions", user.id] });
    };

    const handleDeleteTransaction = async (txId: string) => {
        if (!user?.id) return;
        const confirmDelete = window.confirm("Are you sure you want to delete this ledger transaction?");
        if (!confirmDelete) return;

        try {
            const { error } = await (supabase as any)
                .from("bank_transactions")
                .delete()
                .eq("id", txId)
                .eq("user_id", user.id);

            if (error) throw error;
            toast.success("Transaction removed from ledger.");
            await queryClient.invalidateQueries({ queryKey: ["bank_transactions", user.id] });
        } catch (err: any) {
            toast.error(err.message || "Failed to delete transaction.");
        }
    };

    const handleToggleReconciliation = async (txId: string, isReconciled: boolean) => {
        if (!user?.id) return;
        try {
            const { error } = await (supabase as any)
                .from("bank_transactions")
                .update({
                    is_reconciled: isReconciled,
                    reconciled_at: isReconciled ? new Date().toISOString() : null
                })
                .eq("id", txId)
                .eq("user_id", user.id);

            if (error) throw error;
            toast.success(isReconciled ? "Marked as Reconciled." : "Reconciliation reset.");
            await queryClient.invalidateQueries({ queryKey: ["bank_transactions", user.id] });
        } catch (err: any) {
            toast.error(err.message || "Failed to update reconciliation state.");
        }
    };

    // ─── 9. ACTIONS: STATEMENT IMPORT & AUTO-MATCH ────────────────────────────
    const handleImportStatement = async (accountId: string, parsed: ParsedStatementResult) => {
        if (!user?.id) return;

        // 1. Insert import batch header
        const importId = crypto.randomUUID();
        const importRow = {
            id: importId,
            user_id: user.id,
            account_id: accountId,
            filename: parsed.filename,
            total_lines: parsed.lines.length,
            opening_balance: parsed.openingBalance || null,
            closing_balance: parsed.closingBalance || null,
            start_date: parsed.startDate || null,
            end_date: parsed.endDate || null
        };

        const { error: importErr } = await (supabase as any)
            .from("bank_statement_imports")
            .insert(importRow);

        if (importErr) throw importErr;

        // 2. Insert statement lines
        const linesRows = parsed.lines.map(l => ({
            id: crypto.randomUUID(),
            import_id: importId,
            user_id: user.id,
            account_id: accountId,
            date: l.date,
            narration: l.narration,
            reference_no: l.referenceNo || null,
            withdrawal: l.withdrawal,
            deposit: l.deposit,
            balance: l.balance !== undefined ? l.balance : null,
            status: "unmatched"
        }));

        const { error: linesErr } = await (supabase as any)
            .from("bank_statement_lines")
            .insert(linesRows);

        if (linesErr) throw linesErr;

        await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", user.id] });
        setActiveTab("reconcile");
    };

    const handleApplyAutoMatches = async (matches: { txId: string; stmtLineId: string }[]) => {
        if (!user?.id) return;
        const now = new Date().toISOString();

        for (const m of matches) {
            // Update transaction
            await (supabase as any)
                .from("bank_transactions")
                .update({
                    is_reconciled: true,
                    reconciled_at: now,
                    matched_statement_line_id: m.stmtLineId
                })
                .eq("id", m.txId)
                .eq("user_id", user.id);

            // Update statement line
            await (supabase as any)
                .from("bank_statement_lines")
                .update({
                    status: "matched",
                    matched_tx_id: m.txId,
                    matched_at: now
                })
                .eq("id", m.stmtLineId)
                .eq("user_id", user.id);
        }

        await queryClient.invalidateQueries({ queryKey: ["bank_transactions", user.id] });
        await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", user.id] });
    };

    const handleCreateTxFromStatementLine = async (line: BankStatementLine, category: string) => {
        if (!user?.id) return;

        const isDeposit = line.deposit > 0;
        const amount = isDeposit ? line.deposit : line.withdrawal;
        const newTxId = crypto.randomUUID();
        const now = new Date().toISOString();

        // 1. Insert into general ledger
        const txRow = {
            id: newTxId,
            user_id: user.id,
            account_id: line.accountId,
            date: line.date,
            type: isDeposit ? "deposit" : "withdrawal",
            amount,
            category,
            payment_mode: "Bank Feed",
            reference_no: line.referenceNo || `STMT-${Date.now()}`,
            description: line.narration,
            is_reconciled: true,
            reconciled_at: now,
            matched_statement_line_id: line.id
        };

        const { error: txErr } = await (supabase as any)
            .from("bank_transactions")
            .insert(txRow);

        if (txErr) throw txErr;

        // 2. Mark statement line as created_in_ledger
        const { error: lineErr } = await (supabase as any)
            .from("bank_statement_lines")
            .update({
                status: "created_in_ledger",
                matched_tx_id: newTxId,
                matched_at: now
            })
            .eq("id", line.id)
            .eq("user_id", user.id);

        if (lineErr) throw lineErr;

        await queryClient.invalidateQueries({ queryKey: ["bank_transactions", user.id] });
        await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", user.id] });
    };

    const handleGenerateSampleFeed = async () => {
        if (!user?.id || accounts.length === 0) {
            toast.error("Please add at least one bank account first.");
            return;
        }

        const targetAcc = (reconcileSelectedAccountId && reconcileSelectedAccountId !== "all")
            ? accounts.find(a => a.id === reconcileSelectedAccountId) || accounts[0]
            : accounts[0];

        const importId = crypto.randomUUID();
        const todayStr = format(new Date(), "yyyy-MM-dd");

        const importRow = {
            id: importId,
            user_id: user.id,
            account_id: targetAcc.id,
            filename: `Sample_${targetAcc.bankName}_Statement.csv`,
            total_lines: 3,
            opening_balance: targetAcc.initialBalance,
            closing_balance: targetAcc.initialBalance + 5000,
            start_date: todayStr,
            end_date: todayStr
        };

        const { error: impErr } = await (supabase as any).from("bank_statement_imports").insert(importRow);
        if (impErr) {
            console.error("Failed to insert sample import header:", impErr);
        }

        const unreconciledTxs = transactions.filter(t => t.accountId === targetAcc.id && !t.isReconciled);
        const sampleLines: any[] = [];

        if (unreconciledTxs.length > 0) {
            unreconciledTxs.slice(0, 3).forEach(tx => {
                sampleLines.push({
                    id: crypto.randomUUID(),
                    import_id: importId,
                    user_id: user.id,
                    account_id: targetAcc.id,
                    date: tx.date,
                    narration: `${targetAcc.bankName.toUpperCase()} CLEARING REF ${tx.referenceNo} - ${tx.description.toUpperCase()}`,
                    reference_no: tx.referenceNo,
                    withdrawal: tx.type === "withdrawal" ? tx.amount : 0,
                    deposit: tx.type === "deposit" ? tx.amount : 0,
                    balance: targetAcc.initialBalance,
                    status: "unmatched"
                });
            });
        } else {
            const sampleRef1 = "UTR" + Math.floor(1000000000 + Math.random() * 9000000000);
            const sampleRef2 = "INT" + Math.floor(100000 + Math.random() * 900000);
            const sampleRef3 = "CHG" + Math.floor(100000 + Math.random() * 900000);

            sampleLines.push(
                {
                    id: crypto.randomUUID(),
                    import_id: importId,
                    user_id: user.id,
                    account_id: targetAcc.id,
                    date: todayStr,
                    narration: `UPI/INWARD/CLIENTPAY/${sampleRef1}`,
                    reference_no: sampleRef1,
                    withdrawal: 0,
                    deposit: 15000,
                    balance: targetAcc.initialBalance + 15000,
                    status: "unmatched"
                },
                {
                    id: crypto.randomUUID(),
                    import_id: importId,
                    user_id: user.id,
                    account_id: targetAcc.id,
                    date: todayStr,
                    narration: "QUARTERLY SAVINGS BANK INTEREST CR",
                    reference_no: sampleRef2,
                    withdrawal: 0,
                    deposit: 450,
                    balance: targetAcc.initialBalance + 15450,
                    status: "unmatched"
                },
                {
                    id: crypto.randomUUID(),
                    import_id: importId,
                    user_id: user.id,
                    account_id: targetAcc.id,
                    date: todayStr,
                    narration: "SMS CHARGES & CONSOLIDATED AUDIT FEE DR",
                    reference_no: sampleRef3,
                    withdrawal: 17.70,
                    deposit: 0,
                    balance: targetAcc.initialBalance + 15432.30,
                    status: "unmatched"
                }
            );
        }

        const { error: lineErr } = await (supabase as any).from("bank_statement_lines").insert(sampleLines);
        if (lineErr) throw lineErr;

        toast.success(`Generated ${sampleLines.length} test statement feeds for ${targetAcc.bankName}!`);
        await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", user.id] });
    };

    const handleClearStatementFeeds = async () => {
        if (!user?.id) return;
        const confirmClear = window.confirm("Are you sure you want to clear all statement feeds from workspace?");
        if (!confirmClear) return;

        try {
            await (supabase as any).from("bank_statement_lines").delete().eq("user_id", user.id);
            await (supabase as any).from("bank_statement_imports").delete().eq("user_id", user.id);
            toast.success("Statement feeds cleared.");
            await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", user.id] });
        } catch (err: any) {
            toast.error(err.message || "Failed to clear statement feeds.");
        }
    };

    // ─── 10. ACTIONS: CHEQUES & PDCs ──────────────────────────────────────────
    const handleCreateCheque = async (chequeData: Partial<ChequeRecord>) => {
        if (!user?.id) return;

        const newRow = {
            user_id: user.id,
            account_id: chequeData.accountId,
            cheque_type: chequeData.chequeType,
            cheque_number: chequeData.chequeNumber,
            party_name: chequeData.partyName,
            amount: chequeData.amount,
            issue_date: chequeData.issueDate,
            due_date: chequeData.dueDate,
            bank_name: chequeData.bankName || null,
            status: "pending",
            notes: chequeData.notes || null
        };

        const { error } = await (supabase as any)
            .from("cheque_records")
            .insert(newRow);

        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["cheque_records", user.id] });
    };

    const handleUpdateChequeStatus = async (
        chequeId: string, 
        status: ChequeRecord["status"], 
        bounceReason?: string
    ) => {
        if (!user?.id) return;

        const { error } = await (supabase as any)
            .from("cheque_records")
            .update({
                status,
                bounce_reason: bounceReason || null,
                clearance_date: status === "cleared" ? format(new Date(), "yyyy-MM-dd") : null,
                updated_at: new Date().toISOString()
            })
            .eq("id", chequeId)
            .eq("user_id", user.id);

        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["cheque_records", user.id] });
    };

    const handleClearCheque = async (cheque: ChequeRecord) => {
        if (!user?.id) return;

        const isReceived = cheque.chequeType === "received";
        const txId = crypto.randomUUID();
        const clearanceDate = format(new Date(), "yyyy-MM-dd");

        // 1. Post to bank general ledger
        const txRow = {
            id: txId,
            user_id: user.id,
            account_id: cheque.accountId,
            date: clearanceDate,
            type: isReceived ? "deposit" : "withdrawal",
            amount: cheque.amount,
            category: isReceived ? "Customer Payment" : "Vendor Payment",
            payment_mode: "Cheque",
            reference_no: `CHQ-${cheque.chequeNumber}`,
            party_name: cheque.partyName,
            description: `Cheque #${cheque.chequeNumber} cleared (${cheque.partyName})`,
            is_reconciled: false,
            linked_cheque_id: cheque.id
        };

        const { error: txErr } = await (supabase as any)
            .from("bank_transactions")
            .insert(txRow);

        if (txErr) throw txErr;

        // 2. Mark cheque as cleared
        const { error: chqErr } = await (supabase as any)
            .from("cheque_records")
            .update({
                status: "cleared",
                clearance_date: clearanceDate,
                linked_transaction_id: txId,
                updated_at: new Date().toISOString()
            })
            .eq("id", cheque.id)
            .eq("user_id", user.id);

        if (chqErr) throw chqErr;

        toast.success(`Cheque #${cheque.chequeNumber} cleared and posted to bank ledger!`);
        await queryClient.invalidateQueries({ queryKey: ["cheque_records", user.id] });
        await queryClient.invalidateQueries({ queryKey: ["bank_transactions", user.id] });
    };

    return (
        <AppLayout>
            <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6 animate-fade-in pb-16">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground tracking-tight">
                            <Landmark className="w-6 h-6 text-primary" />
                            Business Banking & Treasury Hub
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1">
                            Double-entry general ledger, multi-bank passbooks, CTS-2010 cheque clearance, and real statement reconciliation.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button 
                            onClick={() => setIsContraModalOpen(true)} 
                            variant="outline"
                            className="rounded-xl text-xs font-bold gap-1.5 h-9"
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
                            Contra Transfer (F4)
                        </Button>

                        <Button 
                            onClick={() => {
                                setTxModalType("deposit");
                                setTxModalAccountId(undefined);
                                setIsTxModalOpen(true);
                            }} 
                            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Receive (Credit)
                        </Button>

                        <Button 
                            onClick={() => {
                                setTxModalType("withdrawal");
                                setTxModalAccountId(undefined);
                                setIsTxModalOpen(true);
                            }} 
                            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Pay (Debit)
                        </Button>

                        <Button 
                            onClick={() => {
                                setEditingAccount(null);
                                setIsAccountModalOpen(true);
                            }} 
                            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary hover:bg-primary/90 text-white"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Account
                        </Button>
                    </div>
                </div>

                {/* Top KPI Header */}
                <BankKPIHeader
                    totalLiquidAssets={totalLiquidAssets}
                    inflow30Days={stats30Days.inbound}
                    outflow30Days={stats30Days.outbound}
                    pendingChequesCount={pendingCheques.count}
                    pendingChequesAmount={pendingCheques.amount}
                    unreconciledCount={unreconciledStatementLinesCount}
                    onGoToReconciliation={() => setActiveTab("reconcile")}
                    onGoToCheques={() => setActiveTab("cheques")}
                />

                {/* Main Content Workspace Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
                    <TabsList className="bg-muted p-1 rounded-xl w-full max-w-2xl grid grid-cols-5">
                        <TabsTrigger value="accounts" className="rounded-lg text-xs py-1.5 font-semibold">
                            Bank Accounts
                        </TabsTrigger>
                        <TabsTrigger value="ledger" className="rounded-lg text-xs py-1.5 font-semibold">
                            Passbook Ledger
                        </TabsTrigger>
                        <TabsTrigger value="reconcile" className="rounded-lg text-xs py-1.5 font-semibold">
                            Reconcile (BRS)
                        </TabsTrigger>
                        <TabsTrigger value="cheques" className="rounded-lg text-xs py-1.5 font-semibold">
                            Cheques & PDCs
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-lg text-xs py-1.5 font-semibold">
                            Analytics
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: ACCOUNTS REGISTER */}
                    <TabsContent value="accounts" className="space-y-4 outline-none">
                        {/* UPI Payment Configuration Banner */}
                        <div className="bg-card border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:center justify-between gap-4 shadow-xs">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <QrCode className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-foreground">Merchant UPI & Scan-to-Pay QR</h3>
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-primary border-primary/20 bg-primary/5">
                                            Printed on Invoices
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {upiId ? (
                                            <span>Active UPI ID: <span className="font-mono font-bold text-foreground">{upiId}</span></span>
                                        ) : (
                                            "Add your business UPI ID to generate scan-and-pay Dynamic QR codes on customer tax invoices."
                                        )}
                                    </p>
                                </div>
                            </div>

                            {isEditingUpi ? (
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Input 
                                        value={upiInputVal}
                                        onChange={(e) => setUpiInputVal(e.target.value)}
                                        placeholder="e.g. storename@okaxis"
                                        className="h-8 text-xs font-mono w-full sm:w-60 rounded-lg"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveUpi();
                                            if (e.key === 'Escape') setIsEditingUpi(false);
                                        }}
                                        autoFocus
                                    />
                                    <Button size="sm" onClick={handleSaveUpi} className="h-8 text-xs px-3 rounded-lg">
                                        Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingUpi(false)} className="h-8 text-xs px-2 rounded-lg">
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => {
                                        setUpiInputVal(upiId);
                                        setIsEditingUpi(true);
                                    }}
                                    className="h-8 text-xs rounded-xl font-semibold gap-1.5 shrink-0"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    {upiId ? "Change UPI ID" : "Set UPI ID"}
                                </Button>
                            )}
                        </div>

                        {/* Visual Bank Accounts Grid */}
                        <BankAccountsGrid
                            accounts={accounts}
                            balances={accountBalances}
                            onAddAccount={() => {
                                setEditingAccount(null);
                                setIsAccountModalOpen(true);
                            }}
                            onEditAccount={(acc) => {
                                setEditingAccount(acc);
                                setIsAccountModalOpen(true);
                            }}
                            onDeleteAccount={handleDeleteAccount}
                            onSetDefault={handleSetDefault}
                            onDeposit={(accId) => {
                                setTxModalType("deposit");
                                setTxModalAccountId(accId);
                                setIsTxModalOpen(true);
                            }}
                            onWithdraw={(accId) => {
                                setTxModalType("withdrawal");
                                setTxModalAccountId(accId);
                                setIsTxModalOpen(true);
                            }}
                        />
                    </TabsContent>

                    {/* TAB 2: PASSBOOK LEDGER */}
                    <TabsContent value="ledger" className="space-y-4 outline-none">
                        <BankLedgerPassbook
                            accounts={accounts}
                            transactions={transactions}
                            onDeleteTransaction={handleDeleteTransaction}
                            onToggleReconciliation={handleToggleReconciliation}
                        />
                    </TabsContent>

                    {/* TAB 3: RECONCILIATION WORKSPACE (BRS) */}
                    <TabsContent value="reconcile" className="space-y-4 outline-none">
                        <BankReconciliationWorkspace
                            accounts={accounts}
                            transactions={transactions}
                            statementLines={statementLines}
                            selectedAccountId={reconcileSelectedAccountId}
                            onSelectAccount={setReconcileSelectedAccountId}
                            onOpenImportModal={() => setIsStatementImportOpen(true)}
                            onToggleReconciliation={handleToggleReconciliation}
                            onApplyAutoMatches={handleApplyAutoMatches}
                            onCreateTxFromStatementLine={handleCreateTxFromStatementLine}
                            onGenerateSampleFeed={handleGenerateSampleFeed}
                            onClearStatementFeeds={handleClearStatementFeeds}
                        />
                    </TabsContent>

                    {/* TAB 4: CHEQUES & PDCs */}
                    <TabsContent value="cheques" className="space-y-4 outline-none">
                        <ChequeTrackerTab
                            accounts={accounts}
                            cheques={cheques}
                            onCreateCheque={handleCreateCheque}
                            onUpdateChequeStatus={handleUpdateChequeStatus}
                            onClearCheque={handleClearCheque}
                        />
                    </TabsContent>

                    {/* TAB 5: ANALYTICS & LIQUIDITY */}
                    <TabsContent value="analytics" className="space-y-4 outline-none">
                        <BankAnalyticsTab
                            accounts={accounts}
                            transactions={transactions}
                            balances={accountBalances}
                        />
                    </TabsContent>
                </Tabs>

                {/* MODAL: ADD / EDIT BANK ACCOUNT */}
                <BankAccountModal
                    isOpen={isAccountModalOpen}
                    onClose={() => {
                        setIsAccountModalOpen(false);
                        setEditingAccount(null);
                    }}
                    onSave={handleSaveAccount}
                    editingAccount={editingAccount}
                />

                {/* MODAL: RECORD INWARD / OUTWARD TRANSACTION */}
                <RecordTransactionModal
                    isOpen={isTxModalOpen}
                    onClose={() => setIsTxModalOpen(false)}
                    onSave={handleRecordTransaction}
                    accounts={accounts}
                    initialType={txModalType}
                    initialAccountId={txModalAccountId}
                />

                {/* MODAL: CONTRA TRANSFER (F4) */}
                <ContraTransferModal
                    isOpen={isContraModalOpen}
                    onClose={() => setIsContraModalOpen(false)}
                    onTransfer={handleContraTransfer}
                    accounts={accounts}
                    balances={accountBalances}
                />

                {/* MODAL: IMPORT REAL STATEMENT (EXCEL / CSV) */}
                <StatementImportModal
                    isOpen={isStatementImportOpen}
                    onClose={() => setIsStatementImportOpen(false)}
                    accounts={accounts}
                    onImportSuccess={handleImportStatement}
                />

            </div>
        </AppLayout>
    );
};

export default BankDetailsPage;