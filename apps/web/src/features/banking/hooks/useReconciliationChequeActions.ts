import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  BankAccount,
  BankTransaction,
  BankStatementLine,
  ChequeRecord,
} from "../components/types";
import { ParsedStatementResult } from "../services/statementParser";

interface UseReconciliationChequeActionsOptions {
  userId: string | undefined;
  accounts: BankAccount[];
  transactions: BankTransaction[];
  reconcileSelectedAccountId: string;
  setActiveTab: (tab: string) => void;
}

export function useReconciliationChequeActions({
  userId,
  accounts,
  transactions,
  reconcileSelectedAccountId,
  setActiveTab,
}: UseReconciliationChequeActionsOptions) {
  const queryClient = useQueryClient();

  const handleImportStatement = async (
    accountId: string,
    parsed: ParsedStatementResult
  ) => {
    if (!userId) return;

    // 1. Insert import batch header
    const importId = crypto.randomUUID();
    const importRow = {
      id: importId,
      user_id: userId,
      account_id: accountId,
      filename: parsed.filename,
      total_lines: parsed.lines.length,
      opening_balance: parsed.openingBalance || null,
      closing_balance: parsed.closingBalance || null,
      start_date: parsed.startDate || null,
      end_date: parsed.endDate || null,
    };

    const { error: importErr } = await (supabase as any)
      .from("bank_statement_imports")
      .insert(importRow);

    if (importErr) throw importErr;

    // 2. Insert statement lines
    const linesRows = parsed.lines.map((l) => ({
      id: crypto.randomUUID(),
      import_id: importId,
      user_id: userId,
      account_id: accountId,
      date: l.date,
      narration: l.narration,
      reference_no: l.referenceNo || null,
      withdrawal: l.withdrawal,
      deposit: l.deposit,
      balance: l.balance !== undefined ? l.balance : null,
      status: "unmatched",
    }));

    const { error: linesErr } = await (supabase as any)
      .from("bank_statement_lines")
      .insert(linesRows);

    if (linesErr) throw linesErr;

    await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", userId] });
    setActiveTab("reconcile");
  };

  const handleApplyAutoMatches = async (
    matches: { txId: string; stmtLineId: string }[]
  ) => {
    if (!userId) return;
    const now = new Date().toISOString();

    for (const m of matches) {
      // Update transaction
      await (supabase as any)
        .from("bank_transactions")
        .update({
          is_reconciled: true,
          reconciled_at: now,
          matched_statement_line_id: m.stmtLineId,
        })
        .eq("id", m.txId)
        .eq("user_id", userId);

      // Update statement line
      await (supabase as any)
        .from("bank_statement_lines")
        .update({
          status: "matched",
          matched_tx_id: m.txId,
          matched_at: now,
        })
        .eq("id", m.stmtLineId)
        .eq("user_id", userId);
    }

    await queryClient.invalidateQueries({ queryKey: ["bank_transactions", userId] });
    await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", userId] });
  };

  const handleCreateTxFromStatementLine = async (
    line: BankStatementLine,
    category: string
  ) => {
    if (!userId) return;

    const isDeposit = line.deposit > 0;
    const amount = isDeposit ? line.deposit : line.withdrawal;
    const newTxId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Insert into general ledger
    const txRow = {
      id: newTxId,
      user_id: userId,
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
      matched_statement_line_id: line.id,
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
        matched_at: now,
      })
      .eq("id", line.id)
      .eq("user_id", userId);

    if (lineErr) throw lineErr;

    await queryClient.invalidateQueries({ queryKey: ["bank_transactions", userId] });
    await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", userId] });
  };

  const handleGenerateSampleFeed = async () => {
    if (!userId || accounts.length === 0) {
      toast.error("Please add at least one bank account first.");
      return;
    }

    const targetAcc =
      reconcileSelectedAccountId && reconcileSelectedAccountId !== "all"
        ? accounts.find((a) => a.id === reconcileSelectedAccountId) || accounts[0]
        : accounts[0];

    const importId = crypto.randomUUID();
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const importRow = {
      id: importId,
      user_id: userId,
      account_id: targetAcc.id,
      filename: `Sample_${targetAcc.bankName}_Statement.csv`,
      total_lines: 3,
      opening_balance: targetAcc.initialBalance,
      closing_balance: targetAcc.initialBalance + 5000,
      start_date: todayStr,
      end_date: todayStr,
    };

    const { error: impErr } = await (supabase as any)
      .from("bank_statement_imports")
      .insert(importRow);
    if (impErr) {
      console.error("Failed to insert sample import header:", impErr);
    }

    const unreconciledTxs = transactions.filter(
      (t) => t.accountId === targetAcc.id && !t.isReconciled
    );
    const sampleLines: any[] = [];

    if (unreconciledTxs.length > 0) {
      unreconciledTxs.slice(0, 3).forEach((tx) => {
        sampleLines.push({
          id: crypto.randomUUID(),
          import_id: importId,
          user_id: userId,
          account_id: targetAcc.id,
          date: tx.date,
          narration: `${targetAcc.bankName.toUpperCase()} CLEARING REF ${tx.referenceNo} - ${tx.description.toUpperCase()}`,
          reference_no: tx.referenceNo,
          withdrawal: tx.type === "withdrawal" ? tx.amount : 0,
          deposit: tx.type === "deposit" ? tx.amount : 0,
          balance: targetAcc.initialBalance,
          status: "unmatched",
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
          user_id: userId,
          account_id: targetAcc.id,
          date: todayStr,
          narration: `UPI/INWARD/CLIENTPAY/${sampleRef1}`,
          reference_no: sampleRef1,
          withdrawal: 0,
          deposit: 15000,
          balance: targetAcc.initialBalance + 15000,
          status: "unmatched",
        },
        {
          id: crypto.randomUUID(),
          import_id: importId,
          user_id: userId,
          account_id: targetAcc.id,
          date: todayStr,
          narration: "QUARTERLY SAVINGS BANK INTEREST CR",
          reference_no: sampleRef2,
          withdrawal: 0,
          deposit: 450,
          balance: targetAcc.initialBalance + 15450,
          status: "unmatched",
        },
        {
          id: crypto.randomUUID(),
          import_id: importId,
          user_id: userId,
          account_id: targetAcc.id,
          date: todayStr,
          narration: "SMS CHARGES & CONSOLIDATED AUDIT FEE DR",
          reference_no: sampleRef3,
          withdrawal: 17.7,
          deposit: 0,
          balance: targetAcc.initialBalance + 15432.3,
          status: "unmatched",
        }
      );
    }

    const { error: lineErr } = await (supabase as any)
      .from("bank_statement_lines")
      .insert(sampleLines);
    if (lineErr) throw lineErr;

    toast.success(
      `Generated ${sampleLines.length} test statement feeds for ${targetAcc.bankName}!`
    );
    await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", userId] });
  };

  const handleClearStatementFeeds = async () => {
    if (!userId) return;
    const confirmClear = window.confirm(
      "Are you sure you want to clear all statement feeds from workspace?"
    );
    if (!confirmClear) return;

    try {
      await (supabase as any).from("bank_statement_lines").delete().eq("user_id", userId);
      await (supabase as any).from("bank_statement_imports").delete().eq("user_id", userId);
      toast.success("Statement feeds cleared.");
      await queryClient.invalidateQueries({ queryKey: ["bank_statement_lines", userId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to clear statement feeds.");
    }
  };

  // Cheque Actions
  const handleCreateCheque = async (chequeData: Partial<ChequeRecord>) => {
    if (!userId) return;

    const newRow = {
      user_id: userId,
      account_id: chequeData.accountId,
      cheque_type: chequeData.chequeType,
      cheque_number: chequeData.chequeNumber,
      party_name: chequeData.partyName,
      amount: chequeData.amount,
      issue_date: chequeData.issueDate,
      due_date: chequeData.dueDate,
      bank_name: chequeData.bankName || null,
      status: "pending",
      notes: chequeData.notes || null,
    };

    const { error } = await (supabase as any)
      .from("cheque_records")
      .insert(newRow);

    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["cheque_records", userId] });
  };

  const handleUpdateChequeStatus = async (
    chequeId: string,
    status: ChequeRecord["status"],
    bounceReason?: string
  ) => {
    if (!userId) return;

    const { error } = await (supabase as any)
      .from("cheque_records")
      .update({
        status,
        bounce_reason: bounceReason || null,
        clearance_date: status === "cleared" ? format(new Date(), "yyyy-MM-dd") : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chequeId)
      .eq("user_id", userId);

    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["cheque_records", userId] });
  };

  const handleClearCheque = async (cheque: ChequeRecord) => {
    if (!userId) return;

    const isReceived = cheque.chequeType === "received";
    const txId = crypto.randomUUID();
    const clearanceDate = format(new Date(), "yyyy-MM-dd");

    // 1. Post to bank general ledger
    const txRow = {
      id: txId,
      user_id: userId,
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
      linked_cheque_id: cheque.id,
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", cheque.id)
      .eq("user_id", userId);

    if (chqErr) throw chqErr;

    toast.success(
      `Cheque #${cheque.chequeNumber} cleared and posted to bank ledger!`
    );
    await queryClient.invalidateQueries({ queryKey: ["cheque_records", userId] });
    await queryClient.invalidateQueries({ queryKey: ["bank_transactions", userId] });
  };

  return {
    handleImportStatement,
    handleApplyAutoMatches,
    handleCreateTxFromStatementLine,
    handleGenerateSampleFeed,
    handleClearStatementFeeds,
    handleCreateCheque,
    handleUpdateChequeStatus,
    handleClearCheque,
  };
}
