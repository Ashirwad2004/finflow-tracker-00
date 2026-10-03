import React from "react";
import { InvoiceDetails } from "@/utils/generateInvoicePDF";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface InvoicePreviewTotalsProps {
  pdfPayload: InvoiceDetails;
  salesSettings?: SalesSettings;
  formatCurrency: (amount: number) => string;
}

export const InvoicePreviewTotals: React.FC<InvoicePreviewTotalsProps> = ({
  pdfPayload,
  salesSettings,
  formatCurrency,
}) => {
  const isPartyBalEnabled =
    salesSettings?.showPartyPendingBalance !== undefined
      ? salesSettings.showPartyPendingBalance
      : salesSettings?.showPartyPreviousBalance !== undefined
      ? salesSettings.showPartyPreviousBalance
      : localStorage.getItem("rupeebill_show_party_pending_balance") !== null
      ? localStorage.getItem("rupeebill_show_party_pending_balance") !== "false"
      : localStorage.getItem("rupeebill_show_party_previous_balance") !== "false";

  const custName = (pdfPayload.customer_name || "").trim().toLowerCase();
  const isAnon =
    !custName ||
    custName === "cash customer" ||
    custName === "cash sale" ||
    custName === "walk-in" ||
    custName === "walk-in guest" ||
    custName === "cash";

  const showPartyBalance = isPartyBalEnabled && !isAnon;

  const pendingBal =
    pdfPayload.party_pending_balance !== undefined
      ? Number(pdfPayload.party_pending_balance)
      : Number(pdfPayload.total_due_balance || 0);
  const prevBal = Number(pdfPayload.previous_balance || 0);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
        <span>Subtotal:</span>
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {formatCurrency(pdfPayload.subtotal)}
        </span>
      </div>

      {pdfPayload.discount_amount ? (
        <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
          <span>Discount:</span>
          <span>- {formatCurrency(pdfPayload.discount_amount)}</span>
        </div>
      ) : null}

      {pdfPayload.tax_amount ? (
        <>
          {pdfPayload.cgst ? (
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
              <span>CGST:</span>
              <span>{formatCurrency(pdfPayload.cgst)}</span>
            </div>
          ) : null}
          {pdfPayload.sgst ? (
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
              <span>SGST:</span>
              <span>{formatCurrency(pdfPayload.sgst)}</span>
            </div>
          ) : null}
          {pdfPayload.igst ? (
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
              <span>IGST:</span>
              <span>{formatCurrency(pdfPayload.igst)}</span>
            </div>
          ) : null}
          {!pdfPayload.cgst && !pdfPayload.sgst && !pdfPayload.igst && (
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
              <span>Tax Amount ({pdfPayload.tax_rate || 0}%):</span>
              <span>{formatCurrency(pdfPayload.tax_amount)}</span>
            </div>
          )}
        </>
      ) : null}

      {/* Grand Total */}
      <div className="flex justify-between py-2.5 border-t border-b border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white">
        <span>Total Amount:</span>
        <span className="text-base text-indigo-700 dark:text-indigo-400 font-extrabold">
          {formatCurrency(pdfPayload.total_amount)}
        </span>
      </div>

      {/* Amount Paid & Due */}
      <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
        <span>Amount Paid:</span>
        <span className="font-medium text-emerald-700 dark:text-emerald-400">
          {formatCurrency(pdfPayload.amount_paid || 0)}
        </span>
      </div>

      <div className="flex justify-between py-1 font-semibold text-slate-800 dark:text-slate-200">
        <span>Balance Due:</span>
        <span
          className={
            (pdfPayload.balance_due || 0) > 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-slate-600"
          }
        >
          {formatCurrency(pdfPayload.balance_due || 0)}
        </span>
      </div>

      {/* Party Pending Balance Box */}
      {showPartyBalance && (
        <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex justify-between py-0.5 text-[11px] text-slate-500">
            <span>Previous Pending:</span>
            <span
              className={
                prevBal > 0
                  ? "text-slate-700 dark:text-slate-300 font-medium"
                  : prevBal < 0
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : "text-slate-600 dark:text-slate-400 font-medium"
              }
            >
              {prevBal < 0
                ? `-${formatCurrency(Math.abs(prevBal))} (Advance)`
                : prevBal > 0
                ? `${formatCurrency(prevBal)} Dr`
                : formatCurrency(0)}
            </span>
          </div>
          <div className="flex justify-between py-1 text-xs font-bold text-slate-900 dark:text-white">
            <span>{pendingBal < 0 ? "Advance Balance:" : "Pending Balance:"}</span>
            <span
              className={
                pendingBal > 0
                  ? "text-rose-600 dark:text-rose-400 font-extrabold"
                  : pendingBal < 0
                  ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                  : "text-slate-600 dark:text-slate-400 font-bold"
              }
            >
              {pendingBal < 0
                ? `${formatCurrency(Math.abs(pendingBal))} Cr`
                : pendingBal > 0
                ? `${formatCurrency(pendingBal)} Dr`
                : formatCurrency(0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
