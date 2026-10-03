import React from "react";
import { convertAmountToIndianWords } from "@/utils/generateInvoicePDF";
import { PaymentReceiptDetails } from "./types";

interface ReceiptModalAmountBannerProps {
  receiptData: PaymentReceiptDetails;
  isReceipt: boolean;
  amount: number;
  formatCurrency: (n: number) => string;
}

export const ReceiptModalAmountBanner: React.FC<ReceiptModalAmountBannerProps> = ({
  receiptData,
  isReceipt,
  amount,
  formatCurrency,
}) => {
  return (
    <>
      {/* Top Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Box 1: Business Details */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Issued By
          </span>
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">
            {receiptData.businessDetails?.name || "FinFlow Billing Services"}
          </p>
          {receiptData.businessDetails?.address && (
            <p className="text-[11px] text-slate-500">
              {receiptData.businessDetails.address}
            </p>
          )}
          {receiptData.businessDetails?.gst && (
            <p className="text-[10px] text-slate-400 font-mono">
              GSTIN: {receiptData.businessDetails.gst}
            </p>
          )}
        </div>

        {/* Box 2: Party Details */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {isReceipt ? "Received From (Customer)" : "Paid To (Vendor)"}
          </span>
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">
            {receiptData.partyName}
          </p>
          {receiptData.partyPhone && (
            <p className="text-[11px] text-slate-500">
              Ph: {receiptData.partyPhone}
            </p>
          )}
          {receiptData.partyGstin && (
            <p className="text-[10px] text-slate-400 font-mono">
              GSTIN: {receiptData.partyGstin}
            </p>
          )}
        </div>
      </div>

      {/* Amount Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between ${
          isReceipt
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
            : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800"
        }`}
      >
        <div>
          <span
            className={`text-[11px] font-extrabold uppercase tracking-wider block ${
              isReceipt ? "text-emerald-700" : "text-indigo-700"
            }`}
          >
            {isReceipt ? "Amount Received" : "Amount Paid"}
          </span>
          <p
            className={`text-2xl font-black mt-0.5 ${
              isReceipt
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-indigo-700 dark:text-indigo-300"
            }`}
          >
            {formatCurrency(amount)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
            In Words: {convertAmountToIndianWords(amount)}
          </p>
        </div>

        <div className="text-right space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Payment Mode
          </span>
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 uppercase">
            {receiptData.paymentMethod || "CASH"}
          </span>
          {receiptData.referenceNumber && (
            <p className="text-[10px] font-mono text-slate-500">
              Ref: {receiptData.referenceNumber}
            </p>
          )}
        </div>
      </div>
    </>
  );
};
