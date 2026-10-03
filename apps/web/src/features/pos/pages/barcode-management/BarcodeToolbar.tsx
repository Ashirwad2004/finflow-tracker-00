import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarcodeStatusFilter, BarcodeStats } from "./types";

interface BarcodeToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: BarcodeStatusFilter;
  onStatusFilterChange: (val: BarcodeStatusFilter) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
  stats: BarcodeStats;
  filteredCount: number;
  totalCount: number;
}

export const BarcodeToolbar: React.FC<BarcodeToolbarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedCategory,
  onCategoryChange,
  categories,
  stats,
  filteredCount,
  totalCount,
}) => {
  return (
    <div className="bg-card border border-border/80 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search product, barcode, SKU..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background border-border text-foreground text-xs h-9.5 rounded-xl"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(val) => onStatusFilterChange(val as BarcodeStatusFilter)}
        >
          <SelectTrigger className="w-48 bg-background border-border text-foreground text-xs h-9.5 rounded-xl">
            <SelectValue placeholder="Barcode Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="with_barcode">Tagged ({stats.withBarcode})</SelectItem>
            <SelectItem value="missing_barcode">Missing Barcode ({stats.missing})</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        {categories.length > 0 && (
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-44 bg-background border-border text-foreground text-xs h-9.5 rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-end md:self-center">
        Showing <strong className="text-foreground font-bold">{filteredCount}</strong> of{" "}
        <strong className="text-foreground font-bold">{totalCount}</strong> items
      </div>
    </div>
  );
};
