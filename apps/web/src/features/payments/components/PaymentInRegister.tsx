import { useCurrency } from "@/core/contexts/CurrencyContext";
import { PaymentReceiptModal } from "./PaymentReceiptModal";
import {
  PaymentInRegisterProps,
  PaymentRegisterMetricsStrip,
  PaymentRegisterFilterBar,
  PaymentRegisterRow,
  PaymentRegisterEmptyState,
  usePaymentInRegister,
} from "./register";

export type { PaymentInRegisterProps };

export function PaymentInRegister({
  sales,
  parties,
  profile,
  onOpenRecordPaymentIn,
  onOpenTranscript: _onOpenTranscript,
  onPreviewInvoice,
}: PaymentInRegisterProps) {
  const { formatCurrency } = useCurrency();
  const {
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    modeFilter,
    setModeFilter,
    selectedPartyFilter,
    setSelectedPartyFilter,
    copiedId,
    activeReceiptModalData,
    setActiveReceiptModalData,
    metrics,
    filteredTransactions,
    handleCopyVoucher,
    handleOpenReceiptModal,
    handleQuickPrintReceipt,
    handleDeleteVoucher,
  } = usePaymentInRegister(sales, parties, profile);

  const hasFilter =
    Boolean(searchTerm) ||
    dateFilter !== "all" ||
    modeFilter !== "all" ||
    selectedPartyFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Top Metrics Strip */}
      <PaymentRegisterMetricsStrip
        type="in"
        metrics={metrics}
        formatCurrency={formatCurrency}
        onQuickAction={onOpenRecordPaymentIn}
      />

      {/* Action and Filter Strip */}
      <PaymentRegisterFilterBar
        type="in"
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        modeFilter={modeFilter}
        setModeFilter={setModeFilter}
        selectedPartyFilter={selectedPartyFilter}
        setSelectedPartyFilter={setSelectedPartyFilter}
        parties={parties}
        onAction={onOpenRecordPaymentIn}
      />

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Receipt Voucher #</th>
                <th className="px-4 py-3">Party / Customer</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3">Settlement Type</th>
                <th className="px-4 py-3">Reference / Narration</th>
                <th className="px-4 py-3 text-right">Amount Received</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredTransactions.length === 0 ? (
                <PaymentRegisterEmptyState
                  type="in"
                  hasFilter={hasFilter}
                  onAction={onOpenRecordPaymentIn}
                />
              ) : (
                filteredTransactions.map((tx) => (
                  <PaymentRegisterRow
                    key={tx.id}
                    type="in"
                    tx={tx}
                    isCopied={copiedId === tx.voucherNumber}
                    formatCurrency={formatCurrency}
                    onCopyVoucher={handleCopyVoucher}
                    onOpenReceipt={handleOpenReceiptModal}
                    onQuickPrint={handleQuickPrintReceipt}
                    onPreviewDoc={onPreviewInvoice}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {activeReceiptModalData && (
        <PaymentReceiptModal
          open={!!activeReceiptModalData}
          onOpenChange={(isOpen) => !isOpen && setActiveReceiptModalData(null)}
          receiptData={activeReceiptModalData.data}
          voucherId={activeReceiptModalData.voucherId}
          linkedBillId={activeReceiptModalData.linkedBillId}
          onDeleteVoucher={handleDeleteVoucher}
        />
      )}
    </div>
  );
}

export default PaymentInRegister;
