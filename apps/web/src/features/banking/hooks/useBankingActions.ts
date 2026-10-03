import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { BankAccount, BankTransaction } from "../components/types";

interface UseBankingActionsOptions {
  userId: string | undefined;
  accounts: BankAccount[];
  editingAccount: BankAccount | null;
}

export function useBankingActions({
  userId,
  accounts,
  editingAccount,
}: UseBankingActionsOptions) {
  const queryClient = useQueryClient();

  const handleSaveAccount = async (accountData: Partial<BankAccount>) => {
    if (!userId) return;

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
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingAccount.id)
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Bank account updated successfully!");
    } else {
      // Insert
      const isFirst = accounts.length === 0;
      const newAccRow = {
        user_id: userId,
        bank_name: accountData.bankName,
        account_number: accountData.accountNumber,
        ifsc_code: accountData.ifscCode,
        branch_name: accountData.branchName,
        account_type: accountData.accountType,
        initial_balance: accountData.initialBalance || 0,
        od_limit: accountData.odLimit || 0,
        upi_id: accountData.upiId || null,
        is_default: isFirst ? true : Boolean(accountData.isDefault),
      };

      const { error } = await (supabase as any)
        .from("bank_accounts")
        .insert(newAccRow);

      if (error) throw error;
      toast.success("New bank book created successfully!");
    }

    await queryClient.invalidateQueries({ queryKey: ["bank_accounts", userId] });
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!userId) return;
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this bank account? All linked ledger transactions will also be archived."
    );
    if (!confirmDelete) return;

    try {
      const { error } = await (supabase as any)
        .from("bank_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Bank account removed.");
      await queryClient.invalidateQueries({ queryKey: ["bank_accounts", userId] });
      await queryClient.invalidateQueries({ queryKey: ["bank_transactions", userId] });
    } catch (err: any) {
      console.error("Delete account error:", err);
      toast.error(err.message || "Failed to remove account.");
    }
  };

  const handleSetDefault = async (accountId: string) => {
    if (!userId) return;
    try {
      // Unset all defaults
      await (supabase as any)
        .from("bank_accounts")
        .update({ is_default: false })
        .eq("user_id", userId);

      // Set chosen default
      const { error } = await (supabase as any)
        .from("bank_accounts")
        .update({ is_default: true })
        .eq("id", accountId)
        .eq("user_id", userId);

      if (error) throw error;

      // Sync to profile for invoices
      const target = accounts.find((a) => a.id === accountId);
      if (target) {
        await (supabase as any)
          .from("profiles")
          .update({
            bank_name: target.bankName,
            bank_account_no: target.accountNumber,
            bank_ifsc: target.ifscCode,
            bank_branch: target.branchName,
          })
          .eq("user_id", userId);
      }

      toast.success("Default bank account updated for printed invoices!");
      await queryClient.invalidateQueries({ queryKey: ["bank_accounts", userId] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["profile_bank_page"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to set default bank account.");
    }
  };

  const handleRecordTransaction = async (txData: Partial<BankTransaction>) => {
    if (!userId) return;

    const newRow = {
      user_id: userId,
      account_id: txData.accountId,
      date: txData.date || format(new Date(), "yyyy-MM-dd"),
      type: txData.type,
      amount: txData.amount,
      category: txData.category,
      payment_mode: txData.paymentMode || "NEFT",
      reference_no: txData.referenceNo,
      party_name: txData.partyName || null,
      description: txData.description,
      is_reconciled: Boolean(txData.isReconciled),
    };

    const { error } = await (supabase as any)
      .from("bank_transactions")
      .insert(newRow);

    if (error) throw error;
    toast.success(
      `Ledger posted: ${txData.type === "deposit" ? "+" : "-"}₹${txData.amount?.toLocaleString()}`
    );
    await queryClient.invalidateQueries({ queryKey: ["bank_transactions", userId] });
  };

  const handleContraTransfer = async (transferData: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    referenceNo: string;
    description: string;
  }) => {
    if (!userId) return;

    const sourceAcc = accounts.find((a) => a.id === transferData.fromAccountId);
    const destAcc = accounts.find((a) => a.id === transferData.toAccountId);

    const debitId = crypto.randomUUID();
    const creditId = crypto.randomUUID();

    const debitRow = {
      id: debitId,
      user_id: userId,
      account_id: transferData.fromAccountId,
      date: transferData.date,
      type: "withdrawal",
      amount: transferData.amount,
      category: "Transfer",
      payment_mode: "Net Banking",
      reference_no: transferData.referenceNo,
      description:
        transferData.description || `Contra transfer to ${destAcc?.bankName}`,
      transfer_to_account_id: transferData.toAccountId,
      linked_contra_tx_id: creditId,
      is_reconciled: false,
    };

    const creditRow = {
      id: creditId,
      user_id: userId,
      account_id: transferData.toAccountId,
      date: transferData.date,
      type: "deposit",
      amount: transferData.amount,
      category: "Transfer",
      payment_mode: "Net Banking",
      reference_no: transferData.referenceNo,
      description:
        transferData.description || `Contra transfer from ${sourceAcc?.bankName}`,
      transfer_to_account_id: transferData.fromAccountId,
      linked_contra_tx_id: debitId,
      is_reconciled: false,
    };

    const { error } = await (supabase as any)
      .from("bank_transactions")
      .insert([debitRow, creditRow]);

    if (error) throw error;
    toast.success(`Contra posted: ₹${transferData.amount.toLocaleString()} transferred.`);
    await queryClient.invalidateQueries({ queryKey: ["bank_transactions", userId] });
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!userId) return;
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this ledger transaction?"
    );
    if (!confirmDelete) return;

    try {
      const { error } = await (supabase as any)
        .from("bank_transactions")
        .delete()
        .eq("id", txId)
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Transaction removed from ledger.");
      await queryClient.invalidateQueries({ queryKey: ["bank_transactions", userId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete transaction.");
    }
  };

  const handleToggleReconciliation = async (
    txId: string,
    isReconciled: boolean
  ) => {
    if (!userId) return;
    try {
      const { error } = await (supabase as any)
        .from("bank_transactions")
        .update({
          is_reconciled: isReconciled,
          reconciled_at: isReconciled ? new Date().toISOString() : null,
        })
        .eq("id", txId)
        .eq("user_id", userId);

      if (error) throw error;
      toast.success(isReconciled ? "Marked as Reconciled." : "Reconciliation reset.");
      await queryClient.invalidateQueries({ queryKey: ["bank_transactions", userId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update reconciliation state.");
    }
  };

  return {
    handleSaveAccount,
    handleDeleteAccount,
    handleSetDefault,
    handleRecordTransaction,
    handleContraTransfer,
    handleDeleteTransaction,
    handleToggleReconciliation,
  };
}
