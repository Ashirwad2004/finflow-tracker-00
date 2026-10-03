import { Activity, ArrowRightLeft, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PaymentStats } from "../types";

interface RevenueAnalyticsTabProps {
  isLoadingStats: boolean;
  analyticsData: { stats: PaymentStats | null };
  chartData: Array<{ name: string; revenue: number }>;
}

export function RevenueAnalyticsTab({
  isLoadingStats,
  analyticsData,
  chartData,
}: RevenueAnalyticsTabProps) {
  if (isLoadingStats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!analyticsData.stats) {
    return (
      <div className="text-center py-20 border rounded-xl bg-card">
        <p className="text-muted-foreground text-sm">No analytics statistics compiled yet.</p>
      </div>
    );
  }

  const colors = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444"];
  const badgeColors = ["bg-indigo-600", "bg-emerald-500", "bg-amber-500", "bg-red-500"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Monthly distribution line chart */}
        <div className="lg:col-span-2 bg-card border rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Daily Sales Activity (Gateway Volume)
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`INR ${value}`, "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 col: payment methods distribution */}
        <div className="bg-card border rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            Methods Distribution
          </h3>
          <div className="h-[180px] flex-1 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.stats.paymentMethodsBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {analyticsData.stats.paymentMethodsBreakdown.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] text-muted-foreground border-t pt-4">
            {analyticsData.stats.paymentMethodsBreakdown.map((entry: any, i: number) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${badgeColors[i % badgeColors.length]}`} />
                <span className="font-semibold text-foreground">
                  {entry.name} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
