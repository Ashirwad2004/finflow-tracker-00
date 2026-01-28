import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, Label } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";

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
}

export const ExpenseChart = ({ expenses }: ExpenseChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const { formatCurrency } = useCurrency();

  const { chartData, totalAmount } = useMemo(() => {
    const data = expenses.reduce((acc, expense) => {
      const categoryName = expense.categories?.name || "Uncategorized";
      const categoryColor = expense.categories?.color || "#94a3b8";

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

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          className="drop-shadow-xl transition-all duration-300 ease-out"
        />
      </g>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center border-2 border-dashed rounded-xl bg-muted/20 border-border/50">
        <div className="p-4 bg-muted/50 rounded-full mb-4">
          <TrendingUp className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">No spending data yet</p>
      </div>
    );
  }

  // Calculate generic "Others" color or palette if needed, but we use data colors.

  return (
    <div className="flex flex-col h-full">
      {/* Chart Section - Centered */}
      <div className="relative h-[220px] w-full flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover/95 backdrop-blur-md border px-3 py-2 rounded-lg shadow-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                        <span className="text-xs font-semibold text-foreground">{data.name}</span>
                      </div>
                      <div className="text-sm font-bold text-foreground tabular-nums">
                        {formatCurrency(data.value)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="stroke-background stroke-[2px]"
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const isHovered = activeIndex !== undefined;
                    const hoverData = isHovered ? chartData[activeIndex] : null;

                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 8} // Moved slightly up
                          className="fill-muted-foreground text-xs font-medium uppercase tracking-wider"
                          style={{ fontSize: '10px' }}
                        >
                          {isHovered ? hoverData?.name.substring(0, 12) : "Total Spent"}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 12} // Moved slightly down
                          className="fill-foreground text-lg font-bold tracking-tight"
                          style={{ fontSize: '18px', fontWeight: 700 }}
                        >
                          {isHovered
                            ? formatCurrency(hoverData?.value || 0)
                            : formatCurrency(totalAmount)
                          }
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Section - Bottom Grid */}
      <div className="flex-1 mt-4 overflow-y-auto pr-1 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {chartData.map((item, index) => {
            const isHovered = activeIndex === index;
            return (
              <div
                key={item.name}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border border-transparent transition-all duration-200 cursor-default",
                  isHovered ? "bg-muted border-border/50 shadow-sm" : "hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium truncate text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-xs font-semibold tabular-nums">
                  {Math.round((item.value / totalAmount) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};