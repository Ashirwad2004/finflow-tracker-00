import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiBillSettlementTable } from "../MultiBillSettlementTable";
import { PaymentFinancialImpactBox } from "../PaymentFinancialImpactBox";
import { PaymentReceiptModal } from "../PaymentReceiptModal";
import { UniversalPaymentHeader } from "./UniversalPaymentHeader";
import { UniversalPaymentPartySection } from "./UniversalPaymentPartySection";
import { UniversalPaymentDetailsSection } from "./UniversalPaymentDetailsSection";
import { useUniversalPaymentFormState } from "./useUniversalPaymentFormState";
import { UniversalPaymentDialogProps } from "./types";

export type { UniversalPaymentDialogProps };

export function UniversalPaymentDialog(props: UniversalPaymentDialogProps) {
  const { open, onOpenChange } = props;
  const {
    isReceipt,
    selectedPartyId,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDate,
    setPaymentDate,
    referenceNumber,
    setReferenceNumber,
    notes,
    setNotes,
    billAllocations,
    completedReceiptData,
    setCompletedReceiptData,
    eligibleParties,
    activeParty,
    partyPendingBills,
    partyBalance,
    handlePartySelect,
    handleAutoAllocate,
    handleClearAllocations,
    handleAllocationChange,
    handleToggleBill,
    enteredAmount,
    totalAllocated,
    advanceAmount,
    balanceAfterPayment,
    isSubmitting,
    handleSubmitPayment,
    formatCurrency,
  } = useUniversalPaymentFormState(props);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[660px] max-h-[92vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <UniversalPaymentHeader isReceipt={isReceipt} />

          {/* Dialog Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <UniversalPaymentPartySection
              isReceipt={isReceipt}
              activeParty={activeParty}
              partyBalance={partyBalance}
              selectedPartyId={selectedPartyId}
              eligibleParties={eligibleParties}
              formatCurrency={formatCurrency}
              onPartySelect={handlePartySelect}
            />

            <UniversalPaymentDetailsSection
              paymentAmount={paymentAmount}
              onPaymentAmountChange={setPaymentAmount}
              paymentDate={paymentDate}
              onPaymentDateChange={setPaymentDate}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              referenceNumber={referenceNumber}
              onReferenceNumberChange={setReferenceNumber}
              notes={notes}
              onNotesChange={setNotes}
            />

            <MultiBillSettlementTable
              isReceipt={isReceipt}
              selectedPartyId={selectedPartyId}
              partyPendingBills={partyPendingBills}
              billAllocations={billAllocations}
              enteredAmount={enteredAmount}
              totalAllocated={totalAllocated}
              advanceAmount={advanceAmount}
              onAutoAllocate={handleAutoAllocate}
              onClearAllocations={handleClearAllocations}
              onToggleBill={handleToggleBill}
              onAllocationChange={handleAllocationChange}
            />

            <PaymentFinancialImpactBox
              partyBalance={partyBalance}
              enteredAmount={enteredAmount}
              balanceAfterPayment={balanceAfterPayment}
            />
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs font-bold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSubmitPayment}
              disabled={isSubmitting || enteredAmount <= 0 || !activeParty}
              className={`text-xs font-bold text-white shadow-xs ${
                isReceipt
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
              }`}
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <span>
                  {isReceipt ? "Record Payment In" : "Record Payment Out"} (
                  {formatCurrency(enteredAmount)})
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Receipt Modal displayed on completion */}
      {completedReceiptData && (
        <PaymentReceiptModal
          open={!!completedReceiptData}
          onOpenChange={(isOpen) => !isOpen && setCompletedReceiptData(null)}
          receiptData={completedReceiptData}
        />
      )}
    </>
  );
}

export default UniversalPaymentDialog;
