import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { PartySummary, GroupReportItem, LentMoneyItem, BorrowedMoneyItem } from "./types";

interface PartyWiseReportTableProps {
  isLoading: boolean;
  parties: PartySummary[];
}

export function PartyWiseReportTable({ isLoading, parties }: PartyWiseReportTableProps) {
  const { formatCurrency } = useCurrency();

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">Party Name</th>
              <th className="px-6 py-4 text-right">Total Lent (By You)</th>
              <th className="px-6 py-4 text-right">Total Borrowed (By You)</th>
              <th className="px-6 py-4 text-right">Net Balance</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  Generating report...
                </td>
              </tr>
            ) : parties.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  No data available for parties.
                </td>
              </tr>
            ) : (
              parties.map((party) => (
                <tr key={party.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold max-w-xs truncate">{party.name}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(party.lent)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-rose-600 dark:text-rose-400">
                    {formatCurrency(party.borrowed)}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-extrabold ${
                      party.net > 0 ? "text-emerald-600" : party.net < 0 ? "text-rose-600" : "text-slate-500"
                    }`}
                  >
                    {party.net > 0 ? "+" : ""}
                    {formatCurrency(party.net)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {party.net > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">
                        You Owed
                      </Badge>
                    )}
                    {party.net < 0 && (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none">
                        You Owe
                      </Badge>
                    )}
                    {party.net === 0 && (
                      <Badge variant="outline" className="text-slate-500">
                        Settled
                      </Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface LentReportTableProps {
  isLoading: boolean;
  lentMoney: LentMoneyItem[];
  formatDateSafe: (dateStr: string | null | undefined, formatTemplate: string) => string;
}

export function LentReportTable({ isLoading, lentMoney, formatDateSafe }: LentReportTableProps) {
  const { formatCurrency } = useCurrency();

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Lent To</th>
              <th className="px-6 py-4">Purpose / Memo</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  Loading lent items...
                </td>
              </tr>
            ) : lentMoney.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  No money lent found.
                </td>
              </tr>
            ) : (
              lentMoney.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDateSafe(item.created_at, "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 font-bold">{item.person_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{item.purpose || "-"}</td>
                  <td className="px-6 py-4 text-center">
                    <Badge
                      variant={item.status === "paid" ? "default" : "secondary"}
                      className={item.status === "paid" ? "bg-emerald-500" : ""}
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-emerald-600">
                    {formatCurrency(Number(item.amount))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface BorrowedReportTableProps {
  isLoading: boolean;
  borrowedMoney: BorrowedMoneyItem[];
  formatDateSafe: (dateStr: string | null | undefined, formatTemplate: string) => string;
}

export function BorrowedReportTable({ isLoading, borrowedMoney, formatDateSafe }: BorrowedReportTableProps) {
  const { formatCurrency } = useCurrency();

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-rose-50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/50 text-[11px] font-extrabold text-rose-700 dark:text-rose-500 uppercase tracking-wider">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Borrowed From</th>
              <th className="px-6 py-4">Purpose / Memo</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  Loading borrowed items...
                </td>
              </tr>
            ) : borrowedMoney.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  No money borrowed found.
                </td>
              </tr>
            ) : (
              borrowedMoney.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDateSafe(item.created_at, "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 font-bold">{item.person_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{item.purpose || "-"}</td>
                  <td className="px-6 py-4 text-center">
                    <Badge
                      variant={item.status === "paid" ? "default" : "secondary"}
                      className={item.status === "paid" ? "bg-emerald-500" : ""}
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-rose-600">
                    {formatCurrency(Number(item.amount))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface ExpensesRecapTableProps {
  isLoading: boolean;
  expenses: any[];
  formatDateSafe: (dateStr: string | null | undefined, formatTemplate: string) => string;
}

export function ExpensesRecapTable({ isLoading, expenses, formatDateSafe }: ExpensesRecapTableProps) {
  const { formatCurrency } = useCurrency();

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  Loading expenses...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  No expenses found.
                </td>
              </tr>
            ) : (
              expenses.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDateSafe(item.date, "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${item.categories?.color}15` }}
                      >
                        <CategoryIcon
                          name={item.categories?.icon}
                          className="w-4 h-4"
                          color={item.categories?.color}
                        />
                      </div>
                      <span className="font-semibold text-sm">{item.categories?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{item.description}</td>
                  <td className="px-6 py-4 text-right font-extrabold">{formatCurrency(item.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface GroupReportTableProps {
  isLoading: boolean;
  groupReports: GroupReportItem[];
}

export function GroupReportTable({ isLoading, groupReports }: GroupReportTableProps) {
  const { formatCurrency } = useCurrency();

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-violet-50 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900/50 text-[11px] font-extrabold text-violet-700 dark:text-violet-400 uppercase tracking-wider">
              <th className="px-6 py-4">Group</th>
              <th className="px-6 py-4 text-center">Members</th>
              <th className="px-6 py-4 text-right">Total Spent</th>
              <th className="px-6 py-4 text-right">Your Balance</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  Loading group report...
                </td>
              </tr>
            ) : groupReports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  No group activity found.
                </td>
              </tr>
            ) : (
              groupReports.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold">{group.name}</td>
                  <td className="px-6 py-4 text-center">{group.members}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-200">
                    {formatCurrency(group.totalSpent)}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-extrabold ${
                      group.balance > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : group.balance < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-500"
                    }`}
                  >
                    {group.balance > 0 ? "+" : ""}
                    {formatCurrency(group.balance)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {group.balance > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">
                        You are owed
                      </Badge>
                    )}
                    {group.balance < 0 && (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none">
                        You owe
                      </Badge>
                    )}
                    {group.balance === 0 && (
                      <Badge variant="outline" className="text-slate-500">
                        Settled
                      </Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
