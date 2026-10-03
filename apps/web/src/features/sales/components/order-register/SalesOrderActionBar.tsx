import React from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SalesOrderActionBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onOpenCreate: () => void;
}

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "partially_delivered", label: "Partial" },
  { id: "delivered", label: "Delivered" },
];

export const SalesOrderActionBar: React.FC<SalesOrderActionBarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenCreate,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by SO# or customer..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Status Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onStatusFilterChange(t.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === t.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Button
          onClick={onOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 rounded-xl shadow-md shadow-indigo-500/20 gap-1.5 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sales Order</span>
        </Button>
      </div>
    </div>
  );
};
