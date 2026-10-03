import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { CustomTooltip } from "./CustomTooltip";
import { ChartMode, FilterMode, ChartDataPoint } from "./types";

interface RevenueChartCardProps {
  chartData: ChartDataPoint[];
  chartType: ChartMode;
  filter: FilterMode;
  filterLabel: string;
  formatCurrency: (amount: number) => string;
}

export const RevenueChartCard: React.FC<RevenueChartCardProps> = ({
  chartData,
  chartType,
  filter,
  filterLabel,
  formatCurrency,
}) => {
  return (
    <div className="xl:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white">Revenue vs Costs</h4>
          <p className="text-xs text-slate-500 mt-0.5">{filterLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Revenue
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Purchases
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> Expenses
          </span>
        </div>
      </div>
      <div className="w-full h-[280px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#137fec" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="purGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval={filter === "daily" ? 4 : 0}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                width={45}
              />
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
              <Area type="monotone" dataKey="revenue" stroke="#137fec" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="purchases" stroke="#f43f5e" strokeWidth={2.5} fill="url(#purGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="expenses" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#expGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval={filter === "daily" ? 4 : 0}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                width={45}
              />
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
              <Bar dataKey="revenue" fill="#137fec" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="purchases" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="expenses" fill="#2dd4bf" radius={[4, 4, 0, 0]} maxBarSize={32} fillOpacity={0.75} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
