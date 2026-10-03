import React from "react";
import {
  BarChart3,
  Store,
  FileText,
  Package,
  Lightbulb,
  Calculator,
  Bell,
  Sun,
  LogOut,
  ChevronDown,
  TrendingUp,
  ShoppingBag,
  ArrowDownLeft,
  Barcode,
} from "lucide-react";

interface DashboardSimulatedSidebarProps {
  activeMenu: "dashboard" | "pos";
  onSelectMenu: (menu: "dashboard" | "pos") => void;
  businessMode: boolean;
  onToggleBusinessMode: () => void;
}

export const DashboardSimulatedSidebar: React.FC<DashboardSimulatedSidebarProps> = ({
  activeMenu,
  onSelectMenu,
  businessMode,
  onToggleBusinessMode,
}) => {
  return (
    <div className="w-full lg:w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-4">
        {/* Logo Row */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-sm">
              ₹
            </div>
            <div>
              <div className="font-black text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                <span className="text-violet-600">₹upee</span>
                <span className="text-emerald-500">Bill</span>
              </div>
              <div className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                FINANCE &amp; BILLING
              </div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs">
            &lt;
          </div>
        </div>

        {/* Store & PRO Badge */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              RUPEEBILL BUSINESS
            </span>
            <span className="text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded">
              PRO
            </span>
          </div>
          <div className="font-black text-xs text-slate-800 dark:text-slate-100 mt-1 truncate">
            Satyam Hardware &amp; material
          </div>
        </div>

        {/* Business Mode Toggle Switch */}
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
            Business Mode
          </span>
          <button
            onClick={onToggleBusinessMode}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              businessMode ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                businessMode ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="space-y-1 text-xs pt-1">
          {/* 1. Dashboard (Active Purple Gradient) */}
          <button
            onClick={() => onSelectMenu("dashboard")}
            className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center gap-3 transition-all ${
              activeMenu === "dashboard"
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-xs font-black leading-tight">Dashboard</div>
              <div
                className={`text-[10px] font-normal ${
                  activeMenu === "dashboard" ? "text-violet-200" : "text-slate-400"
                }`}
              >
                Business Analytics
              </div>
            </div>
          </button>

          {/* 2. Retail POS */}
          <button
            onClick={() => onSelectMenu("pos")}
            className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center gap-3 transition-all ${
              activeMenu === "pos"
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-xs font-black leading-tight">Retail POS</div>
              <div className="text-[10px] font-normal text-slate-400">
                Counter Billing &amp; Barcode
              </div>
            </div>
          </button>

          {/* 3. Sales & Invoices */}
          <div className="pt-1">
            <div className="flex items-center justify-between p-2 text-slate-600 dark:text-slate-400 font-bold">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs font-black leading-tight">Sales &amp; Invoices</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    Invoices &amp; Receipts
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="pl-9 space-y-1 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="py-1 hover:text-violet-600 cursor-pointer flex items-center gap-2">
                <FileText className="w-3 h-3" /> Sales
              </div>
              <div className="py-1 hover:text-violet-600 cursor-pointer flex items-center gap-2">
                <ArrowDownLeft className="w-3 h-3" /> Payment In
              </div>
              <div className="py-1 hover:text-violet-600 cursor-pointer flex items-center gap-2">
                <ShoppingBag className="w-3 h-3" /> Sales Order
              </div>
            </div>
          </div>

          {/* 4. Inventory */}
          <div className="pt-1">
            <div className="flex items-center justify-between p-2 text-slate-600 dark:text-slate-400 font-bold">
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs font-black leading-tight">Inventory</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    Manage Products
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="pl-9 space-y-1 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="py-1 hover:text-violet-600 cursor-pointer flex items-center gap-2">
                <Package className="w-3 h-3" /> Products &amp; Stock
              </div>
              <div className="py-1 hover:text-violet-600 cursor-pointer flex items-center gap-2">
                <Barcode className="w-3 h-3" /> Barcode Management
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Footer Items */}
      <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 cursor-pointer">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Request a Feature
        </div>
        <div className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 cursor-pointer">
          <Calculator className="w-3.5 h-3.5 text-primary" /> GST &amp; Calculator
        </div>

        {/* Bottom Controls Bar */}
        <div className="flex items-center justify-between pt-2 text-slate-400">
          <Bell className="w-4 h-4 cursor-pointer hover:text-slate-600" />
          <Sun className="w-4 h-4 cursor-pointer hover:text-amber-500" />
          <LogOut className="w-4 h-4 cursor-pointer hover:text-rose-500" />
        </div>
      </div>
    </div>
  );
};
