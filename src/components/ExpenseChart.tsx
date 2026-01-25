import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, TrendingUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- TYPES ---------------- */

interface Expense {
  id: string;
  amount: number;
  categories: {
    name: string;
    color: string;
  };
}

interface ExpenseChartProps {
  expenses: Expense[];
  currencyCode?: string;
}

/* ---------------- ACTIVE SHAPE (The "Pop" Effect) ---------------- */
// This custom renderer makes the hovered slice grow slightly larger
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6} // Expands by 6px
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-md transition-all duration-300"
      />
    </g>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */

export const ExpenseChart = ({ expenses, currencyCode = "INR" }: ExpenseChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Data Processing
  const { chartData, totalAmount } = useMemo(() => {
    const data = expenses.reduce((acc, expense) => {
      // Safety check: if categories is missing/null, use a fallback
      const categoryName = expense.categories?.name || "Uncategorized";
      const categoryColor = expense.categories?.color || "#94a3b8"; // slate-400

      const amount = Number(expense.amount);
      const existing = acc.find((item) => item.name === categoryName);

      if (existing) {
        existing.value += amount;
      } else {
        acc.push({ name: categoryName, value: amount, color: categoryColor });
      }

      return acc;
    }, [] as Array<{ name: string; value: number; color: string }>);

    const sorted = data.sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, item) => sum + item.value, 0);

    return { chartData: sorted, totalAmount: total };
  }, [expenses]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(val);

  // Empty State
  if (chartData.length === 0) {
    return (
      <Card className="h-full border-dashed shadow-none bg-muted/10">
        <CardContent className="flex flex-col items-center justify-center h-[300px] gap-4">
          <div className="p-4 bg-muted rounded-full">
            <Wallet className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-muted-foreground">No expenses yet</p>
            <p className="text-xs text-muted-foreground/60">Your analytics will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/20 overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-0 pt-6 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            Analytics
          </CardTitle>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Spent</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6">
        <div className="flex flex-col md:flex-row items-center gap-8 h-full">

          {/* LEFT: THE CHART */}
          <div className="relative w-full md:w-1/2 h-[260px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip cursor={false} content={<CustomTooltip formatCurrency={formatCurrency} />} />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70} // Thinner, modern look
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-all duration-300 outline-none"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Data for Mobile (Total) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none md:hidden">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Total</span>
              <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* RIGHT: THE MODERN LEGEND */}
          <div className="w-full md:w-1/2 h-full min-h-0 flex flex-col">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider px-2">
              <span>Category</span>
              <span>% Share</span>
            </div>

            <ScrollArea className="h-[220px] w-full pr-3 -mr-3">
              <div className="space-y-3">
                {chartData.map((item, index) => {
                  const percent = ((item.value / totalAmount) * 100).toFixed(1);
                  const isActive = activeIndex === index;

                  return (
                    <div
                      key={item.name}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(undefined)}
                      className={cn(
                        "group relative flex flex-col gap-1.5 p-3 rounded-xl transition-all duration-200 cursor-pointer border border-transparent",
                        isActive
                          ? "bg-accent/50 border-border shadow-sm scale-[1.02]"
                          : "hover:bg-muted/40"
                      )}
                    >
                      {/* Row 1: Name and Amount */}
                      <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-2.5 h-2.5 rounded-full transition-transform duration-300",
                              isActive ? "scale-125 ring-2 ring-offset-2 ring-offset-card" : ""
                            )}
                            style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}40` }}
                          />
                          <span className={cn("font-medium text-sm", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(item.value)}
                        </span>
                      </div>

                      {/* Row 2: Progress Bar Visual */}
                      <div className="relative w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: item.color,
                            opacity: isActive ? 1 : 0.7
                          }}
                        />
                      </div>

                      {/* Percent Label (Small) */}
                      <div className="flex justify-end">
                        <span className="text-[10px] text-muted-foreground font-medium">{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

/* ---------------- CUSTOM TOOLTIP COMPONENT ---------------- */

const CustomTooltip = ({ active, payload, formatCurrency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border px-3 py-2 rounded-lg shadow-xl outline-none">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="text-xs font-semibold text-popover-foreground">{data.name}</span>
        </div>
        <p className="text-sm font-bold text-popover-foreground tabular-nums">
          {formatCurrency(data.value)}
        </p>
      </div>
    );
  }
  return null;
};