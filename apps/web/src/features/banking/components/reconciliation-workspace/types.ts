import { BankAccount, BankTransaction, BankStatementLine } from "../types";

export interface BankReconciliationWorkspaceProps {
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
