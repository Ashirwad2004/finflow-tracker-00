import React from "react";
import { ShieldCheck } from "lucide-react";
import { PaymentReceiptDetails } from "./types";

interface ReceiptModalAllocationsTableProps {
  receiptData: PaymentReceiptDetails;
  isReceipt: boolean;
  amount: number;
  formatCurrency: (n: number) => string;
}

export const ReceiptModalAllocationsTable: React.FC<ReceiptModalAllocationsTableProps> = ({
  receiptData,
  isReceipt,
  amount,
  formatCurrency,
}) => {
  return (
    <>
      {/* Bill Allocation Table */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Settlement & Bill Allocation
        </span>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-3 py-2">Bill / Invoice #</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Settled Amount</th>
                <th className="px-3 py-2 text-right">Remaining Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {receiptData.linkedBills && receiptData.linkedBills.length > 0 ? (
                receiptData.linkedBills.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">
                      {b.billNumber}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {b.date || receiptData.date}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600">
                      + {formatCurrency(b.allocatedAmount)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {b.remainingBalance != null && b.remainingBalance <= 0 ? (
                        <span className="text-emerald-600 font-bold">
                          Settled
                        </span>
                      ) : (
                        formatCurrency(b.remainingBalance || 0)
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-2 font-semibold">
                    On Account / Advance Payment
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {receiptData.date}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600">
                    + {formatCurrency(amount)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    Advance Credit
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Party Balance & Notes Box */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Narration / Notes
          </span>
          <p className="text-slate-600 dark:text-slate-300 italic">
            {receiptData.notes || "Payment settled in full/part."}
          </p>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {isReceipt ? "Customer Remaining Balance" : "Vendor Remaining Balance"}
          </span>
          <p
            className={`text-base font-extrabold mt-1 ${
              Number(receiptData.partyCurrentBalance || 0) > 0
                ? "text-rose-600"
                : "text-emerald-600"
            }`}
          >
            {Number(receiptData.partyCurrentBalance || 0) > 0
              ? `${formatCurrency(receiptData.partyCurrentBalance || 0)} Dr`
              : Number(receiptData.partyCurrentBalance || 0) < 0
              ? `${formatCurrency(Math.abs(receiptData.partyCurrentBalance || 0))} Cr (Advance)`
              : "₹0.00 (All Dues Cleared)"}
          </p>
        </div>
      </div>
    </>
  );
};
