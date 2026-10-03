import React from "react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PackageCheck, CheckCircle } from "lucide-react";
import { SaleOrder } from "../../types/orders";

interface InvoiceDialogHeaderProps {
  saleOrder: SaleOrder;
  invoiceNumber: string;
  onInvoiceNumberChange: (val: string) => void;
}

export const InvoiceDialogHeader: React.FC<InvoiceDialogHeaderProps> = ({
  saleOrder,
  invoiceNumber,
  onInvoiceNumberChange,
}) => {
  return (
    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Convert Sale Order #{saleOrder.order_number} to Invoice</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer: <strong className="text-slate-700 dark:text-slate-200">{saleOrder.customer_name}</strong>
              {saleOrder.customer_gstin && ` • GSTIN: ${saleOrder.customer_gstin}`}
            </DialogDescription>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice No.</span>
          <Input
            value={invoiceNumber}
            onChange={(e) => onInvoiceNumberChange(e.target.value)}
            className="h-8 font-mono text-xs font-bold w-40 text-right bg-white dark:bg-slate-800"
            required
          />
        </div>
      </div>

      {/* CA Stock Accounting Notice */}
      <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300">
        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          <strong>Enterprise Accounting Standard (Section 31 CGST Act):</strong> Issuing this Tax Invoice establishes legal Time of Supply. FinFlow will recognize revenue, adjust warehouse physical stock, update party ledger, and link the delivery to Order #{saleOrder.order_number}.
        </span>
      </div>
    </div>
  );
};
