import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { subDays, isAfter, parseISO, format } from "date-fns";
import { toast } from "sonner";
import {
  BankAccount,
  BankTransaction,
  BankStatementLine,
  ChequeRecord,
  AccountType,
} from "../components/types";

export function useBankingData(userId: string | undefined) {
  const queryClient = useQueryClient();

  // UPI Configuration State
  const [upiId, setUpiId] = useState<string>(
    () => localStorage.getItem("rupeebill_upi_id") || ""
  );
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [upiInputVal, setUpiInputVal] = useState("");

  // 1. Fetch Bank Accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<BankAccount[]>({
    queryKey: ["bank_accounts", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("bank_accounts")
          .select("*")
          .eq("user_id", userId)
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
            notes: row.notes || undefined,
          }));

          // Keep local mirror updated for synchronous PDF generation in invoices & PrintStudio
          try {
            localStorage.setItem(`finflow_bank_accounts_${userId}`, JSON.stringify(mapped));
          } catch {}

          return mapped;
        }
      } catch (err) {
        console.error("[BankDetails] Error fetching bank accounts:", err);
      }

      // Fallback from cache if offline
      try {
        const cached = localStorage.getItem(`finflow_bank_accounts_${userId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
      return [];
    },
    enabled: !!userId,
  });

  // 2. Fetch Bank Transactions (General Ledger)
  const { data: transactions = [], isLoading: isLoadingTxs } = useQuery<BankTransaction[]>({
    queryKey: ["bank_transactions", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("bank_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          // Auto-migration check: If Supabase table is empty but localStorage has transactions, migrate them!
          if (data.length === 0) {
            try {
              const localSaved = localStorage.getItem(`finflow_txs_${userId}`);
              if (localSaved) {
                const parsed = JSON.parse(localSaved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  const rowsToInsert = parsed
                    .map((item: any) => ({
                      id: item.id || crypto.randomUUID(),
                      user_id: userId,
                      account_id: item.accountId,
                      date: item.date || format(new Date(), "yyyy-MM-dd"),
                      type: item.type || "deposit",
                      amount: Number(item.amount) || 0,
                      category: item.category || "Sales Revenue",
                      payment_mode: "NEFT",
                      reference_no: item.referenceId || `MIG-${Date.now()}`,
                      description: item.description || "Migrated entry",
                      is_reconciled: Boolean(item.isReconciled),
                    }))
                    .filter((r: any) => accounts.some((a) => a.id === r.account_id));

                  if (rowsToInsert.length > 0) {
                    await (supabase as any).from("bank_transactions").insert(rowsToInsert);
                    localStorage.removeItem(`finflow_txs_${userId}`);
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
                      isReconciled: r.is_reconciled,
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
            updatedAt: row.updated_at,
          }));
        }
      } catch (err) {
        console.error("[BankDetails] Error fetching bank transactions:", err);
      }
      return [];
    },
    enabled: !!userId && accounts.length > 0,
  });

  // 3. Fetch Bank Statement Lines (For BRS)
  const { data: statementLines = [], isLoading: isLoadingStatementLines } = useQuery<
    BankStatementLine[]
  >({
    queryKey: ["bank_statement_lines", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("bank_statement_lines")
          .select("*")
          .eq("user_id", userId)
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
            balance:
              r.balance !== null && r.balance !== undefined ? Number(r.balance) : undefined,
            status: r.status,
            matchedTxId: r.matched_tx_id || undefined,
            matchedAt: r.matched_at || undefined,
          }));
        }
      } catch (err) {
        console.error("[BankDetails] Error fetching statement lines:", err);
      }
      return [];
    },
    enabled: !!userId,
  });

  // 4. Fetch Cheque Records
  const { data: cheques = [], isLoading: isLoadingCheques } = useQuery<ChequeRecord[]>({
    queryKey: ["cheque_records", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("cheque_records")
          .select("*")
          .eq("user_id", userId)
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
            notes: r.notes || undefined,
          }));
        }
      } catch (err) {
        console.error("[BankDetails] Error fetching cheque records:", err);
      }
      return [];
    },
    enabled: !!userId,
  });

  // 5. Profile & UPI Sync
  const { data: profile } = useQuery({
    queryKey: ["profile_bank_page", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("upi_id, bank_name, bank_account_no, bank_ifsc, bank_branch")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
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

    if (userId) {
      try {
        await (supabase as any)
          .from("profiles")
          .update({ upi_id: val || null })
          .eq("user_id", userId);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["profile_bank_page"] });
        toast.success("Merchant UPI ID saved!");
      } catch (err) {
        console.error("Failed to save UPI ID", err);
      }
    }
  };

  // 6. Computed Balances & Metrics
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach((a) => {
      balances[a.id] = Number(a.initialBalance) || 0;
    });

    transactions.forEach((tx) => {
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

    transactions.forEach((t) => {
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
    const pending = cheques.filter(
      (c) => c.status === "pending" || c.status === "deposited"
    );
    return {
      count: pending.length,
      amount: pending.reduce((sum, c) => sum + c.amount, 0),
    };
  }, [cheques]);

  const unreconciledStatementLinesCount = useMemo(() => {
    return statementLines.filter((l) => l.status === "unmatched").length;
  }, [statementLines]);

  return {
    accounts,
    isLoadingAccounts,
    transactions,
    isLoadingTxs,
    statementLines,
    isLoadingStatementLines,
    cheques,
    isLoadingCheques,
    profile,
    upiId,
    isEditingUpi,
    setIsEditingUpi,
    upiInputVal,
    setUpiInputVal,
    handleSaveUpi,
    accountBalances,
    totalLiquidAssets,
    stats30Days,
    pendingCheques,
    unreconciledStatementLinesCount,
  };
}
