import React from "react";
import {
  MoreHorizontal,
  Printer,
  Eye,
  Download,
  Share2,
  MessageCircle,
  Pencil,
  Trash2,
  ScrollText,
  ReceiptIndianRupee,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sale } from "../../types";

interface SalesTableRowActionsProps {
  invoice: Sale;
  balDue: number;
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

export const SalesTableRowActions: React.FC<SalesTableRowActionsProps> = ({
  invoice,
  balDue,
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
  return (
    <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity">
      {balDue > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenRecordPayment(invoice);
          }}
          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-2xs transition-all mr-1"
          title="Record Payment In"
        >
          <ReceiptIndianRupee className="w-3.5 h-3.5" />
          <span>Payment In</span>
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrint(invoice);
        }}
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all"
        title="Print Invoice"
      >
        <Printer className="w-4 h-4" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {balDue > 0 && (
            <DropdownMenuItem
              onClick={() => onOpenRecordPayment(invoice)}
              className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
            >
              <ReceiptIndianRupee className="w-4 h-4 mr-2 text-emerald-500" />
              Receive Payment
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onOpenTranscript(invoice)}
            className="cursor-pointer"
          >
            <ScrollText className="w-4 h-4 mr-2 text-slate-500" />
            Payment Transcript / Ledger
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPrint(invoice)}>
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPreview(invoice)}>
            <Eye className="w-4 h-4 mr-2" />
            Preview PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownload(invoice)}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onShare(invoice)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share Invoice
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onWhatsApp(invoice)}
            className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 mr-2 text-emerald-500" />
            Send via WhatsApp
          </DropdownMenuItem>
          {invoice.customer_gstin && invoice.customer_gstin.length === 15 && (
            <DropdownMenuItem
              onClick={() => onGenerateEInvoice(invoice)}
              className="cursor-pointer py-2"
            >
              <Download className="w-4 h-4 mr-2 text-blue-500" />
              E-Invoice JSON
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onEdit(invoice)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Invoice
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(invoice)}
            className="text-red-500 hover:text-red-600 focus:text-red-600 dark:text-red-400 dark:hover:text-red-300 dark:focus:text-red-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Invoice
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
