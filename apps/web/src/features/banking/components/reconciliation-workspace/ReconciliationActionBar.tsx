import React from "react";
import { Search, Sparkles, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BankAccount } from "../types";

interface ReconciliationActionBarProps {
  accounts: BankAccount[];
  selectedAccountId: string;
  onSelectAccount: (accId: string) => void;
  statusFilter: "all" | "unreconciled" | "reconciled";
  onStatusFilterChange: (filter: "all" | "unreconciled" | "reconciled") => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isMatching: boolean;
  hasStatementLines: boolean;
  onRunAutoMatch: () => void;
  onOpenImportModal: () => void;
  onGenerateSampleFeed?: () => Promise<void>;
  onClearStatementFeeds?: () => Promise<void>;
}

export const ReconciliationActionBar: React.FC<ReconciliationActionBarProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  isMatching,
  hasStatementLines,
  onRunAutoMatch,
  onOpenImportModal,
  onGenerateSampleFeed,
  onClearStatementFeeds,
}) => {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-3.5 flex flex-wrap gap-2.5 items-center justify-between shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        {/* Account Selector */}
        <Select value={selectedAccountId} onValueChange={onSelectAccount}>
          <SelectTrigger className="h-9 text-xs rounded-xl w-[170px]">
            <SelectValue placeholder="Select Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.bankName} ({a.accountNumber.slice(-4)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as "all" | "unreconciled" | "reconciled")}
        >
          <SelectTrigger className="h-9 text-xs rounded-xl w-[130px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unreconciled">Unmatched</SelectItem>
            <SelectItem value="reconciled">Matched</SelectItem>
            <SelectItem value="all">All Records</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative w-48 sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Filter by Ref, Memo..."
            className="h-9 pl-8 text-xs rounded-xl"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onGenerateSampleFeed && (
          <Button
            onClick={onGenerateSampleFeed}
            variant="outline"
            className="h-9 text-xs rounded-xl font-bold gap-1.5"
            title="Generate sample bank statement feed corresponding to your ledger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Simulate Feed
          </Button>
        )}

        <Button
          onClick={onRunAutoMatch}
          disabled={isMatching || !hasStatementLines}
          variant="outline"
          className="h-9 text-xs rounded-xl font-bold border-primary text-primary hover:bg-primary/5 gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isMatching ? "Matching..." : "Run Auto-Match"}
        </Button>

        <Button
          onClick={onOpenImportModal}
          className="h-9 text-xs rounded-xl font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          Import Statement
        </Button>

        {hasStatementLines && onClearStatementFeeds && (
          <Button
            onClick={onClearStatementFeeds}
            variant="ghost"
            className="h-9 text-xs rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2.5"
            title="Clear all statement lines"
          >
            Clear Feeds
          </Button>
        )}
      </div>
    </div>
  );
};
