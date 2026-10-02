import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  Save,
  Loader2,
} from "lucide-react";

export interface InvoicePreviewActionBarProps {
  invoiceNumber: string;
  status: string;
  isDraft?: boolean;
  onEdit?: () => void;
  onSave?: () => Promise<void> | void;
  onClose: () => void;
  onPrint: () => void;
  isPrinting: boolean;
  onDownload: () => void;
  isDownloading: boolean;
  onOpenWhatsApp: () => void;
  isPreparingWhatsApp: boolean;
}

export const InvoicePreviewActionBar: React.FC<InvoicePreviewActionBarProps> = ({
  invoiceNumber,
  status,
  isDraft = false,
  onEdit,
  onSave,
  onClose,
  onPrint,
  isPrinting,
  onDownload,
  isDownloading,
  onOpenWhatsApp,
  isPreparingWhatsApp,
}) => {
  const isPaid = status === "paid";
  const isPartial = status === "partial";

  return (
    <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        {onEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-8 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Edit
          </Button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {invoiceNumber}
          </span>

          {isDraft ? (
            <Badge
              variant="outline"
              className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[11px]"
            >
              Draft Preview
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={`text-[11px] font-semibold ${
                isPaid
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : isPartial
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              }`}
            >
              {isPaid ? "Paid" : isPartial ? "Partial Due" : "Unpaid / Pending"}
            </Badge>
          )}
        </div>
      </div>

      {/* Action Buttons: Preview / Print / Download / WhatsApp / Done */}
      <div className="flex items-center gap-2 flex-wrap">
        {isDraft && onSave && (
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save Invoice
          </Button>
        )}

        {/* Print */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrint}
          disabled={isPrinting}
          className="h-8 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
          title="Print Invoice"
        >
          {isPrinting ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          )}
          Print
        </Button>

        {/* Download PDF */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownload}
          disabled={isDownloading}
          className="h-8 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
          title="Download PDF file"
        >
          {isDownloading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          )}
          Download PDF
        </Button>

        {/* Send WhatsApp */}
        <Button
          type="button"
          size="sm"
          onClick={onOpenWhatsApp}
          disabled={isPreparingWhatsApp}
          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          title="Send Invoice to customer via WhatsApp"
        >
          {isPreparingWhatsApp ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
          )}
          Send WhatsApp
        </Button>

        {/* Done / Close */}
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onClose}
          className="h-8 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium"
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          Done
        </Button>
      </div>
    </div>
  );
};
