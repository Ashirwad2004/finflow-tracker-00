import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { LabelProductItem } from "./types";

interface BarcodeProductListProps {
  items: LabelProductItem[];
  totalLabelCount: number;
  onUpdateCopies: (id: string, copies: number) => void;
  onRemoveItem: (id: string) => void;
}

export const BarcodeProductList: React.FC<BarcodeProductListProps> = ({
  items,
  totalLabelCount,
  onUpdateCopies,
  onRemoveItem,
}) => {
  return (
    <div className="bg-card border border-border/80 p-4 rounded-2xl space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Products to Print ({items.length})
        </Label>
        <Badge
          variant="outline"
          className="text-xs border-primary/30 text-primary bg-primary/10 font-semibold"
        >
          Total {totalLabelCount} Labels
        </Badge>
      </div>

      <div className="divide-y divide-border/60 max-h-48 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="py-2 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground truncate">
                {item.name}
              </div>
              <div className="font-mono text-muted-foreground text-[11px] flex items-center gap-2 mt-0.5">
                <span>{item.barcode}</span>
                <span>• ₹{item.price.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[11px]">Copies:</span>
              <Input
                type="number"
                min="1"
                max="500"
                value={item.copies}
                onChange={(e) =>
                  onUpdateCopies(item.id, parseInt(e.target.value) || 1)
                }
                className="w-16 h-7 text-center bg-background border-border text-foreground font-mono text-xs rounded-lg"
              />
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
