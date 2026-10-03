import React from "react";
import { InvoiceItem } from "@/utils/generateInvoicePDF";

interface InvoicePreviewItemsTableProps {
  items: InvoiceItem[];
  formatCurrency: (amount: number) => string;
}

export const InvoicePreviewItemsTable: React.FC<InvoicePreviewItemsTableProps> = ({
  items,
  formatCurrency,
}) => {
  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
          <tr>
            <th className="py-2.5 px-3 w-10 text-center">#</th>
            <th className="py-2.5 px-3">Item Description</th>
            <th className="py-2.5 px-3 w-20">HSN/SAC</th>
            <th className="py-2.5 px-3 w-16 text-right">Qty</th>
            <th className="py-2.5 px-3 w-24 text-right">Rate</th>
            <th className="py-2.5 px-3 w-16 text-right">Tax</th>
            <th className="py-2.5 px-3 w-24 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-center text-slate-400">
                No items in this invoice
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                <td className="py-2 px-3">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.description}
                  </span>
                  {item.unit && (
                    <span className="text-[10px] text-slate-400 ml-1">({item.unit})</span>
                  )}
                </td>
                <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                  {item.hsn_code || "—"}
                </td>
                <td className="py-2 px-3 text-right font-medium">{item.quantity}</td>
                <td className="py-2 px-3 text-right">
                  {formatCurrency(Number(item.price))}
                </td>
                <td className="py-2 px-3 text-right text-slate-500">
                  {item.tax_rate != null ? `${item.tax_rate}%` : "—"}
                </td>
                <td className="py-2 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(Number(item.total))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
