import React from "react";
import { format } from "date-fns";
import {
  Banknote,
  QrCode,
  Building2,
  CreditCard,
  FileSpreadsheet,
  Check,
  Copy,
  Receipt,
  Printer,
  FileText,
} from "lucide-react";
import {
  UnifiedPaymentTransaction,
  getPaymentMethodDetails,
} from "../../utils/paymentTranscript";
import { PaymentRegisterType } from "./types";

interface PaymentRegisterRowProps {
  type: PaymentRegisterType;
  tx: UnifiedPaymentTransaction;
  isCopied: boolean;
  formatCurrency: (amount: number) => string;
  onCopyVoucher: (voucherNo: string, e: React.MouseEvent) => void;
  onOpenReceipt: (tx: UnifiedPaymentTransaction, e?: React.MouseEvent) => void;
  onQuickPrint: (tx: UnifiedPaymentTransaction, e: React.MouseEvent) => void;
  onPreviewDoc?: (rawRecord: any) => void;
}

export const PaymentRegisterRow = ({
  type,
  tx,
  isCopied,
  formatCurrency,
  onCopyVoucher,
  onOpenReceipt,
  onQuickPrint,
  onPreviewDoc,
}: PaymentRegisterRowProps) => {
  const isIn = type === "in";
  const methodDetails = getPaymentMethodDetails(tx.paymentMethod);

  return (
    <tr
      onClick={() => onOpenReceipt(tx)}
      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
    >
      {/* Date & Time */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="font-semibold text-slate-900 dark:text-white">
          {tx.date ? format(new Date(tx.date), "dd MMM yyyy") : "N/A"}
        </div>
        <div className="text-[10px] text-slate-400">
          {tx.time || (isIn ? "Regular Receipt" : "Regular Payment")}
        </div>
      </td>

      {/* Voucher Number */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
            {tx.voucherNumber}
          </span>
          <button
            type="button"
            onClick={(e) => onCopyVoucher(tx.voucherNumber, e)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Copy Voucher Number"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </td>

      {/* Party Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold text-[11px] shrink-0">
            {tx.partyName.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[170px]">
              {tx.partyName}
            </span>
            {tx.partyPhone && (
              <span className="text-[10px] text-slate-400 block truncate">
                {tx.partyPhone}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Payment Mode */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${methodDetails.badgeClass}`}
        >
          {tx.paymentMethod === "cash" && <Banknote className="w-3 h-3" />}
          {tx.paymentMethod === "upi" && <QrCode className="w-3 h-3" />}
          {tx.paymentMethod === "bank_transfer" && <Building2 className="w-3 h-3" />}
          {tx.paymentMethod === "card" && <CreditCard className="w-3 h-3" />}
          {tx.paymentMethod === "cheque" && <FileSpreadsheet className="w-3 h-3" />}
          <span>{methodDetails.label}</span>
        </span>
      </td>

      {/* Settlement Type */}
      <td className="px-4 py-3 whitespace-nowrap">
        {tx.isWithoutBill || !tx.linkedBillNumber ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            On Account / Advance
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {isIn ? `Against Inv: ${tx.linkedBillNumber}` : `Against Bill: ${tx.linkedBillNumber}`}
          </span>
        )}
      </td>

      {/* Reference / Narration */}
      <td className="px-4 py-3 max-w-[180px]">
        <span
          className="text-slate-600 dark:text-slate-400 text-[11px] truncate block"
          title={tx.referenceNumber || tx.notes || "—"}
        >
          {tx.referenceNumber ? `Ref: ${tx.referenceNumber}` : tx.notes || "—"}
        </span>
      </td>

      {/* Amount Received / Paid */}
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span
          className={`text-sm font-black ${
            isIn ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {isIn ? `+ ${formatCurrency(tx.amount)}` : `- ${formatCurrency(tx.amount)}`}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => onOpenReceipt(tx, e)}
            className={`p-1.5 rounded transition-colors text-slate-400 ${
              isIn
                ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600"
                : "hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600"
            }`}
            title={isIn ? "View Payment Receipt Voucher" : "View Payment Voucher"}
          >
            <Receipt className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => onQuickPrint(tx, e)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title={isIn ? "Direct Print Receipt" : "Direct Print Voucher"}
          >
            <Printer className="w-4 h-4" />
          </button>

          {tx.rawBillRecord && onPreviewDoc && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewDoc(tx.rawBillRecord);
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors"
              title="Preview Linked Document PDF"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
