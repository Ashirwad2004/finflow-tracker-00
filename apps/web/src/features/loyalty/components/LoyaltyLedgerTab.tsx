import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Download,
  ArrowUpDown,
  History,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { CustomerLoyaltyData, LoyaltyConfig, SortKey } from "../types";
import { tierBadgeClass } from "./LoyaltyOverviewTab";

interface LoyaltyLedgerTabProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAllVisible: () => void;
  handleExportCsv: () => void;
  onClearFilters: () => void;
  filteredCustomers: CustomerLoyaltyData[];
  pagedCustomers: CustomerLoyaltyData[];
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  pageSize: number;
  sortKey: SortKey;
  toggleSort: (key: SortKey) => void;
  config: LoyaltyConfig;
  loadingParties: boolean;
  loadingSales: boolean;
  loadingLedger: boolean;
  formatCurrency: (amount: number) => string;
  onOpenHistory: (customer: { id: string; name: string }) => void;
  onOpenAdjust: (customer: { id: string; name: string; currentPoints: number }) => void;
  onOpenRedeem: (customer: { id: string; name: string; currentPoints: number }) => void;
}

export function LoyaltyLedgerTab({
  searchTerm,
  setSearchTerm,
  selectedIds,
  toggleSelect,
  toggleSelectAllVisible,
  handleExportCsv,
  onClearFilters,
  filteredCustomers,
  pagedCustomers,
  page,
  setPage,
  totalPages,
  pageSize,
  sortKey,
  toggleSort,
  config,
  loadingParties,
  loadingSales,
  loadingLedger,
  formatCurrency,
  onOpenHistory,
  onOpenAdjust,
  onOpenRedeem,
}: LoyaltyLedgerTabProps) {
  const SortHeader = ({ label, sortableKey }: { label: string; sortableKey: SortKey }) => (
    <button
      onClick={() => toggleSort(sortableKey)}
      className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === sortableKey ? "text-primary" : "text-slate-300"}`} />
    </button>
  );

  const TierProgressBar = ({ c }: { c: CustomerLoyaltyData }) => (
    <div className="w-24">
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            c.tier === "Gold" ? "bg-amber-400" : c.tier === "Silver" ? "bg-slate-400" : "bg-orange-400"
          }`}
          style={{ width: `${c.tierProgress}%` }}
        />
      </div>
      <p className="text-[9px] text-slate-400 mt-0.5">
        {c.tier === "Gold"
          ? "Top tier"
          : `${formatCurrency(Math.max(0, (c.nextThreshold || 0) - c.totalSpent))} to next`}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-[11px] rounded-lg"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <Badge variant="secondary" className="h-8 flex items-center px-2.5 text-[10px]">
              {selectedIds.size} selected
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="rounded-lg text-[11px] h-8 flex-1 sm:flex-initial"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="rounded-lg text-[11px] h-8 flex-1 sm:flex-initial"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="text-[10px] font-semibold uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 tracking-wide">
              <tr>
                <th className="px-4 py-2.5 w-8">
                  <Checkbox
                    checked={filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.has(c.id))}
                    onCheckedChange={toggleSelectAllVisible}
                    aria-label="Select all visible customers"
                  />
                </th>
                <th className="px-4 py-2.5">
                  <SortHeader label="Customer" sortableKey="name" />
                </th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">Tier / Progress</th>
                <th className="px-4 py-2.5">
                  <SortHeader label="Points" sortableKey="points" />
                </th>
                <th className="px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5">
                  <SortHeader label="Last Visit" sortableKey="lastPurchase" />
                </th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingParties || loadingSales || loadingLedger ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1.5" /> Loading ledger data...
                  </td>
                </tr>
              ) : pagedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No matching customers found.
                  </td>
                </tr>
              ) : (
                pagedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{c.name}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{c.phone || "No Phone"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        <Badge className={"text-[10px] w-fit " + tierBadgeClass(c.tier)} variant="outline">
                          {c.tier}
                        </Badge>
                        <TierProgressBar c={c} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-violet-600 dark:text-violet-400">{c.points} pts</td>
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                      {formatCurrency(c.points * config.pointValue)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {c.lastPurchaseDate ? c.lastPurchaseDate.toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 rounded-md text-slate-500 hover:text-slate-800"
                          title="View history"
                          onClick={() => onOpenHistory({ id: c.id, name: c.name })}
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 rounded-md border-primary/30 text-primary hover:bg-primary/5 text-[10px]"
                          onClick={() => onOpenAdjust({ id: c.id, name: c.name, currentPoints: c.points })}
                        >
                          Adjust
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-[10px] font-semibold"
                          onClick={() => onOpenRedeem({ id: c.id, name: c.name, currentPoints: c.points })}
                        >
                          Redeem
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
            <span>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredCustomers.length)} of{" "}
              {filteredCustomers.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
