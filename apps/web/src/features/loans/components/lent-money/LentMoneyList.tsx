import React from "react";
import { format } from "date-fns";
import { User, Calendar, CheckCircle, AlertCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LentMoneyRecord } from "./lentMoneyPdfExport";

interface LentMoneyListProps {
  pendingLoans: LentMoneyRecord[];
  formatCurrency: (amount: number) => string;
  onMarkRepaid: (id: string) => void;
  onEdit: (loan: LentMoneyRecord) => void;
  onDelete: (loan: LentMoneyRecord) => void;
}

export const LentMoneyList: React.FC<LentMoneyListProps> = ({
  pendingLoans,
  formatCurrency,
  onMarkRepaid,
  onEdit,
  onDelete,
}) => {
  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date() && new Date(dateString).toDateString() !== new Date().toDateString();
  };

  if (pendingLoans.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No pending loans</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto overscroll-contain">
      {pendingLoans.map((loan) => (
        <div
          key={loan.id}
          className={`flex items-start justify-between p-3 rounded-lg border transition-colors ${
            isOverdue(loan.due_date)
              ? "bg-destructive/10 border-destructive/30 hover:border-destructive/50"
              : "bg-muted/30 border-border/50 hover:border-border"
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate">{loan.person_name}</span>
              {isOverdue(loan.due_date) && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mb-1">{loan.description}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatCurrency(parseFloat(loan.amount.toString()))}
              </span>
              {loan.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due: {format(new Date(loan.due_date), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => onMarkRepaid(loan.id)}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Repaid
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
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
  );
};
