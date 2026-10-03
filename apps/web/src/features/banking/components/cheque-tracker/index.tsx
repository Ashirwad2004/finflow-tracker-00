import React from "react";
import { ChequeTrackerTabProps } from "./types";
import { useChequeTracker } from "./useChequeTracker";
import { ChequeMetricsStrip } from "./ChequeMetricsStrip";
import { ChequeFilterBar } from "./ChequeFilterBar";
import { ChequeTable } from "./ChequeTable";
import { RecordChequeDialog } from "./RecordChequeDialog";
import { ChequeBounceDialog } from "./ChequeBounceDialog";

export * from "./types";
export * from "./useChequeTracker";
export * from "./ChequeMetricsStrip";
export * from "./ChequeFilterBar";
export * from "./ChequeTable";
export * from "./RecordChequeDialog";
export * from "./ChequeBounceDialog";

export const ChequeTrackerTab: React.FC<ChequeTrackerTabProps> = ({
  accounts,
  cheques,
  onCreateCheque,
  onUpdateChequeStatus,
  onClearCheque,
}) => {
  const {
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isAddOpen,
    setIsAddOpen,
    isSubmitting,
    accountId,
    setAccountId,
    chequeType,
    setChequeType,
    chequeNumber,
    setChequeNumber,
    partyName,
    setPartyName,
    amount,
    setAmount,
    issueDate,
    setIssueDate,
    dueDate,
    setDueDate,
    bankName,
    setBankName,
    notes,
    setNotes,
    bounceModalCheque,
    setBounceModalCheque,
    bounceReason,
    setBounceReason,
    pendingReceivables,
    pendingPayables,
    filteredCheques,
    handleCreateSubmit,
    handleConfirmBounce,
  } = useChequeTracker({
    accounts,
    cheques,
    onCreateCheque,
    onUpdateChequeStatus,
  });

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <ChequeMetricsStrip
        pendingReceivables={pendingReceivables}
        pendingPayables={pendingPayables}
      />

      {/* Filter and Action Bar */}
      <ChequeFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenAdd={() => setIsAddOpen(true)}
      />

      {/* Cheque Register Table */}
      <ChequeTable
        cheques={filteredCheques}
        accounts={accounts}
        onClearCheque={onClearCheque}
        onUpdateStatus={onUpdateChequeStatus}
        onOpenBounceModal={setBounceModalCheque}
      />

      {/* Record Cheque Modal */}
      <RecordChequeDialog
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
        accounts={accounts}
        chequeType={chequeType}
        onChequeTypeChange={setChequeType}
        accountId={accountId}
        onAccountIdChange={setAccountId}
        chequeNumber={chequeNumber}
        onChequeNumberChange={setChequeNumber}
        amount={amount}
        onAmountChange={setAmount}
        partyName={partyName}
        onPartyNameChange={setPartyName}
        bankName={bankName}
        onBankNameChange={setBankName}
        issueDate={issueDate}
        onIssueDateChange={setIssueDate}
        dueDate={dueDate}
        onDueDateChange={setDueDate}
        notes={notes}
        onNotesChange={setNotes}
      />

      {/* Bounce Confirmation Modal */}
      <ChequeBounceDialog
        cheque={bounceModalCheque}
        onClose={() => setBounceModalCheque(null)}
        bounceReason={bounceReason}
        onBounceReasonChange={setBounceReason}
        onConfirm={handleConfirmBounce}
      />
    </div>
  );
};

export default ChequeTrackerTab;
