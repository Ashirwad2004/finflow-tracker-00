import { format } from "date-fns";
import { MoreVertical, PlusCircle, MinusCircle } from "lucide-react";

interface BusinessDashboardRecentActivityProps {
  topCustomers: Array<{ name: string; revenue: number }>;
  combinedHistory: Array<{
    id: string;
    type: "sale" | "purchase" | "expense";
    title: string;
    ref: string;
    amount: number;
    date: Date;
  }>;
  formatCurrency: (amount: number) => string;
  onViewAllParties: () => void;
}

export function BusinessDashboardRecentActivity({
  topCustomers,
  combinedHistory,
  formatCurrency,
  onViewAllParties,
}: BusinessDashboardRecentActivityProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* Top Customers Table */}
      <div className="overflow-hidden bg-white border shadow-sm xl:col-span-2 dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">
            Top Customers
          </h4>
          <button
            className="text-sm font-semibold text-primary hover:underline"
            onClick={onViewAllParties}
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-semibold tracking-wider uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {topCustomers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    No customers yet
                  </td>
                </tr>
              )}
              {topCustomers.map((customer) => (
                <tr key={customer.name}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center font-bold text-white bg-indigo-500 rounded-full size-8">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {customer.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-right text-slate-900 dark:text-slate-100">
                    {formatCurrency(customer.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="flex flex-col overflow-hidden bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">
            Recent Transactions
          </h4>
          <MoreVertical className="w-5 h-5 cursor-pointer text-slate-400" />
        </div>
        <div className="flex-1 overflow-y-auto max-h-[400px] overscroll-contain">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {combinedHistory.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No transactions recorded yet.
              </div>
            )}
            {combinedHistory.map((tx) => (
              <div
                key={`${tx.type}-${tx.id}`}
                className="flex items-center justify-between p-4 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  {tx.type === "sale" ? (
                    <div className="flex items-center justify-center rounded-lg size-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                      <PlusCircle className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-lg size-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600">
                      <MinusCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                      {tx.title}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {format(tx.date, "MMM dd, yyyy")} • {tx.ref}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold ${
                    tx.type === "sale"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {tx.type === "sale" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
