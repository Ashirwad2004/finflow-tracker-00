import React from "react";
import { Search, User, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SaleRecord } from "./types";

interface POSReturnSearchStepProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearching: boolean;
  onSearch: (e?: React.FormEvent) => void;
  searchResults: SaleRecord[];
  onSelectSale: (sale: SaleRecord) => void;
}

export const POSReturnSearchStep = ({
  searchQuery,
  setSearchQuery,
  isSearching,
  onSearch,
  searchResults,
  onSelectSale,
}: POSReturnSearchStepProps) => {
  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter Invoice Number (e.g. INV-202609-001) or customer name / mobile..."
            className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl text-sm focus-visible:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={isSearching}
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 font-semibold rounded-xl shadow-xs"
        >
          {isSearching ? "Searching..." : "Find Invoice"}
        </Button>
      </form>

      {/* Search Results List */}
      <div className="space-y-2 mt-4">
        {searchResults.length > 0 && (
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Matching Invoices ({searchResults.length})
          </p>
        )}
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {searchResults.map((sale) => (
            <div
              key={sale.id}
              onClick={() => onSelectSale(sale)}
              className="p-4 rounded-xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {sale.invoice_number}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-border text-muted-foreground uppercase font-semibold"
                  >
                    {sale.payment_method}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {sale.customer_name || "Walk-in Customer"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(sale.date).toLocaleDateString()}
                  </span>
                  <span>{sale.items?.length || 0} line items</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-base font-black text-foreground font-mono">
                    ₹{Number(sale.total_amount).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                    Paid
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
