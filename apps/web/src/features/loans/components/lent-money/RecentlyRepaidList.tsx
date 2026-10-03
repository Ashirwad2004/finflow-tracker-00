import React from "react";
import { CheckCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LentMoneyRecord } from "./lentMoneyPdfExport";

interface RecentlyRepaidListProps {
  repaidLoans: LentMoneyRecord[];
  formatCurrency: (amount: number) => string;
  onEdit: (loan: LentMoneyRecord) => void;
  onDelete: (loan: LentMoneyRecord) => void;
}

export const RecentlyRepaidList: React.FC<RecentlyRepaidListProps> = ({
  repaidLoans,
  formatCurrency,
  onEdit,
  onDelete,
}) => {
  if (repaidLoans.length === 0) return null;

  return (
    <div className="pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2">Recently repaid ({repaidLoans.length})</p>
      <div className="space-y-2">
        {repaidLoans.slice(0, 3).map((loan) => (
          <div key={loan.id} className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm">
            <span className="text-muted-foreground truncate">{loan.person_name}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                {formatCurrency(parseFloat(loan.amount.toString()))}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(loan)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(loan)}
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
