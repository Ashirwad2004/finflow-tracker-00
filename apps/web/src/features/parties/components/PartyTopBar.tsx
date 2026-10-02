import React from "react";
import {
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PartyTopBarProps {
  directorySummary: {
    totalParties: number;
    totalReceivables: number;
    totalPayables: number;
  };
  formatCurrency: (amount: number) => string;
  onOpenImportExport: () => void;
  onExportPartiesExcel: () => void;
  onExportPartiesPDF: () => void;
  onAddClick: () => void;
}

export const PartyTopBar: React.FC<PartyTopBarProps> = ({
  directorySummary,
  formatCurrency,
  onOpenImportExport,
  onExportPartiesExcel,
  onExportPartiesPDF,
  onAddClick,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
      <div>
        <div className="flex items-center space-x-2">
          <Users className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Parties & Ledger
          </h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs mt-0.5">
          Customer and vendor accounts, balances, and transaction history in one unified view.
        </p>
      </div>

      {/* Summary KPI Badges */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
          <span className="text-slate-500">Parties:</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {directorySummary.totalParties}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold">
          <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-700 dark:text-amber-300">To Collect:</span>
          <span className="font-bold text-amber-700 dark:text-amber-300">
            {formatCurrency(directorySummary.totalReceivables)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold">
          <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span className="text-rose-700 dark:text-rose-300">To Pay:</span>
          <span className="font-bold text-rose-700 dark:text-rose-300">
            {formatCurrency(directorySummary.totalPayables)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImportExport}
            className="h-8 px-2.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            title="Import or Export Parties via Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Import / Export</span>
            <span className="sm:hidden">Excel</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 shadow-lg">
              <DropdownMenuItem
                onClick={onExportPartiesExcel}
                className="cursor-pointer flex items-center gap-2.5 py-2 text-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export All (Excel)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportPartiesPDF}
                className="cursor-pointer flex items-center gap-2.5 py-2 text-xs"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>Export All (PDF)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={onAddClick}
            size="sm"
            className="h-8 px-3 text-xs font-bold shadow-sm bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Party</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
