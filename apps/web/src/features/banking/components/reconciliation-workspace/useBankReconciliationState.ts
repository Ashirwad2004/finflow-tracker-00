import { useState, useMemo } from "react";
import { toast } from "sonner";
import { BankAccount, BankTransaction, BankStatementLine } from "../types";
import { computeAutoMatches, guessCategoryFromNarration } from "../../services/reconciliationEngine";

interface UseBankReconciliationStateProps {
  accounts: BankAccount[];
  transactions: BankTransaction[];
  statementLines: BankStatementLine[];
  selectedAccountId: string;
  onApplyAutoMatches: (matches: { txId: string; stmtLineId: string }[]) => Promise<void>;
  onCreateTxFromStatementLine: (line: BankStatementLine, category: string) => Promise<void>;
}

export function useBankReconciliationState({
  accounts,
  transactions,
  statementLines,
  selectedAccountId,
  onApplyAutoMatches,
  onCreateTxFromStatementLine,
}: UseBankReconciliationStateProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "unreconciled" | "reconciled">("unreconciled");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMatching, setIsMatching] = useState(false);

  // Active account
  const activeAccount = accounts.find((a) => a.id === selectedAccountId);

  // Filter transactions for this account
  const accountTxs = useMemo(() => {
    return transactions.filter(
      (t) => !selectedAccountId || selectedAccountId === "all" || t.accountId === selectedAccountId
    );
  }, [transactions, selectedAccountId]);

  // Filter statement lines for this account
  const accountLines = useMemo(() => {
    return statementLines.filter(
      (l) => !selectedAccountId || selectedAccountId === "all" || l.accountId === selectedAccountId
    );
  }, [statementLines, selectedAccountId]);

  // Ledger balance
  const ledgerBalance = useMemo(() => {
    let total = 0;
    if (selectedAccountId && selectedAccountId !== "all") {
      total = activeAccount ? activeAccount.initialBalance : 0;
    } else {
      total = accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
    }
    accountTxs.forEach((t) => {
      if (t.type === "deposit") total += t.amount;
      else total -= t.amount;
    });
    return total;
  }, [activeAccount, accountTxs, selectedAccountId, accounts]);

  // Statement balance (latest line's balance or sum of deposits - withdrawals)
  const statementBalance = useMemo(() => {
    if (accountLines.length === 0) return ledgerBalance;
    const lastWithBalance = [...accountLines].reverse().find((l) => l.balance !== undefined);
    if (
      lastWithBalance &&
      lastWithBalance.balance !== undefined &&
      selectedAccountId &&
      selectedAccountId !== "all"
    ) {
      return lastWithBalance.balance;
    }
    let total = 0;
    if (selectedAccountId && selectedAccountId !== "all") {
      total = activeAccount ? activeAccount.initialBalance : 0;
    } else {
      total = accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
    }
    accountLines.forEach((l) => {
      total += l.deposit - l.withdrawal;
    });
    return total;
  }, [accountLines, activeAccount, ledgerBalance, selectedAccountId, accounts]);

  const difference = Math.abs(ledgerBalance - statementBalance);
  const isBalanced = difference < 0.01;

  // Filtered Ledger Txs
  const filteredTxs = useMemo(() => {
    return accountTxs.filter((t) => {
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
    return accountLines.filter((l) => {
      if (
        statusFilter === "unreconciled" &&
        (l.status === "matched" || l.status === "created_in_ledger")
      )
        return false;
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
      const unreconciledTxs = accountTxs
        .filter((t) => !t.isReconciled)
        .map((t) => ({
          id: t.id,
          accountId: t.accountId,
          date: t.date,
          type: t.type,
          amount: t.amount,
          referenceNo: t.referenceNo,
          description: t.description,
          isReconciled: t.isReconciled,
          matchedStatementLineId: t.matchedStatementLineId,
        }));

      const unmatchedLines = accountLines
        .filter((l) => l.status === "unmatched")
        .map((l) => ({
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
          matchedTxId: l.matchedTxId,
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

      await onApplyAutoMatches(matches.map((m) => ({ txId: m.txId, stmtLineId: m.stmtLineId })));
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

  return {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isMatching,
    activeAccount,
    accountTxs,
    accountLines,
    ledgerBalance,
    statementBalance,
    difference,
    isBalanced,
    filteredTxs,
    filteredLines,
    handleRunAutoMatch,
    handleQuickAddStatementLine,
  };
}
