import React, { useState } from "react";
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
  ChevronUp, 
  Wallet, 
  Landmark, 
  ReceiptText, 
  TrendingUp, 
  IndianRupee, 
  Layers, 
  Activity, 
  ArrowUpRight, 
  Settings, 
  ShoppingBag, 
  ArrowDownLeft, 
  Barcode, 
  Minus,
  Sparkles,
  Printer,
  QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const RealRupeeBillDashboard: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "pos">("dashboard");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [businessMode, setBusinessMode] = useState(true);

  // Dynamic KPI amounts based on period filter
  const metrics = {
    daily: {
      revenue: "₹18,450.00",
      profit: "₹4,312.00",
      purchases: "₹9,230.00",
      cashflow: "₹4,312.00",
      analyticsRev: "₹18,450.00",
      expenses: "₹450.00",
      netProfit: "₹4,312.00",
      avgPeriod: "₹18,450.00",
      topPeriod1: "Today, 05:42 PM",
      topAmount1: "₹18,450.00",
      topPeriod2: "Yesterday",
      topAmount2: "₹16,210.00",
    },
    monthly: {
      revenue: "₹473,383,953.67",
      profit: "₹421,804,151.67",
      purchases: "₹52,278,832.60",
      cashflow: "₹421,805,448.93",
      analyticsRev: "₹473,383,953.67",
      expenses: "₹1,297,717.26",
      netProfit: "₹472,086,236.41",
      avgPeriod: "₹59,172,994.21",
      topPeriod1: "Sep 26",
      topAmount1: "₹467,390,968.16",
      topPeriod2: "May 26",
      topAmount2: "₹3,136,284.81",
    },
    yearly: {
      revenue: "₹1,842,910,240.00",
      profit: "₹1,410,250,890.00",
      purchases: "₹382,910,400.00",
      cashflow: "₹1,410,250,890.00",
      analyticsRev: "₹1,842,910,240.00",
      expenses: "₹14,290,110.00",
      netProfit: "₹1,395,960,780.00",
      avgPeriod: "₹153,575,853.00",
      topPeriod1: "FY 2025-26",
      topAmount1: "₹1,842,910,240.00",
      topPeriod2: "FY 2024-25",
      topAmount2: "₹1,204,500,100.00",
    },
  }[analyticsPeriod];

  return (
    <div className="w-full rounded-2xl md:rounded-3xl border-2 border-slate-700/60 bg-white dark:bg-[#0f172a] shadow-2xl overflow-hidden text-left font-sans transition-all">
      
      {/* 1. TOP WINDOWS NATIVE TITLE BAR (Exact match to screenshot) */}
      <div className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#9333ea] px-4 py-2 flex items-center justify-between text-white text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs tracking-wide flex items-center gap-1.5 truncate max-w-[280px] sm:max-w-none">
            <span className="w-2.5 h-2.5 rounded-full bg-white/30 inline-block" />
            RupeeBill Tracker - RupeeBill — Billing, Inventory &amp; Online Store
          </span>
        </div>

        {/* Windows Controls */}
        <div className="flex items-center gap-3 text-white/80 font-mono text-xs">
          <span className="hover:text-white cursor-pointer hidden sm:inline">⧉</span>
          <span className="hover:text-white cursor-pointer hidden sm:inline">⋮</span>
          <span className="hover:text-white cursor-pointer text-base leading-none">─</span>
          <span className="hover:text-white cursor-pointer text-sm leading-none">□</span>
          <span className="hover:text-white cursor-pointer text-sm leading-none">✕</span>
        </div>
      </div>

      {/* 2. MAIN APPLICATION INTERFACE (Sidebar + Content Workspace) */}
      <div className="flex flex-col lg:flex-row min-h-[640px] bg-[#f8fafc] dark:bg-[#090d16]">
        
        {/* ======================================================== */}
        {/* LEFT SIDEBAR (Pixel-perfect recreation of RupeeBill App) */}
        {/* ======================================================== */}
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
                    <span className="text-violet-600">₹upee</span><span className="text-emerald-500">Bill</span>
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
              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Business Mode</span>
              <button 
                onClick={() => setBusinessMode(!businessMode)}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                  businessMode ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  businessMode ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
            </div>

            {/* Sidebar Navigation Items */}
            <div className="space-y-1 text-xs pt-1">
              
              {/* 1. Dashboard (Active Purple Gradient) */}
              <button 
                onClick={() => setActiveMenu("dashboard")}
                className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center gap-3 transition-all ${
                  activeMenu === "dashboard"
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-black leading-tight">Dashboard</div>
                  <div className={`text-[10px] font-normal ${activeMenu === "dashboard" ? "text-violet-200" : "text-slate-400"}`}>
                    Business Analytics
                  </div>
                </div>
              </button>

              {/* 2. Retail POS */}
              <button 
                onClick={() => setActiveMenu("pos")}
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
                      <div className="text-[10px] font-normal text-slate-400">Invoices &amp; Receipts</div>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
                {/* Sub-items */}
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
                      <div className="text-[10px] font-normal text-slate-400">Manage Products</div>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
                {/* Sub-items */}
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

        {/* ======================================================== */}
        {/* RIGHT MAIN WORKSPACE (Real Financial Overview Screen) */}
        {/* ======================================================== */}
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

          {/* 4 TOP OVERVIEW METRIC CARDS (Exact recreation) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Revenue */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  TOTAL REVENUE
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
                  {metrics.revenue}
                </div>
              </div>
            </div>

            {/* Card 2: Gross Profit */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  GROSS PROFIT
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
                  {metrics.profit}
                </div>
              </div>
            </div>

            {/* Card 3: Purchases & Expenses */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <ReceiptText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  PURCHASES &amp; EXPENSES
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
                  {metrics.purchases}
                </div>
              </div>
            </div>

            {/* Card 4: Net Profit (Cash Flow) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  NET PROFIT (CASH FLOW)
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
                  {metrics.cashflow}
                </div>
              </div>
            </div>

          </div>

          {/* REVENUE ANALYTICS CONTAINER (Exact recreation from user screenshot) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-violet-600 rounded-full inline-block" />
                  Revenue Analytics
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Last 12 Months — revenue, expenses &amp; profitability at a glance
                </p>
              </div>

              {/* Range Filters */}
              <div className="flex items-center gap-2">
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                  <button 
                    onClick={() => setAnalyticsPeriod("daily")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      analyticsPeriod === "daily" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Daily
                  </button>
                  <button 
                    onClick={() => setAnalyticsPeriod("monthly")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      analyticsPeriod === "monthly" ? "bg-violet-600 text-white shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => setAnalyticsPeriod("yearly")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      analyticsPeriod === "yearly" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Yearly
                  </button>
                </div>

                <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs text-slate-400">
                  <span className="px-2 py-0.5 font-bold cursor-pointer text-violet-600">~</span>
                  <span className="px-2 py-0.5 font-bold cursor-pointer">||</span>
                </div>
              </div>
            </div>

            {/* 4 Mini Analytics KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 text-xs font-bold">
                    ₹
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" /> 100.0%
                  </span>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">REVENUE</div>
                  <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
                    {metrics.analyticsRev}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 text-xs font-bold">
                    ⛁
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" /> 100.0%
                  </span>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">EXPENSES</div>
                  <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
                    {metrics.expenses}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 text-xs font-bold">
                    📉
                  </div>
                  <span className="text-[10px] text-slate-400">--</span>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">NET PROFIT</div>
                  <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
                    {metrics.netProfit}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 text-xs font-bold">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-400">--</span>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">AVG PER PERIOD</div>
                  <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
                    {metrics.avgPeriod}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Row: Revenue vs Costs Chart & Top Periods */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
              
              {/* Left Chart Area */}
              <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Revenue vs Costs</span>
                    <span className="text-slate-400 text-[11px] ml-2">Last 12 Months</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> Revenue
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Purchases
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> Expenses
                    </span>
                  </div>
                </div>

                {/* Simulated Authentic SVG Curve Chart */}
                <div className="h-44 w-full relative pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guideline Grids */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
                    <line x1="0" y1="130" x2="500" y2="130" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />

                    {/* Rose Area Curve (Purchases spike as in user screenshot) */}
                    <path
                      d="M 0,140 Q 250,140 380,140 T 430,30 T 470,140 L 500,140 L 500,160 L 0,160 Z"
                      fill="url(#roseGradient)"
                    />
                    <path
                      d="M 0,140 Q 250,140 380,140 T 430,30 T 470,140 L 500,140"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                    />

                    {/* Violet Revenue Line */}
                    <path
                      d="M 0,135 Q 120,135 240,130 T 360,90 T 440,50 L 500,45"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2.5"
                    />

                    {/* Teal Expenses Line */}
                    <path
                      d="M 0,150 Q 150,150 300,148 T 450,145 L 500,145"
                      fill="none"
                      stroke="#14b8a6"
                      strokeWidth="2"
                    />
                  </svg>

                  {/* Y-Axis Label Hints */}
                  <div className="absolute top-1 left-0 text-[9px] font-mono text-slate-400">100000k</div>
                  <div className="absolute top-12 left-0 text-[9px] font-mono text-slate-400">10000k</div>
                  <div className="absolute top-24 left-0 text-[9px] font-mono text-slate-400">1000k</div>
                </div>
              </div>

              {/* Right Top Periods Leaderboard */}
              <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Top Periods</div>
                  <div className="text-[10px] text-slate-400">Ranked by revenue</div>

                  <div className="space-y-3 pt-3">
                    {/* Item 1 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 font-black text-[9px] flex items-center justify-center">
                            1
                          </span>
                          <span>{metrics.topPeriod1}</span>
                        </span>
                        <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                          {metrics.topAmount1}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="w-[95%] h-full bg-violet-600 rounded-full" />
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-[9px] flex items-center justify-center">
                            2
                          </span>
                          <span>{metrics.topPeriod2}</span>
                        </span>
                        <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                          {metrics.topAmount2}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="w-[35%] h-full bg-violet-400/60 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom App Watermark */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Satyam Hardware Live Sync</span>
                  <span className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-bold text-[10px]">
                    ₹
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
