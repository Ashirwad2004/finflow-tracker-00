import React from "react";
import { RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { POSReceiptModal } from "./POSReceiptModal";
import {
  POSReturnModalProps,
  SaleItemLine,
  SaleRecord,
  usePOSReturn,
  POSReturnHeader,
  POSReturnSuccessView,
  POSReturnSearchStep,
  POSReturnItemsStep,
} from "./return";

export type { POSReturnModalProps, SaleItemLine, SaleRecord };

export const POSReturnModal: React.FC<POSReturnModalProps> = ({
  isOpen,
  onClose,
  activeShiftId,
  onReturnSuccess,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    selectedSale,
    setSelectedSale,
    returnLines,
    refundMethod,
    setRefundMethod,
    reasonCategory,
    setReasonCategory,
    reasonNotes,
    setReasonNotes,
    isSubmitting,
    completedReturn,
    showReceipt,
    setShowReceipt,
    selectedReturnItems,
    totalRefundAmount,
    handleSearch,
    handleSelectSale,
    handleToggleItem,
    handleQtyChange,
    handleToggleRestock,
    handleSubmitReturn,
    handleReset,
    handleClose,
  } = usePOSReturn(onClose, activeShiftId, onReturnSuccess);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-card border-border text-foreground flex flex-col max-h-[90vh] shadow-2xl rounded-2xl">
          {/* Header */}
          <POSReturnHeader />

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 font-display">
            {completedReturn ? (
              <POSReturnSuccessView
                completedReturn={completedReturn}
                onReset={handleReset}
                onPrintReceipt={() => setShowReceipt(true)}
              />
            ) : !selectedSale ? (
              <POSReturnSearchStep
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isSearching={isSearching}
                onSearch={handleSearch}
                searchResults={searchResults}
                onSelectSale={handleSelectSale}
              />
            ) : (
              <POSReturnItemsStep
                selectedSale={selectedSale}
                returnLines={returnLines}
                selectedReturnItems={selectedReturnItems}
                totalRefundAmount={totalRefundAmount}
                refundMethod={refundMethod}
                setRefundMethod={setRefundMethod}
                reasonCategory={reasonCategory}
                setReasonCategory={setReasonCategory}
                reasonNotes={reasonNotes}
                setReasonNotes={setReasonNotes}
                onToggleItem={handleToggleItem}
                onQtyChange={handleQtyChange}
                onToggleRestock={handleToggleRestock}
                onChangeInvoice={() => setSelectedSale(null)}
              />
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 border-t border-border/80 bg-muted/30 flex-shrink-0 flex items-center justify-between">
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted font-semibold"
              onClick={handleClose}
            >
              {completedReturn ? "Close" : "Cancel"}
            </Button>

            {selectedSale && !completedReturn && (
              <Button
                disabled={isSubmitting || selectedReturnItems.length === 0}
                onClick={handleSubmitReturn}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-xs rounded-xl"
              >
                {isSubmitting ? (
                  "Processing Return..."
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" /> Issue Credit Note (₹
                    {totalRefundAmount.toFixed(2)})
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Note Receipt Modal */}
      {completedReturn && (
        <POSReceiptModal
          open={showReceipt}
          onOpenChange={setShowReceipt}
          onNewSale={handleReset}
          saleData={{
            ...completedReturn.credit_note,
            invoice_number:
              completedReturn.credit_note?.invoice_number ||
              completedReturn.return?.return_number,
            items: completedReturn.returnItems || [],
            total_amount: completedReturn.totalRefund,
            amount_paid: completedReturn.totalRefund,
            payment_method: completedReturn.return?.refund_method || "cash",
            customer_name: completedReturn.originalSale?.customer_name,
            customer_phone: completedReturn.originalSale?.customer_phone,
            date: new Date().toISOString(),
          }}
        />
      )}
    </>
  );
};

export default POSReturnModal;
