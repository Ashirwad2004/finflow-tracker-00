import React from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChequeTypeFilter } from "./types";

interface ChequeFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: ChequeTypeFilter;
  onTypeFilterChange: (value: ChequeTypeFilter) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onOpenAdd: () => void;
}

export const ChequeFilterBar: React.FC<ChequeFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onOpenAdd,
}) => {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-3.5 flex flex-wrap gap-2.5 items-center justify-between shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative w-48 sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search Cheque #, Party..."
            className="pl-8 h-9 text-xs rounded-xl"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <Select
          value={typeFilter}
          onValueChange={(v) => onTypeFilterChange(v as ChequeTypeFilter)}
        >
          <SelectTrigger className="h-9 text-xs rounded-xl w-[140px]">
            <SelectValue placeholder="All Cheques" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cheques</SelectItem>
            <SelectItem value="received">Received (Inward)</SelectItem>
            <SelectItem value="issued">Issued (Outward)</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-9 text-xs rounded-xl w-[130px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="deposited">Deposited</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={onOpenAdd}
        className="h-9 text-xs rounded-xl font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Record Cheque (PDC)
      </Button>
    </div>
  );
};
