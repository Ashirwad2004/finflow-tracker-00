import React from "react";
import { BankReconciliationWorkspaceProps } from "./types";
import { useBankReconciliationState } from "./useBankReconciliationState";
import { ReconciliationMetricsStrip } from "./ReconciliationMetricsStrip";
import { ReconciliationActionBar } from "./ReconciliationActionBar";
import { GeneralLedgerPane } from "./GeneralLedgerPane";
import { BankFeedsPane } from "./BankFeedsPane";

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
  onClearStatementFeeds,
}) => {
  const {
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
  } = useBankReconciliationState({
    accounts,
    transactions,
    statementLines,
    selectedAccountId,
    onApplyAutoMatches,
    onCreateTxFromStatementLine,
  });

  return (
    <div className="space-y-4">
      <ReconciliationMetricsStrip
        ledgerBalance={ledgerBalance}
        statementBalance={statementBalance}
        difference={difference}
        isBalanced={isBalanced}
        activeAccount={activeAccount}
        uploadedLinesCount={accountLines.length}
      />

      <ReconciliationActionBar
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={onSelectAccount}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        isMatching={isMatching}
        hasStatementLines={accountLines.length > 0}
        onRunAutoMatch={handleRunAutoMatch}
        onOpenImportModal={onOpenImportModal}
        onGenerateSampleFeed={onGenerateSampleFeed}
        onClearStatementFeeds={onClearStatementFeeds}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GeneralLedgerPane
          filteredTxs={filteredTxs}
          accounts={accounts}
          pendingCount={accountTxs.filter((t) => !t.isReconciled).length}
          onToggleReconciliation={onToggleReconciliation}
        />

        <BankFeedsPane
          filteredLines={filteredLines}
          unmatchedCount={accountLines.filter((l) => l.status === "unmatched").length}
          onOpenImportModal={onOpenImportModal}
          onQuickAddStatementLine={handleQuickAddStatementLine}
        />
      </div>
    </div>
  );
};

export default BankReconciliationWorkspace;
export * from "./types";
export * from "./useBankReconciliationState";
