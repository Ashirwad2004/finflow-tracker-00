import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { BankAccount, BankTransaction, AccountType } from "./types";
import { BankAccountFormData, BankTransactionFormData } from "./schemas";
import { toast } from "sonner";

export const bankingKeys = {
  all: ["banking"] as const,
  accounts: (userId?: string) => [...bankingKeys.all, "accounts", userId] as const,
  transactions: (userId?: string, accountId?: string) =>
    [...bankingKeys.all, "transactions", userId, accountId || "all"] as const,
  cheques: (userId?: string) => [...bankingKeys.all, "cheques", userId] as const,
};

export function useBankAccountsQuery() {
  const { user } = useAuth();

  return useQuery<BankAccount[]>({
    queryKey: bankingKeys.accounts(user?.id),
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
            notes: row.notes || undefined,
          }));

          try {
            localStorage.setItem(`finflow_bank_accounts_${user.id}`, JSON.stringify(mapped));
          } catch {}

          return mapped;
        }
      } catch (err) {
        console.error("[bankingApi] Error fetching bank accounts:", err);
      }

      try {
        const cached = localStorage.getItem(`finflow_bank_accounts_${user?.id}`);
        if (cached) return JSON.parse(cached);
      } catch {}
      return [];
    },
    enabled: !!user?.id,
  });
}

export function useBankTransactionsQuery(accountId?: string) {
  const { user } = useAuth();

  return useQuery<BankTransaction[]>({
    queryKey: bankingKeys.transactions(user?.id, accountId),
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        let query = (supabase as any)
          .from("bank_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });

        if (accountId && accountId !== "all") {
          query = query.eq("account_id", accountId);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return data.map((row: any) => ({
            id: row.id,
            accountId: row.account_id,
            date: row.date,
            type: row.type,
            amount: Number(row.amount) || 0,
            category: row.category || "Other",
            paymentMode: row.payment_mode || "Other",
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
        console.error("[bankingApi] Error fetching bank transactions:", err);
      }
      return [];
    },
    enabled: !!user?.id,
  });
}

export function useSaveBankAccountMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: BankAccountFormData & { id?: string }) => {
      if (!user?.id) throw new Error("User must be logged in");

      const dbPayload = {
        user_id: user.id,
        bank_name: payload.bankName,
        account_number: payload.accountNumber,
        ifsc_code: payload.ifscCode.toUpperCase(),
        branch_name: payload.branchName || "",
        is_default: payload.isDefault || false,
        account_type: payload.accountType,
        initial_balance: payload.initialBalance,
        od_limit: payload.odLimit || 0,
        upi_id: payload.upiId || null,
        color_theme: payload.colorTheme || "default",
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        const { data, error } = await (supabase as any)
          .from("bank_accounts")
          .update(dbPayload)
          .eq("id", payload.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from("bank_accounts")
          .insert({ ...dbPayload, is_archived: false })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts(user?.id) });
      toast.success("Bank account saved successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save bank account");
    },
  });
}
