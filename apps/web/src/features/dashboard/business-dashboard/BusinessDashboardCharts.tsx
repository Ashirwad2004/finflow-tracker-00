import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { COLORS } from "./useBusinessDashboardData";

interface BusinessDashboardChartsProps {
  chartData: Array<{
    name: string;
    revenue: number;
    purchases: number;
    expenses: number;
  }>;
  pieData: Array<{ name: string; value: number }>;
  totalRevenue: number;
  formatCurrency: (amount: number) => string;
}

export function BusinessDashboardCharts({
  chartData,
  pieData,
  totalRevenue,
  formatCurrency,
}: BusinessDashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* Large Line Chart */}
      <div className="p-6 bg-white border shadow-sm xl:col-span-2 dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">
            Profit & Loss Performance
          </h4>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full size-3 bg-primary"></span>
              <span className="text-xs text-slate-500">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full size-3 bg-rose-500"></span>
              <span className="text-xs text-slate-500">Purchases</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full size-3 bg-teal-400"></span>
              <span className="text-xs text-slate-500">Expenses</span>
            </div>
          </div>
        </div>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                opacity={0.4}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                dy={10}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#137fec"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="purchases"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#2dd4bf"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Doughnut Chart */}
      <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 flex flex-col items-center">
        <h4 className="w-full mb-6 text-lg font-bold text-slate-900 dark:text-white text-left">
          Revenue by Customer
        </h4>
        <div className="relative flex items-center justify-center w-full h-[200px] mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {totalRevenue > 1000
                ? `${(totalRevenue / 1000).toFixed(1)}k`
                : formatCurrency(totalRevenue)}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
              Total
            </span>
          </div>
        </div>
        <div className="w-full space-y-3">
          {pieData.map((entry, index) => {
            const pct =
              totalRevenue > 0
                ? ((entry.value / totalRevenue) * 100).toFixed(1)
                : 0;
            return (
              <div
                key={entry.name}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full size-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></span>
                  <span className="truncate max-w-[120px] text-slate-600 dark:text-slate-400">
                    {entry.name}
                  </span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
