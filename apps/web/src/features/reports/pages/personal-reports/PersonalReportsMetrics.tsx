import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { LentMoneyItem, BorrowedMoneyItem } from "./types";

interface PersonalReportsMetricsProps {
  totalLent: number;
  totalBorrowed: number;
  totalExpenses: number;
  lentMoney: LentMoneyItem[];
  borrowedMoney: BorrowedMoneyItem[];
  expensesCount: number;
}

export function PersonalReportsMetrics({
  totalLent,
  totalBorrowed,
  totalExpenses,
  lentMoney,
  borrowedMoney,
  expensesCount,
}: PersonalReportsMetricsProps) {
  const { formatCurrency } = useCurrency();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="hover:shadow-md transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Total Money Lent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-extrabold">{formatCurrency(totalLent)}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                To {new Set(lentMoney.map((i) => i.person_name)).size} people
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Total Money Borrowed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-extrabold">{formatCurrency(totalBorrowed)}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                From {new Set(borrowedMoney.map((i) => i.person_name)).size} people
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Total Expenses Recorded
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-extrabold">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Across {expensesCount} transactions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
