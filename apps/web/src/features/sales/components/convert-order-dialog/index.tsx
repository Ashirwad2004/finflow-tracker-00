import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConvertOrderToInvoiceDialogProps } from "./types";
import { useConvertOrderToInvoiceForm } from "./useConvertOrderToInvoiceForm";
import { InvoiceDialogHeader } from "./InvoiceDialogHeader";
import { InvoiceParametersForm } from "./InvoiceParametersForm";
import { DeliveryItemsTable } from "./DeliveryItemsTable";
import { InvoiceFinancialSummary } from "./InvoiceFinancialSummary";

export const ConvertOrderToInvoiceDialog: React.FC<ConvertOrderToInvoiceDialogProps> = ({
  open,
  onOpenChange,
  saleOrder,
  products: productsProp = [],
  userId,
}) => {
  const {
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    dueDate,
    setDueDate,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    deductStock,
    setDeductStock,
    rows,
    updateRow,
    deliverAllRemaining,
    selectedRows,
    subtotal,
    taxTotal,
    totalAmount,
    totalAdvanceRecorded,
    alreadyUtilizedAdvance,
    netAvailableAdvance,
    applyAdvanceCredit,
    handleSubmit,
    isSubmitting,
  } = useConvertOrderToInvoiceForm({
    open,
    onOpenChange,
    saleOrder,
    productsProp,
    userId,
  });

  if (!saleOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <form onSubmit={handleSubmit}>
          <InvoiceDialogHeader
            saleOrder={saleOrder}
            invoiceNumber={invoiceNumber}
            onInvoiceNumberChange={setInvoiceNumber}
          />

          <div className="p-6 space-y-6">
            <InvoiceParametersForm
              invoiceDate={invoiceDate}
              onInvoiceDateChange={setInvoiceDate}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              paymentStatus={paymentStatus}
              onPaymentStatusChange={setPaymentStatus}
            />

            <DeliveryItemsTable
              rows={rows}
              onUpdateRow={updateRow}
              onDeliverAllRemaining={deliverAllRemaining}
            />

            <InvoiceFinancialSummary
              deductStock={deductStock}
              onDeductStockChange={setDeductStock}
              totalAdvanceRecorded={totalAdvanceRecorded}
              alreadyUtilizedAdvance={alreadyUtilizedAdvance}
              netAvailableAdvance={netAvailableAdvance}
              amountPaid={amountPaid}
              onAmountPaidChange={setAmountPaid}
              totalAmount={totalAmount}
              subtotal={subtotal}
              taxTotal={taxTotal}
              onApplyAdvanceCredit={applyAdvanceCredit}
              isSubmitting={isSubmitting}
              selectedCount={selectedRows.length}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertOrderToInvoiceDialog;
export * from "./types";
export * from "./useConvertOrderToInvoiceForm";
