import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Printer,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  Maximize2,
  Minimize2,
  PanelLeft,
} from "lucide-react";
import { DatePeriodPreset } from "../../hooks/useAccountingData";
import { FinFlowReportId, ReportMenuItem } from "../../reportMenu";

interface ReportsHeaderControlsProps {
  activeReportMeta: ReportMenuItem;
  activeReportId: FinFlowReportId;
  periodPreset: DatePeriodPreset;
  setPeriodPreset: (val: DatePeriodPreset) => void;
  setCustomRange: React.Dispatch<React.SetStateAction<{ from?: Date; to?: Date }>>;
  tableSearch: string;
  setTableSearch: (val: string) => void;
  onExportExcel: () => void;
  onPrint: () => void;
  onRefetch: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const ReportsHeaderControls: React.FC<ReportsHeaderControlsProps> = ({
  activeReportMeta,
  activeReportId,
  periodPreset,
  setPeriodPreset,
  setCustomRange,
  tableSearch,
  setTableSearch,
  onExportExcel,
  onPrint,
  onRefetch,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <div className="shrink-0 p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col xl:flex-row xl:items-center justify-between gap-3 z-10">
      {/* Title & Category Info */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {activeReportMeta.category}
          </span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {activeReportMeta.label}
          </h2>
        </div>
      </div>

      {/* Controls: Date Picker + Search + Excel/Print */}
      <div className="flex items-center gap-2 flex-wrap">
        {activeReportId !== "party_statement" && (
          <>
            {/* Date Preset Dropdown */}
            <Select
              value={periodPreset}
              onValueChange={(val) => setPeriodPreset(val as DatePeriodPreset)}
            >
              <SelectTrigger className="w-[155px] h-8 text-xs font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="q1">Q1 (Apr–Jun)</SelectItem>
                <SelectItem value="q2">Q2 (Jul–Sep)</SelectItem>
                <SelectItem value="q3">Q3 (Oct–Dec)</SelectItem>
                <SelectItem value="q4">Q4 (Jan–Mar)</SelectItem>
                <SelectItem value="this_fy">Current FY (2025-26)</SelectItem>
                <SelectItem value="last_fy">Previous FY (2024-25)</SelectItem>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* If Custom Date Range, show From & To dates */}
            {periodPreset === "custom" && (
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  className="w-32 h-8 text-xs bg-white dark:bg-slate-800"
                  onChange={(e) =>
                    setCustomRange((prev) => ({
                      ...prev,
                      from: e.target.value ? new Date(e.target.value) : undefined,
                    }))
                  }
                />
                <span className="text-xs text-slate-400">-</span>
                <Input
                  type="date"
                  className="w-32 h-8 text-xs bg-white dark:bg-slate-800"
                  onChange={(e) =>
                    setCustomRange((prev) => ({
                      ...prev,
                      to: e.target.value ? new Date(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            )}

            {/* Quick in-table search box */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Filter table..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 h-8 w-36 sm:w-44 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Excel Export Button */}
            <Button
              size="sm"
              onClick={onExportExcel}
              className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (CSV)
            </Button>

            {/* Print / PDF Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
              className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              Print / PDF
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefetch}
          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
          title="Refresh register"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>

        {/* Sidebar Collapse/Expand Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          title={isSidebarCollapsed ? "Show reports menu sidebar" : "Hide reports menu sidebar"}
        >
          <PanelLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <span className="inline">{isSidebarCollapsed ? "Menu" : "Collapse"}</span>
        </Button>

        {/* Full Screen Mode Toggle */}
        <Button
          variant={isFullscreen ? "default" : "outline"}
          size="sm"
          onClick={onToggleFullscreen}
          className={`h-8 px-2.5 text-xs font-semibold gap-1.5 ${
            isFullscreen
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          }`}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen"}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Full Screen</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
