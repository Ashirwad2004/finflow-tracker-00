import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface InvoiceParametersFormProps {
  invoiceDate: string;
  onInvoiceDateChange: (val: string) => void;
  dueDate: string;
  onDueDateChange: (val: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (val: string) => void;
  paymentStatus: "paid" | "pending" | "partial";
  onPaymentStatusChange: (val: "paid" | "pending" | "partial") => void;
}

export const InvoiceParametersForm: React.FC<InvoiceParametersFormProps> = ({
  invoiceDate,
  onInvoiceDateChange,
  dueDate,
  onDueDateChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentStatus,
  onPaymentStatusChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-xs">
      <div>
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Invoice Date</Label>
        <Input
          type="date"
          value={invoiceDate}
          onChange={(e) => onInvoiceDateChange(e.target.value)}
          className="h-8 text-xs mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          required
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Due Date</Label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => onDueDateChange(e.target.value)}
          className="h-8 text-xs mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Mode</Label>
        <select
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mt-1"
        >
          <option value="Cash">Cash</option>
          <option value="UPI">UPI / QR Code</option>
          <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
          <option value="Cheque">Cheque</option>
        </select>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Status</Label>
        <select
          value={paymentStatus}
          onChange={(e) => onPaymentStatusChange(e.target.value as any)}
          className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mt-1 font-medium"
        >
          <option value="pending">Pending (Credit Sale)</option>
          <option value="partial">Partially Paid</option>
          <option value="paid">Fully Paid</option>
        </select>
      </div>
    </div>
  );
};
