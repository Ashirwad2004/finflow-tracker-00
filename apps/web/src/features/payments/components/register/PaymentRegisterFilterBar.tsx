import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentRegisterType } from "./types";

interface PaymentRegisterFilterBarProps {
  type: PaymentRegisterType;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateFilter: "all" | "today" | "this_month" | "this_year";
  setDateFilter: (filter: "all" | "today" | "this_month" | "this_year") => void;
  modeFilter: string;
  setModeFilter: (mode: string) => void;
  selectedPartyFilter: string;
  setSelectedPartyFilter: (partyId: string) => void;
  parties: any[];
  onAction: () => void;
}

export const PaymentRegisterFilterBar = ({
  type,
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  modeFilter,
  setModeFilter,
  selectedPartyFilter,
  setSelectedPartyFilter,
  parties,
  onAction,
}: PaymentRegisterFilterBarProps) => {
  const isIn = type === "in";

  return (
    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={
            isIn
              ? "Search by customer, voucher #, UTR #, or bill..."
              : "Search by vendor, voucher #, UTR #, or bill..."
          }
          className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as any)}
          className="h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="this_month">This Month</option>
          <option value="this_year">This Year</option>
        </select>

        {/* Payment Method Filter */}
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="all">All Modes</option>
          <option value="cash">Cash in Hand</option>
          <option value="upi">UPI / QR</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="card">Card</option>
          <option value="cheque">Cheque</option>
        </select>

        {/* Customer / Vendor / Party Filter */}
        <select
          value={selectedPartyFilter}
          onChange={(e) => setSelectedPartyFilter(e.target.value)}
          className="h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary focus:outline-none max-w-[180px]"
        >
          <option value="all">{isIn ? "All Customers" : "All Vendors"}</option>
          {parties.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Action Button */}
        <Button
          onClick={onAction}
          className={`h-9 px-3 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer ${
            isIn ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{isIn ? "+ Payment In" : "+ Payment Out"}</span>
        </Button>
      </div>
    </div>
  );
};
