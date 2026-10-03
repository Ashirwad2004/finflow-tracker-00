import React from "react";
import { Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterStatus, SortOption } from "./types";

interface SalesTableFilterBarProps {
  filterStatus: FilterStatus;
  setFilterStatus: (status: FilterStatus) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
}

export const SalesTableFilterBar: React.FC<SalesTableFilterBarProps> = ({
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
}) => {
  return (
    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 border-t-0 dark:bg-slate-800/50">
      <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-950 p-1 rounded-lg overflow-x-auto max-w-full">
        {(["all", "paid", "partial", "pending", "overdue"] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm capitalize transition-all whitespace-nowrap ${
              filterStatus === status
                ? "bg-white dark:bg-slate-800 text-primary"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {status}
          </button>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Sort Invoices"
          >
            <Filter className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DropdownMenuItem
            onClick={() => setSortBy("date-desc")}
            className={`cursor-pointer py-2 ${sortBy === "date-desc" ? "font-bold text-primary" : ""}`}
          >
            Date: Newest First
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSortBy("date-asc")}
            className={`cursor-pointer py-2 ${sortBy === "date-asc" ? "font-bold text-primary" : ""}`}
          >
            Date: Oldest First
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSortBy("amount-desc")}
            className={`cursor-pointer py-2 ${sortBy === "amount-desc" ? "font-bold text-primary" : ""}`}
          >
            Amount: High to Low
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSortBy("amount-asc")}
            className={`cursor-pointer py-2 ${sortBy === "amount-asc" ? "font-bold text-primary" : ""}`}
          >
            Amount: Low to High
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
