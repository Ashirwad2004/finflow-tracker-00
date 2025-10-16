import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categories: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export const ExpenseList = ({ expenses, isLoading, onDelete }: ExpenseListProps) => {
  const downloadCSV = (data: Expense[]) => {
    if (!data || data.length === 0) return;
    const header = ['id', 'description', 'amount', 'date', 'category'];
    const rows = data.map((e) => {
      const amount = typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount) || '0');
      return [
        e.id,
        (e.description ?? '').replace(/"/g, '""'),
        amount.toFixed(2),
        e.date ?? '',
        (e.categories?.name ?? '').replace(/"/g, '""'),
      ];
    });

    const csv = [header, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // revoke after a short delay to ensure download started
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No expenses yet. Add your first expense to get started!</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName.split('-').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('')];
    return Icon || LucideIcons.Circle;
  };

  return (
    <Card className="shadow-card">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-medium">Expenses</h3>
          <Button onClick={() => downloadCSV(expenses)} variant="outline" size="sm">
            Download CSV
          </Button>
        </div>

        <div className="divide-y divide-border">
          {expenses.map((expense) => {
            const Icon = getIcon(expense.categories.icon);
            return (
              <div
                key={expense.id}
                className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `₹{expense.categories.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: expense.categories.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{expense.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{expense.categories.name}</span>
                      <span>•</span>
                      <span>{new Date(expense.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-lg text-foreground">
                    ₹{parseFloat(expense.amount.toString()).toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(expense.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
