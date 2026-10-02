import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { FinFlowReportId, ReportMenuItem } from "../../reportMenu";

interface ReportsSidebarProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  sidebarSearch: string;
  setSidebarSearch: (val: string) => void;
  categoriesMap: Map<string, ReportMenuItem[]>;
  activeReportId: FinFlowReportId;
  onSelectReport: (id: FinFlowReportId) => void;
  totalReports: number;
}

export const ReportsSidebar: React.FC<ReportsSidebarProps> = ({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  sidebarSearch,
  setSidebarSearch,
  categoriesMap,
  activeReportId,
  onSelectReport,
  totalReports,
}) => {
  return (
    <aside
      className={`${
        isSidebarCollapsed ? "hidden" : "flex"
      } w-full lg:w-[280px] shrink-0 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex-col h-auto max-h-[220px] lg:max-h-none lg:h-full min-h-0 overflow-hidden transition-all`}
    >
      {/* Sidebar Header & Search */}
      <div className="shrink-0 p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            FinFlow Reports ({totalReports})
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Close report menu"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <Input
            placeholder="Search reports..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* Categorized Report List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        {Array.from(categoriesMap.entries()).map(([category, items]) => (
          <div key={category} className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {category}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const isSelected = activeReportId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectReport(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                      isSelected
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.tag && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {item.tag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
