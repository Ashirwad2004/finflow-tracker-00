import React from "react";
import {
  Search,
  Settings2,
  MoreHorizontal,
  MessageCircle,
  Mail,
  ReceiptIndianRupee,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SalesPageHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenSettings: () => void;
  onBulkWhatsApp: () => void;
  onBulkEmail: () => void;
  onOpenPaymentIn: () => void;
  onOpenCreateInvoice: () => void;
}

export const SalesPageHeader: React.FC<SalesPageHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  onOpenSettings,
  onBulkWhatsApp,
  onBulkEmail,
  onOpenPaymentIn,
  onOpenCreateInvoice,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Sales & Invoices</h2>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
          Manage and monitor all your customer billing operations.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
        <div className="relative group w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-slate-100"
            placeholder="Search invoices..."
          />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center whitespace-nowrap gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-sm transition-all flex-1 sm:flex-initial"
          >
            <Settings2 className="w-4 h-4" />
            Sales Settings
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center whitespace-nowrap gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg shadow-sm transition-all flex-1 sm:flex-initial">
                Bulk Actions <MoreHorizontal className="w-4 h-4 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            >
              <DropdownMenuItem onClick={onBulkWhatsApp} className="cursor-pointer py-2 font-medium">
                <MessageCircle className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> Send WhatsApp to
                Overdue
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBulkEmail} className="cursor-pointer py-2">
                <Mail className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> Send Emails to Overdue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onOpenPaymentIn}
            className="flex items-center justify-center whitespace-nowrap gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex-1 sm:flex-initial"
            title="Record Payment In (With or Without Bill)"
          >
            <ReceiptIndianRupee className="w-4 h-4" />
            <span>+ Payment In</span>
          </button>
          <button
            onClick={onOpenCreateInvoice}
            className="flex items-center justify-center whitespace-nowrap gap-2 px-3 py-2 text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
