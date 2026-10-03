import { History, FileText, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/core/lib/utils";

interface RecentSalesSelectorCardProps {
  recentSales: any[];
  isLoading: boolean;
  selectedSale: any;
  onSelectSale: (sale: any) => void;
  formatCurrency: (amount: number) => string;
}

export function RecentSalesSelectorCard({
  recentSales,
  isLoading,
  selectedSale,
  onSelectSale,
  formatCurrency,
}: RecentSalesSelectorCardProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
      <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
        <History className="w-3.5 h-3.5 text-primary" />
        2. Choose Invoice Record
      </h2>

      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-9 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : recentSales.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground border border-dashed border-border rounded-xl">
            <FileText className="w-5 h-5 mx-auto mb-1 opacity-40" />
            <p className="text-[11px] font-medium">No sales recorded yet</p>
            <p className="text-[9px] opacity-75 mt-0.5">Showing mock invoice preview</p>
          </div>
        ) : (
          recentSales.map((sale: any) => {
            const isSelected = selectedSale?.id === sale.id;
            return (
              <button
                key={sale.id}
                onClick={() => onSelectSale(sale)}
                className={cn(
                  "w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2.5 text-xs",
                  isSelected
                    ? "border-primary bg-primary/5 font-semibold text-primary"
                    : "border-border hover:bg-muted/40 text-slate-700 dark:text-slate-200"
                )}
              >
                <div className="min-w-0">
                  <p className="font-bold truncate text-[11px]">{sale.customer_name || "Walk-in Guest"}</p>
                  <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span>{sale.invoice_number || `INV-${sale.id.slice(0, 6).toUpperCase()}`}</span>
                    <span>•</span>
                    <span>
                      {(() => {
                        const d = new Date(sale.created_at);
                        return isNaN(d.getTime()) ? "N/A" : format(d, "MMM d");
                      })()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100">
                    {formatCurrency(sale.total_amount)}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
