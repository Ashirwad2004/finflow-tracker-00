import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

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

interface ExpenseChartProps {
  expenses: Expense[];
}

export const ExpenseChart = ({ expenses }: ExpenseChartProps) => {
  // Group expenses by category
  const categoryData = expenses.reduce((acc, expense) => {
    const categoryName = expense.categories.name;
    const categoryColor = expense.categories.color;
    const amount = parseFloat(expense.amount.toString());

    const existing = acc.find((item) => item.name === categoryName);
    if (existing) {
      existing.value += amount;
    } else {
      acc.push({
        name: categoryName,
        value: amount,
        color: categoryColor,
      });
    }
    return acc;
  }, [] as Array<{ name: string; value: number; color: string }>);

  if (categoryData.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>No Data</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Add expenses to see your spending breakdown</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `₹${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {categoryData.map((category, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-muted-foreground">{category.name}</span>
              </div>
              <span className="font-medium">₹{category.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
