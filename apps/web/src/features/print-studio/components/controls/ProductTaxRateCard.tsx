import { Percent } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ProductTaxRateCardProps {
  showItemTaxRate: boolean;
  onToggleShowItemTax: (checked: boolean) => void;
}

export function ProductTaxRateCard({ showItemTaxRate, onToggleShowItemTax }: ProductTaxRateCardProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Percent className="w-3.5 h-3.5 text-primary" />
          6. Product Tax % on Bill
        </h2>
        <Switch checked={showItemTaxRate} onCheckedChange={onToggleShowItemTax} />
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        {showItemTaxRate
          ? "Showing item-level GST / Tax % column on printed bills and PDF downloads."
          : "Tax % column is hidden on bills. Switch on to display individual product tax rates."}
      </p>
    </div>
  );
}
