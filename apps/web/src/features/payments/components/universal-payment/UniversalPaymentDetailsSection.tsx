import { ReceiptIndianRupee, Calendar, CreditCard, Sparkles } from "lucide-react";
import { PaymentMethodType } from "../../utils/paymentTranscript";

interface UniversalPaymentDetailsSectionProps {
  paymentAmount: string;
  onPaymentAmountChange: (val: string) => void;
  paymentDate: string;
  onPaymentDateChange: (val: string) => void;
  paymentMethod: PaymentMethodType;
  onPaymentMethodChange: (method: PaymentMethodType) => void;
  referenceNumber: string;
  onReferenceNumberChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
}

export function UniversalPaymentDetailsSection({
  paymentAmount,
  onPaymentAmountChange,
  paymentDate,
  onPaymentDateChange,
  paymentMethod,
  onPaymentMethodChange,
  referenceNumber,
  onReferenceNumberChange,
  notes,
  onNotesChange,
}: UniversalPaymentDetailsSectionProps) {
  return (
    <>
      {/* Amount & Date Input Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ReceiptIndianRupee className="w-3.5 h-3.5 text-primary" />
            Payment Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
              ₹
            </span>
            <input
              type="number"
              step="any"
              value={paymentAmount}
              onChange={(e) => onPaymentAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full h-10 pl-7 pr-3 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Payment Date
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => onPaymentDateChange(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Payment Mode & Reference Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            Payment Mode
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethodType)}
            className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="cash">💵 Cash in Hand</option>
            <option value="upi">📱 UPI / QR Code</option>
            <option value="bank_transfer">🏦 Bank Transfer / NEFT / IMPS</option>
            <option value="card">💳 Debit / Credit Card</option>
            <option value="cheque">📄 Cheque / Demand Draft</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Reference / UTR / Cheque #
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => onReferenceNumberChange(e.target.value)}
            placeholder="e.g. UTR-982348 or CHQ-00124"
            className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Narration / Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Narration / Notes
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. Cleared via HDFC Bank NEFT"
          className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>
    </>
  );
}
