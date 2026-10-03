import React from "react";
import { CheckCircle, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BorrowedMoneyRecord } from "./borrowedMoneyPdfExport";

interface RecentlyRepaidBorrowedListProps {
  repaidDebts: BorrowedMoneyRecord[];
  formatCurrency: (amount: number) => string;
  onDelete: (debt: BorrowedMoneyRecord) => void;
}

export const RecentlyRepaidBorrowedList: React.FC<RecentlyRepaidBorrowedListProps> = ({
  repaidDebts,
  formatCurrency,
  onDelete,
}) => {
  if (repaidDebts.length === 0) return null;

  return (
    <div className="pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2">Recently repaid ({repaidDebts.length})</p>
      <div className="space-y-2">
        {repaidDebts.slice(0, 3).map((debt) => (
          <div key={debt.id} className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm">
            <span className="text-muted-foreground truncate">{debt.person_name}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                {formatCurrency(parseFloat(debt.amount.toString()))}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onDelete(debt)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
