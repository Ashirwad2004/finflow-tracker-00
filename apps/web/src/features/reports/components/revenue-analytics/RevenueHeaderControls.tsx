import React from "react";
import { Activity, BarChart2 } from "lucide-react";
import { FilterMode, ChartMode } from "./types";

interface RevenueHeaderControlsProps {
  filter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
  chartType: ChartMode;
  onChartTypeChange: (chartType: ChartMode) => void;
  filterLabel: string;
}

const filters: { id: FilterMode; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export const RevenueHeaderControls: React.FC<RevenueHeaderControlsProps> = ({
  filter,
  onFilterChange,
  chartType,
  onChartTypeChange,
  filterLabel,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-violet-500 inline-block" />
          Revenue Analytics
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {filterLabel} — revenue, expenses &amp; profitability at a glance
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                filter === f.id
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
          <button
            onClick={() => onChartTypeChange("area")}
            title="Area Chart"
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              chartType === "area"
                ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChartTypeChange("bar")}
            title="Bar Chart"
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              chartType === "bar"
                ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
