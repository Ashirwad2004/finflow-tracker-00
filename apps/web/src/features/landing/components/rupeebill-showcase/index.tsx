import React, { useState } from "react";
import { Settings } from "lucide-react";
import { AnalyticsPeriod, PERIOD_METRICS } from "./constants";
import { DashboardTitleBar } from "./DashboardTitleBar";
import { DashboardSimulatedSidebar } from "./DashboardSimulatedSidebar";
import { DashboardOverviewCards } from "./DashboardOverviewCards";
import { DashboardRevenueAnalytics } from "./DashboardRevenueAnalytics";

export * from "./constants";
export * from "./DashboardTitleBar";
export * from "./DashboardSimulatedSidebar";
export * from "./DashboardOverviewCards";
export * from "./DashboardRevenueAnalytics";

export const RealRupeeBillDashboard: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "pos">("dashboard");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("monthly");
  const [businessMode, setBusinessMode] = useState(true);

  const metrics = PERIOD_METRICS[analyticsPeriod];

  return (
    <div className="w-full rounded-2xl md:rounded-3xl border-2 border-slate-700/60 bg-white dark:bg-[#0f172a] shadow-2xl overflow-hidden text-left font-sans transition-all">
      {/* 1. TOP WINDOWS NATIVE TITLE BAR */}
      <DashboardTitleBar />

      {/* 2. MAIN APPLICATION INTERFACE (Sidebar + Content Workspace) */}
      <div className="flex flex-col lg:flex-row min-h-[640px] bg-[#f8fafc] dark:bg-[#090d16]">
        {/* Left Sidebar */}
        <DashboardSimulatedSidebar
          activeMenu={activeMenu}
          onSelectMenu={setActiveMenu}
          businessMode={businessMode}
          onToggleBusinessMode={() => setBusinessMode(!businessMode)}
        />

        {/* Right Main Workspace */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          {/* Main Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Financial Overview
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time financial overview and performance metrics
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50">
                <Settings className="w-3.5 h-3.5 text-slate-400" /> Profile
              </button>
              <button className="px-3.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-black shadow-xs">
                All Time
              </button>
            </div>
          </div>

          {/* 4 Overview Metric Cards */}
          <DashboardOverviewCards metrics={metrics} />

          {/* Revenue Analytics Container */}
          <DashboardRevenueAnalytics
            analyticsPeriod={analyticsPeriod}
            onSelectPeriod={setAnalyticsPeriod}
            metrics={metrics}
          />
        </div>
      </div>
    </div>
  );
};

export default RealRupeeBillDashboard;
