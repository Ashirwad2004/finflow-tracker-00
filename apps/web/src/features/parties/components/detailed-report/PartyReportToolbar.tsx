import React from "react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  CalendarIcon,
  ArrowUpDown,
  Printer,
  ChevronDown,
} from "lucide-react";
import { exportDetailedPartyPDF } from "@/utils/exportDetailedPartyPDF";
import { exportDetailedPartyCSV } from "@/utils/exportDetailedPartyCSV";
import { LedgerTransaction } from "../../lib/detailedLedgerCalculations";

interface PartyReportToolbarProps {
  selectedParty: string;
  setSelectedParty: (party: string) => void;
  partySearch: string;
  setPartySearch: (search: string) => void;
  filteredPartyOptions: Array<{ name: string; type: string }>;
  isDatePopoverOpen: boolean;
  setIsDatePopoverOpen: (open: boolean) => void;
  dateButtonLabel: string;
  datePreset: string;
  setDatePreset: (preset: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  setDateRange: React.Dispatch<React.SetStateAction<{ from: Date | undefined; to: Date | undefined }>>;
  handleDatePresetChange: (preset: string) => void;
  viewOrder: "chronological" | "reverse";
  setViewOrder: React.Dispatch<React.SetStateAction<"chronological" | "reverse">>;
  fullLedger: LedgerTransaction[];
  businessDetails?: any;
  partyDetails?: any;
}

export const PartyReportToolbar: React.FC<PartyReportToolbarProps> = ({
  selectedParty,
  setSelectedParty,
  partySearch,
  setPartySearch,
  filteredPartyOptions,
  isDatePopoverOpen,
  setIsDatePopoverOpen,
  dateButtonLabel,
  datePreset,
  setDatePreset,
  dateRange,
  setDateRange,
  handleDatePresetChange,
  viewOrder,
  setViewOrder,
  fullLedger,
  businessDetails,
  partyDetails,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-slate-50/80 dark:bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full min-w-0">
      {/* Left: Party Selector + Single Unified Date Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
        {/* Party Selector with Search */}
        <div className="w-full sm:w-64 md:w-72 shrink-0">
          <Select value={selectedParty} onValueChange={setSelectedParty}>
            <SelectTrigger className="w-full h-9 text-xs font-semibold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs">
              <SelectValue placeholder="Select Customer or Vendor" />
            </SelectTrigger>
            <SelectContent className="max-h-80 w-[calc(100vw-32px)] sm:w-80 max-w-[340px]">
              <div className="p-2 border-b">
                <div className="flex items-center px-2 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 gap-1.5">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Search party by name or phone..."
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    className="w-full bg-transparent text-xs outline-none"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <SelectItem value="all" className="font-semibold text-muted-foreground py-2">
                -- Select a Party --
              </SelectItem>
              {filteredPartyOptions.map((p) => (
                <SelectItem key={p.name} value={p.name} className="py-2 cursor-pointer">
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {p.name}
                    </span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono shrink-0">
                      {p.type}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Single Unified Date Filter Popover */}
        <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 px-3 text-xs font-medium border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 gap-2 shrink-0 shadow-2xs w-full sm:w-auto justify-between"
            >
              <div className="flex items-center gap-1.5 truncate">
                <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {dateButtonLabel}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-32px)] sm:w-80 p-3.5 max-w-[340px]" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Select Date Range
                </span>
                {(dateRange.from || dateRange.to || datePreset !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange({ from: undefined, to: undefined });
                      setDatePreset("all");
                    }}
                    className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Reset to All
                  </button>
                )}
              </div>

              {/* Preset Pills */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "all", label: "All Dates" },
                  { id: "this_month", label: "This Month" },
                  { id: "last_month", label: "Last Month" },
                  { id: "last_90_days", label: "Last 90 Days" },
                  { id: "this_fy", label: "Current FY" },
                  { id: "last_fy", label: "Previous FY" },
                ].map((preset) => {
                  const isActive =
                    datePreset === preset.id &&
                    (preset.id === "all" ? !dateRange.from && !dateRange.to : true);
                  return (
                    <Button
                      key={preset.id}
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className="h-7 text-xs font-medium justify-center"
                      onClick={() => {
                        handleDatePresetChange(preset.id);
                        setIsDatePopoverOpen(false);
                      }}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>

              {/* Custom Date Inputs */}
              <div className="pt-2 border-t space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Custom Period
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">From</label>
                    <Input
                      type="date"
                      className="h-8 text-xs font-mono"
                      value={dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        const val = e.target.value ? new Date(e.target.value) : undefined;
                        setDatePreset("custom");
                        setDateRange((prev) => ({ ...prev, from: val }));
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">To</label>
                    <Input
                      type="date"
                      className="h-8 text-xs font-mono"
                      value={dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        const val = e.target.value ? new Date(e.target.value) : undefined;
                        setDatePreset("custom");
                        setDateRange((prev) => ({ ...prev, to: val }));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-xs px-3 font-semibold"
                  onClick={() => setIsDatePopoverOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right: Order Toggle + Print + Export */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60 dark:border-slate-800/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setViewOrder((prev) => (prev === "chronological" ? "reverse" : "chronological"))
          }
          className="h-9 px-2 sm:px-3 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 gap-1.5 font-medium shadow-2xs flex-1 sm:flex-initial justify-center"
          title="Toggle Chronological / Latest first"
          disabled={selectedParty === "all"}
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="hidden sm:inline text-slate-500">Order:</span>
          <span className="font-semibold hidden md:inline">
            {viewOrder === "chronological" ? "Oldest First (CA)" : "Latest First"}
          </span>
          <span className="font-semibold md:hidden">
            {viewOrder === "chronological" ? "Oldest" : "Latest"}
          </span>
        </Button>

        {/* Direct Print */}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportDetailedPartyPDF(
              fullLedger,
              selectedParty,
              dateRange,
              businessDetails,
              partyDetails,
              { isPrint: true }
            )
          }
          className="h-9 px-2.5 sm:px-3 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 gap-1.5 font-medium shadow-2xs flex-1 sm:flex-initial justify-center"
          disabled={selectedParty === "all" || fullLedger.length === 0}
          title="Print Statement (A4 CA Standard)"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Print</span>
        </Button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-9 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 shadow-2xs flex-1 sm:flex-initial justify-center"
              disabled={selectedParty === "all" || fullLedger.length === 0}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 text-xs">
            <DropdownMenuItem
              className="cursor-pointer py-2 text-xs"
              onClick={() =>
                exportDetailedPartyPDF(
                  fullLedger,
                  selectedParty,
                  dateRange,
                  businessDetails,
                  partyDetails
                )
              }
            >
              <FileText className="w-4 h-4 mr-2 text-rose-500" />
              <span>Download PDF Statement</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer py-2 text-xs"
              onClick={() =>
                exportDetailedPartyCSV(
                  fullLedger,
                  selectedParty,
                  dateRange,
                  businessDetails,
                  partyDetails
                )
              }
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
              <span>Download Excel (.xlsx)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
