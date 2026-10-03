import React from "react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Sale } from "../../types";
import { formatDateSafe } from "../../hooks/useSalesCalculations";
import { SalesTableRowActions } from "./SalesTableRowActions";

interface SalesTableRowProps {
  invoice: Sale;
  onEdit: (invoice: Sale) => void;
  onPrint: (invoice: Sale) => void;
  onPreview: (invoice: Sale) => void;
  onDownload: (invoice: Sale) => void;
  onShare: (invoice: Sale) => void;
  onWhatsApp: (invoice: Sale) => void;
  onGenerateEInvoice: (invoice: Sale) => void;
  onDelete: (invoice: Sale) => void;
  onOpenRecordPayment: (invoice: Sale) => void;
  onOpenTranscript: (invoice: Sale) => void;
}

export const SalesTableRow: React.FC<SalesTableRowProps> = ({
  invoice,
  onEdit,
  onPrint,
  onPreview,
  onDownload,
  onShare,
  onWhatsApp,
  onGenerateEInvoice,
  onDelete,
  onOpenRecordPayment,
  onOpenTranscript,
}) => {
  const { formatCurrency } = useCurrency();
  const currentPaid = Number(invoice.amount_paid || 0);
  const balDue = Number(
    invoice.balance_due != null
      ? invoice.balance_due
      : Math.max(0, invoice.total_amount - currentPaid)
  );
  const isFullyPaid = balDue <= 0.001 && invoice.total_amount > 0;

  return (
    <tr
      key={invoice.id}
      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {invoice.invoice_number}
          </p>
          {((invoice as any).document_type === "receipt" ||
            invoice.invoice_number?.startsWith("REC-")) && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 uppercase tracking-wider">
              Receipt
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {invoice.items?.length || 0} items
        </p>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
            {invoice.customer_name?.substring(0, 2).toUpperCase() || "NA"}
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
            {invoice.customer_name}
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
        <div>{formatDateSafe(invoice.date, "MMM dd, yyyy")}</div>
        {invoice.due_date && (
          <div className="text-[10px] text-slate-400 mt-0.5">
            Due: {formatDateSafe(invoice.due_date, "MMM dd")}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-right">
        {invoice.tax_amount ? formatCurrency(invoice.tax_amount) : formatCurrency(0)}
      </td>
      <td className="px-4 py-2.5 text-xs font-extrabold text-slate-900 dark:text-white text-right">
        {formatCurrency(invoice.total_amount)}
      </td>
      <td className="px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">
        {formatCurrency(currentPaid)}
      </td>
      <td className="px-4 py-2.5 text-xs text-right">
        {balDue > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRecordPayment(invoice);
            }}
            className="font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline transition-colors block ml-auto"
            title="Click to Record Payment In"
          >
            {formatCurrency(balDue)}
          </button>
        ) : (
          <span className="text-slate-400 font-semibold">-</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        {isFullyPaid || invoice.status === "paid" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTranscript(invoice);
            }}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:scale-105 transition-transform"
            title="Paid — Click to view Payment Ledger"
          >
            Paid
          </button>
        ) : invoice.status === "partial" ||
          (currentPaid > 0 && currentPaid < invoice.total_amount) ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRecordPayment(invoice);
            }}
            className="flex flex-col items-center gap-0.5 hover:scale-105 transition-transform cursor-pointer mx-auto"
            title="Click to Receive Payment"
          >
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
              Partial
            </span>
          </button>
        ) : invoice.status === "overdue" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRecordPayment(invoice);
            }}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 hover:scale-105 transition-transform"
            title="Overdue — Click to Receive Payment"
          >
            Overdue
          </button>
        ) : invoice.status === "pending" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRecordPayment(invoice);
            }}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:scale-105 transition-transform"
            title="Pending — Click to Receive Payment"
          >
            Pending
          </button>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Draft
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <SalesTableRowActions
          invoice={invoice}
          balDue={balDue}
          onEdit={onEdit}
          onPrint={onPrint}
          onPreview={onPreview}
          onDownload={onDownload}
          onShare={onShare}
          onWhatsApp={onWhatsApp}
          onGenerateEInvoice={onGenerateEInvoice}
          onDelete={onDelete}
          onOpenRecordPayment={onOpenRecordPayment}
          onOpenTranscript={onOpenTranscript}
        />
      </td>
    </tr>
  );
};
