import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  ReceiptText,
  PlusCircle,
  MinusCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Smartphone,
  Globe,
  Database,
  Layers,
  X,
  Bell,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Printer,
  Users,
  Package,
  Calculator,
  MessageSquare,
  HelpCircle,
  Activity,
  Settings
} from "lucide-react";

interface DashboardMockupProps {
  opacity: any;
  scale: any;
  mouseX: any;
  mouseY: any;
  heroMode: "pos" | "storefront";
}

export const DashboardMockup = ({ opacity, scale, mouseX, mouseY, heroMode }: DashboardMockupProps) => {
  // --- OFFLINE/ONLINE STATE ---
  const [isWifiOffline, setIsWifiOffline] = useState(false);
  const [syncingPOS, setSyncingPOS] = useState(false);
  const [offlineVault, setOfflineVault] = useState<Array<{ type: "sale" | "expense"; title: string; amount: number; id: string }>>([]);

  // --- REAL BUSINESS DASHBOARD MOCKUP STATE ---
  const [posFilter, setPosFilter] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [posChartType, setPosChartType] = useState<"area" | "bar">("area");
  const [sidebarActive, setSidebarActive] = useState("Dashboard");

  const posFilterData = useMemo(() => ({
    monthly: {
      revenue: "₹5,846,718.2",
      expenses: "₹62,868",
      netProfit: "₹5,760,365.2",
      avgPeriod: "₹974,453.03",
      revTrend: 100.0,
      expTrend: 100.0,
      profitTrend: 100.0,
      avgTrend: 0,
      periods: [
        { name: "May 26", revenue: "₹3,136,824.81", profit: "+₹3,121,476.81", isProfit: true, pct: 100 },
        { name: "Jul 26", revenue: "₹1,648,125.29", profit: "+₹1,647,100.29", isProfit: true, pct: 52.5 },
        { name: "Apr 26", revenue: "₹1,049,230.1", profit: "+₹1,044,016.1", isProfit: true, pct: 33.4 },
        { name: "Mar 26", revenue: "₹9,990.00", profit: "+₹9,990.00", isProfit: true, pct: 8.5 },
        { name: "Jun 26", revenue: "₹2,024.01", profit: "-₹55,481.99", isProfit: false, pct: 4.2 },
      ],
      totalRev: "₹5,846,718.2",
      footerProfit: "₹5,760,365.2",
      isFooterProfitPositive: true,
      chartPoints: [
        { name: "Sep 25", revenue: 160, purchases: 163, expenses: 165 },
        { name: "Oct 25", revenue: 160, purchases: 163, expenses: 165 },
        { name: "Nov 25", revenue: 160, purchases: 163, expenses: 165 },
        { name: "Dec 25", revenue: 160, purchases: 163, expenses: 165 },
        { name: "Jan 26", revenue: 160, purchases: 163, expenses: 165 },
        { name: "Feb 26", revenue: 160, purchases: 163, expenses: 165 },
        { name: "Mar 26", revenue: 160, purchases: 163, expenses: 165 },
        { name: "Apr 26", revenue: 140, purchases: 163, expenses: 165 },
        { name: "May 26", revenue: 30, purchases: 161, expenses: 165 },
        { name: "Jun 26", revenue: 158, purchases: 163, expenses: 165 },
        { name: "Jul 26", revenue: 80, purchases: 161, expenses: 165 },
        { name: "Aug 26", revenue: 160, purchases: 163, expenses: 165 },
      ]
    },
    daily: {
      revenue: "₹482,900.0",
      expenses: "₹15,400",
      netProfit: "₹467,500.0",
      avgPeriod: "₹16,096.67",
      revTrend: 8.4,
      expTrend: -2.1,
      profitTrend: 12.6,
      avgTrend: 0,
      periods: [
        { name: "24 Jul", revenue: "₹45,200.00", profit: "+₹44,500.00", isProfit: true, pct: 100 },
        { name: "18 Jul", revenue: "₹38,900.00", profit: "+₹38,100.00", isProfit: true, pct: 86.1 },
        { name: "12 Jul", revenue: "₹35,000.00", profit: "+₹34,200.00", isProfit: true, pct: 77.4 },
        { name: "05 Jul", revenue: "₹31,200.00", profit: "+₹30,800.00", isProfit: true, pct: 69.0 },
        { name: "29 Jul", revenue: "₹28,400.00", profit: "+₹27,900.00", isProfit: true, pct: 62.8 },
      ],
      totalRev: "₹482,900.0",
      footerProfit: "₹467,500.0",
      isFooterProfitPositive: true,
      chartPoints: [
        { name: "05 Jul", revenue: 110, purchases: 158, expenses: 164 },
        { name: "12 Jul", revenue: 80, purchases: 155, expenses: 164 },
        { name: "18 Jul", revenue: 60, purchases: 155, expenses: 163 },
        { name: "24 Jul", revenue: 30, purchases: 150, expenses: 163 },
        { name: "29 Jul", revenue: 95, purchases: 158, expenses: 164 },
      ]
    },
    yearly: {
      revenue: "₹14,250,000.0",
      expenses: "₹240,050",
      netProfit: "₹14,009,950.0",
      avgPeriod: "₹2,850,000.00",
      revTrend: 24.5,
      expTrend: 12.0,
      profitTrend: 28.2,
      avgTrend: 0,
      periods: [
        { name: "FY 2026", revenue: "₹7,850,000.00", profit: "+₹7,780,000.00", isProfit: true, pct: 100 },
        { name: "FY 2025", revenue: "₹4,200,000.00", profit: "+₹4,110,000.00", isProfit: true, pct: 53.5 },
        { name: "FY 2024", revenue: "₹1,800,000.00", profit: "+₹1,760,000.00", isProfit: true, pct: 22.9 },
        { name: "FY 2023", revenue: "₹350,000.00", profit: "+₹345,000.00", isProfit: true, pct: 4.5 },
        { name: "FY 2022", revenue: "₹50,000.00", profit: "+₹48,000.00", isProfit: true, pct: 0.6 },
      ],
      totalRev: "₹14,250,000.0",
      footerProfit: "₹14,009,950.0",
      isFooterProfitPositive: true,
      chartPoints: [
        { name: "FY 2022", revenue: 160, purchases: 164, expenses: 165 },
        { name: "FY 2023", revenue: 150, purchases: 164, expenses: 165 },
        { name: "FY 2024", revenue: 120, purchases: 162, expenses: 164 },
        { name: "FY 2025", revenue: 70, purchases: 158, expenses: 162 },
        { name: "FY 2026", revenue: 30, purchases: 152, expenses: 160 },
      ]
    }
  }), []);

  // --- BILLING DASHBOARD MODE STATE ---
  const [salesList, setSalesList] = useState([
    { id: "BILL-1024", customer: "Aarav M.", total: 599, date: "Today" },
    { id: "BILL-1023", customer: "Priya K.", total: 1299, date: "Today" },
    { id: "BILL-1022", customer: "Rahul S.", total: 2450, date: "Yesterday" }
  ]);

  const [expenseList, setExpenseList] = useState([
    { id: "EXP-501", title: "Office Chai & Snacks", amount: 180, date: "Today" },
    { id: "EXP-500", title: "Co-working Space Rent", amount: 3500, date: "Yesterday" }
  ]);

  // Modals for Adding Invoice / Expense inside the Mockup
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [inputCustomer, setInputCustomer] = useState("");
  const [inputAmount, setInputAmount] = useState("");
  const [inputExpenseTitle, setInputExpenseTitle] = useState("");
  const [inputExpenseAmount, setInputExpenseAmount] = useState("");

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "warning" } | null>(null);

  // Dynamic calculations based on sales and expenses
  const totalRevenue = useMemo(() => salesList.reduce((sum, s) => sum + s.total, 0), [salesList]);
  const totalExpenses = useMemo(() => expenseList.reduce((sum, e) => sum + e.amount, 0), [expenseList]);
  const netProfit = totalRevenue - totalExpenses;
  const cashFlow = netProfit;

  // Trigger quick mockup toasts
  const triggerMockToast = (text: string, type: "success" | "warning") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Add Sale Invoice handler
  const handleAddInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(inputAmount);
    if (!inputCustomer || isNaN(amt) || amt <= 0) return;

    const id = `BILL-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isWifiOffline) {
      setOfflineVault(prev => [...prev, { type: "sale", title: `Invoice - ${inputCustomer}`, amount: amt, id }]);
      triggerMockToast(`Saved to Device Offline Vault! 📦 (Pending connection)`, "warning");
    } else {
      setSalesList(prev => [{ id, customer: inputCustomer, total: amt, date: "Just now" }, ...prev]);
      triggerMockToast(`Invoice created & synced to cloud! ✅`, "success");
    }

    setInputCustomer("");
    setInputAmount("");
    setShowAddInvoice(false);
  };

  // Add Expense handler
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(inputExpenseAmount);
    if (!inputExpenseTitle || isNaN(amt) || amt <= 0) return;

    const id = `EXP-${Math.floor(500 + Math.random() * 500)}`;

    if (isWifiOffline) {
      setOfflineVault(prev => [...prev, { type: "expense", title: inputExpenseTitle, amount: amt, id }]);
      triggerMockToast(`Expense saved to Device Offline Vault! 📦`, "warning");
    } else {
      setExpenseList(prev => [{ id, title: inputExpenseTitle, amount: amt, date: "Just now" }, ...prev]);
      triggerMockToast(`Expense recorded & synced! ✅`, "success");
    }

    setInputExpenseTitle("");
    setInputExpenseAmount("");
    setShowAddExpense(false);
  };

  // Auto-sync offline vault items when internet reconnects
  useEffect(() => {
    if (!isWifiOffline && offlineVault.length > 0) {
      setSyncingPOS(true);
      setTimeout(() => {
        const newSales: typeof salesList = [];
        const newExpenses: typeof expenseList = [];

        offlineVault.forEach(item => {
          if (item.type === "sale") {
            newSales.push({ id: item.id, customer: item.title.replace("Invoice - ", ""), total: item.amount, date: "Synced" });
          } else {
            newExpenses.push({ id: item.id, title: item.title, amount: item.amount, date: "Synced" });
          }
        });

        if (newSales.length > 0) setSalesList(prev => [...newSales, ...prev]);
        if (newExpenses.length > 0) setExpenseList(prev => [...newExpenses, ...prev]);

        setOfflineVault([]);
        setSyncingPOS(false);
        triggerMockToast(`Synced ${offlineVault.length} offline records to the cloud database! ⚡`, "success");
      }, 1500);
    }
  }, [isWifiOffline]);

  // --- LAUNCH ONLINE STORE STATE ---
  const [storefrontCart, setStorefrontCart] = useState<Record<number, number>>({});
  const [storefrontOrders, setStorefrontOrders] = useState<Array<{ id: string; customer: string; total: number; items: string; status: "pending" | "processing" | "synced" }>>([
    { id: "ORD-9421", customer: "Aarav M.", total: 599, items: "1x Organic Espresso Beans", status: "synced" },
    { id: "ORD-9419", customer: "Priya K.", total: 1299, items: "1x Premium Thermal Flask", status: "synced" }
  ]);
  const [storefrontRevenue, setStorefrontRevenue] = useState(24970);
  const [storefrontStock, setStorefrontStock] = useState<Record<number, number>>({
    1: 18, // Espresso Beans
    2: 12  // Flask
  });
  const [storefrontName, setStorefrontName] = useState("Karan S.");
  const [isOrderingStorefront, setIsOrderingStorefront] = useState(false);

  const storefrontProducts = [
    { id: 1, name: "Organic Espresso Beans", price: 599, icon: "☕", bg: "bg-amber-700/10 text-amber-700" },
    { id: 2, name: "Premium Thermal Flask", price: 1299, icon: "🧴", bg: "bg-slate-750/15 text-slate-700" }
  ];

  const storefrontCartTotal = Object.entries(storefrontCart).reduce((sum, [id, qty]) => {
    const prod = storefrontProducts.find(p => p.id === Number(id));
    return sum + (prod ? prod.price * qty : 0);
  }, 0);

  const addToStorefrontCart = (id: number) => {
    if (storefrontStock[id] <= (storefrontCart[id] || 0)) return;
    setStorefrontCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const placeStorefrontOrder = () => {
    if (storefrontCartTotal === 0) return;
    setIsOrderingStorefront(true);

    const itemsSummary = Object.entries(storefrontCart)
      .map(([id, qty]) => {
        const prod = storefrontProducts.find(p => p.id === Number(id));
        return `${qty}x ${prod ? prod.name.split(" ")[1] || prod.name.split(" ")[0] : "Item"}`;
      })
      .join(", ");

    const newOrderId = `ORD-${Math.floor(8000 + Math.random() * 2000)}`;
    const finalTotal = storefrontCartTotal;

    setTimeout(() => {
      // 1. Add order to merchant feed
      const newOrder = {
        id: newOrderId,
        customer: storefrontName,
        total: finalTotal,
        items: itemsSummary,
        status: "pending" as const
      };

      setStorefrontOrders(prev => [newOrder, ...prev]);
      
      // Deduct stock
      setStorefrontStock(prev => {
        const next = { ...prev };
        Object.entries(storefrontCart).forEach(([id, qty]) => {
          next[Number(id)] = Math.max(0, next[Number(id)] - qty);
        });
        return next;
      });

      // Update revenue
      setStorefrontRevenue(prev => prev + finalTotal);

      // Clean cart
      setStorefrontCart({});
      setIsOrderingStorefront(false);

      // Automatically transition status to processing then synced
      setTimeout(() => {
        setStorefrontOrders(prev =>
          prev.map(o => (o.id === newOrderId ? { ...o, status: "processing" } : o))
        );
      }, 2000);

      setTimeout(() => {
        setStorefrontOrders(prev =>
          prev.map(o => (o.id === newOrderId ? { ...o, status: "synced" } : o))
        );
      }, 5500);

      // Random name for next order simulation
      const names = ["Rahul S.", "Sneha R.", "Vikram D.", "Ananya P."];
      setStorefrontName(names[Math.floor(Math.random() * names.length)]);
    }, 1200);
  };

  return (
    <motion.div
      style={{
        opacity,
        scale,
        rotateX: mouseY,
        rotateY: mouseX,
        perspective: 1000
      }}
      className="relative max-w-6xl mx-auto transform-gpu z-10"
    >
      {/* Glow Effects */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-violet-500/10 rounded-[2rem] blur-3xl -z-10" />

      <div className="rounded-3xl border border-slate-200/50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-2xl overflow-hidden p-2 md:p-3">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-slate-850 shadow-inner overflow-hidden relative min-h-[600px] flex flex-col">
          {/* Fake Browser Bar */}
          <div className="h-12 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center px-5 justify-between">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400 dark:bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-400 dark:bg-emerald-500/80" />
            </div>
            
            {/* Display Simulated URL */}
            <div className="bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/50 rounded-lg px-4 py-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono w-1/2 text-center truncate">
              {heroMode === "pos" ? "rupeebill.com/workspace/billing-overview" : "aroma-coffee.rupeebill.store"}
            </div>

            {/* Display Mode Indicator */}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              heroMode === "pos" ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            }`}>
              {heroMode === "pos" ? "Financial Billing Dashboard" : "Live Storefront Sync"}
            </span>
          </div>

          <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col relative min-h-[500px]">
            <AnimatePresence mode="wait">
              {heroMode === "pos" ? (
                // =========================================================================
                // 1. REAL BUSINESS DASHBOARD MOCKUP
                // =========================================================================
                <motion.div
                  key="billing-dashboard"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-row w-full min-h-[500px]"
                >
                  {/* Left Sidebar */}
                  <div className="w-60 bg-white dark:bg-slate-900 border-r border-slate-205/60 dark:border-slate-800 flex flex-col justify-between select-none py-4 px-3 flex-shrink-0 text-left font-sans">
                    <div className="space-y-4">
                      {/* Logo and Name */}
                      <div className="flex items-center gap-2 px-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
                          ₹
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-[12px] leading-none text-violet-650 dark:text-violet-400">
                            RupeeBill
                          </div>
                          <div className="text-[6px] text-slate-400 uppercase tracking-widest font-black mt-0.5">
                            FINANCE & BILLING
                          </div>
                        </div>
                      </div>

                      {/* Business selection box */}
                      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl p-2 mx-0.5 relative">
                        <div className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">RUPEEBILL BUSINESS</div>
                        <div className="text-[9px] font-black text-slate-800 dark:text-white truncate mt-0.5">Satyam Hardware & material</div>
                        <div className="mt-1.5 flex items-center">
                          <span className="relative flex h-1.5 w-1.5 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">Online</span>
                        </div>
                      </div>

                      {/* Business Mode Toggle Row */}
                      <div className="flex items-center justify-between px-2 pt-0.5">
                        <span className="text-[9px] font-bold text-slate-750 dark:text-slate-300">Business Mode</span>
                        <button 
                          onClick={() => {
                            triggerMockToast("Toggling Business Mode is not available in the demo.", "warning");
                          }}
                          className="w-7 h-3.5 rounded-full bg-violet-600 relative p-0.5 transition-colors border-none"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-white absolute right-0.5 top-0.5 shadow" />
                        </button>
                      </div>

                      {/* Navigation list */}
                      <div className="space-y-0.5 pt-2">
                        {[
                          { name: "Dashboard", desc: "Business Analytics", icon: Activity },
                          { name: "Print Studio", desc: "Invoice Designs", icon: Printer },
                          { name: "Parties", desc: "Customers & Vendors", icon: Users },
                          { name: "Bank Details", desc: "Manage Bank Accounts", icon: Landmark },
                          { name: "Inventory", desc: "Manage Products", icon: Package },
                          { name: "Sales & Invoices", desc: "Manage Sales", icon: TrendingUp },
                          { name: "Purchases", desc: "Manage Bills", icon: ShoppingBag },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isActive = sidebarActive === item.name;
                          return (
                            <button
                              key={item.name}
                              onClick={() => {
                                if (item.name === "Dashboard") {
                                  setSidebarActive("Dashboard");
                                } else {
                                  triggerMockToast(`${item.name} is available in the full product.`, "warning");
                                }
                              }}
                              className={`w-full flex items-center justify-between p-1.5 rounded-lg transition-all border-none ${
                                isActive
                                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm font-bold"
                                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                                <div className="text-left leading-tight">
                                  <div className="text-[9px] font-bold">{item.name}</div>
                                  <div className={`text-[7px] ${isActive ? "text-white/80" : "text-slate-400"}`}>{item.desc}</div>
                                </div>
                              </div>
                              {isActive && <ChevronRight className="w-3 h-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sidebar Footer Controls */}
                    <div className="space-y-2 pt-3 border-t border-slate-150 dark:border-slate-800">
                      <button 
                        onClick={() => triggerMockToast("Feature Request Form is available in the full product.", "success")}
                        className="w-full py-1.5 px-2.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-left flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3 h-3 text-amber-500" />
                        Request a Feature
                      </button>
                      
                      <button 
                        onClick={() => triggerMockToast("Interactive Calculator tool is available in the full product.", "success")}
                        className="w-full py-1.5 px-2.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-left flex items-center gap-1.5"
                      >
                        <Calculator className="w-3 h-3 text-violet-500" />
                        Calculator
                      </button>
                      
                      <div className="flex items-center justify-between pt-1 px-1">
                        <div className="relative cursor-pointer" onClick={() => triggerMockToast("No new notifications.", "success")}>
                          <Bell className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900 dark:hover:text-white" />
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 text-[6px] font-bold text-white flex items-center justify-center">
                            1
                          </span>
                        </div>
                        
                        <Sun className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer" onClick={() => triggerMockToast("Theme settings can be toggled in the header bar above.", "success")} />
                        
                        <LogOut className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer" onClick={() => triggerMockToast("Sign out simulation.", "success")} />
                      </div>
                    </div>
                  </div>

                  {/* Main Content Dashboard */}
                  <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/40 p-4 md:p-6 space-y-4 overflow-y-auto max-h-[580px] text-left relative font-sans">
                    {/* Dashboard Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary to-violet-500 inline-block" />
                          Revenue Analytics
                        </h2>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {posFilter === "daily" ? "Last 30 Days" : posFilter === "monthly" ? "Last 12 Months" : "Last 5 Years"} — revenue, expenses & profitability at a glance
                        </p>
                      </div>

                      {/* Filter Period Selector + Chart Mode Selector */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-805/85 rounded-lg gap-0.5 border dark:border-slate-700/50">
                          {(["daily", "monthly", "yearly"] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setPosFilter(f)}
                              className={`px-2.5 py-1 text-[8px] font-bold rounded transition-all duration-200 border-none ${
                                posFilter === f
                                  ? "bg-white dark:bg-slate-750 text-violet-650 dark:text-violet-300 shadow-sm"
                                  : "text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 bg-transparent"
                              }`}
                            >
                              {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-805/85 rounded-lg gap-0.5 border dark:border-slate-700/50">
                          <button
                            onClick={() => setPosChartType("area")}
                            className={`p-1 rounded transition-all duration-200 border-none ${
                              posChartType === "area"
                                ? "bg-white dark:bg-slate-750 text-violet-650 dark:text-violet-300 shadow-sm"
                                : "text-slate-400 hover:text-slate-650 bg-transparent"
                            }`}
                          >
                            <Activity className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setPosChartType("bar")}
                            className={`p-1 rounded transition-all duration-200 border-none ${
                              posChartType === "bar"
                                ? "bg-white dark:bg-slate-750 text-violet-650 dark:text-violet-300 shadow-sm"
                                : "text-slate-400 hover:text-slate-650 bg-transparent"
                            }`}
                          >
                            <Layers className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: "REVENUE", value: posFilterData[posFilter].revenue, trend: posFilterData[posFilter].revTrend, icon: Wallet, color: "text-violet-600 bg-violet-100 dark:bg-violet-950/40 dark:text-violet-400" },
                        { label: "EXPENSES", value: posFilterData[posFilter].expenses, trend: posFilterData[posFilter].expTrend, icon: Layers, color: "text-rose-600 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400" },
                        { label: "NET PROFIT", value: posFilterData[posFilter].netProfit, trend: posFilterData[posFilter].profitTrend, icon: TrendingUp, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400" },
                        { label: "AVG PER PERIOD", value: posFilterData[posFilter].avgPeriod, trend: posFilterData[posFilter].avgTrend, icon: TrendingUp, color: "text-indigo-650 bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400" },
                      ].map((card, idx) => {
                        const CardIcon = card.icon;
                        const isTrendZero = card.trend === 0;
                        const isTrendPositive = card.trend >= 0;
                        return (
                          <div key={idx} className="p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm rounded-xl hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-1.5">
                              <div className={`p-1.5 rounded-lg ${card.color}`}>
                                <CardIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className={`flex items-center gap-0.5 text-[9px] font-black ${
                                isTrendZero ? "text-slate-400" : isTrendPositive ? "text-emerald-500" : "text-rose-500"
                              }`}>
                                {!isTrendZero && (isTrendPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />)}
                                <span>{isTrendZero ? "--" : `${Math.abs(card.trend).toFixed(1)}%`}</span>
                              </div>
                            </div>
                            <p className="text-[8px] font-bold tracking-wider uppercase text-slate-450 dark:text-slate-500">{card.label}</p>
                            <h3 className="mt-0.5 text-xs font-black text-slate-850 dark:text-white leading-tight">{card.value}</h3>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart & Breakdowns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Revenue vs Costs Chart */}
                      <div className="lg:col-span-2 p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-900 dark:text-white">Revenue vs Costs</h4>
                            <p className="text-[8px] text-slate-400 mt-0.5">
                              {posFilter === "daily" ? "Last 30 Days" : posFilter === "monthly" ? "Last 12 Months" : "Last 5 Years"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <span className="rounded-full w-1.5 h-1.5 bg-violet-600"></span>
                              <span className="text-[8px] text-slate-500 dark:text-slate-400">Revenue</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="rounded-full w-1.5 h-1.5 bg-rose-500"></span>
                              <span className="text-[8px] text-slate-500 dark:text-slate-400">Purchases</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="rounded-full w-1.5 h-1.5 bg-teal-400"></span>
                              <span className="text-[8px] text-slate-500 dark:text-slate-400">Expenses</span>
                            </div>
                          </div>
                        </div>

                        {/* Custom SVG chart representation */}
                        <div className="w-full h-36 relative mt-1 select-none">
                          {posChartType === "area" ? (
                            <svg className="w-full h-full" viewBox="0 0 520 200" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="mockRevGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="mockPurGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="mockExpGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.2} />
                                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              
                              {/* Grid lines */}
                              <line x1="30" y1="40" x2="500" y2="40" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
                              <line x1="30" y1="90" x2="500" y2="90" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
                              <line x1="30" y1="140" x2="500" y2="140" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
                              <line x1="30" y1="165" x2="500" y2="165" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />

                              {/* Revenue Line & Area */}
                              <path
                                d={posFilter === "monthly" 
                                  ? "M 35,162 L 77,162 L 119,162 L 161,162 L 203,162 L 245,162 L 287,162 C 305,162 315,150 329,140 C 350,120 360,30 371,30 C 382,30 395,158 413,158 C 430,158 445,80 455,80 C 470,80 485,162 497,162"
                                  : posFilter === "daily"
                                    ? "M 35,155 C 70,140 90,120 112,120 C 140,120 160,140 189,140 C 220,140 240,90 266,90 C 290,90 320,70 343,70 C 380,70 400,50 420,50 C 450,50 470,110 497,110"
                                    : "M 35,160 C 90,155 110,150 150,150 C 200,150 220,120 266,120 C 320,120 340,70 381,70 C 430,70 450,30 497,30"
                                }
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <path
                                d={posFilter === "monthly"
                                  ? "M 35,162 L 77,162 L 119,162 L 161,162 L 203,162 L 245,162 L 287,162 C 305,162 315,150 329,140 C 350,120 360,30 371,30 C 382,30 395,158 413,158 C 430,158 445,80 455,80 C 470,80 485,162 497,162 L 497,165 L 35,165 Z"
                                  : posFilter === "daily"
                                    ? "M 35,155 C 70,140 90,120 112,120 C 140,120 160,140 189,140 C 220,140 240,90 266,90 C 290,90 320,70 343,70 C 380,70 400,50 420,50 C 450,50 470,110 497,110 L 497,165 L 35,165 Z"
                                    : "M 35,160 C 90,155 110,150 150,150 C 200,150 220,120 266,120 C 320,120 340,70 381,70 C 430,70 450,30 497,30 L 497,165 L 35,165 Z"
                                }
                                fill="url(#mockRevGrad)"
                                strokeWidth="0"
                              />

                              {/* Purchases Line */}
                              <path
                                d={posFilter === "monthly"
                                  ? "M 35,164 L 329,164 C 350,164 360,163 371,163 C 382,163 395,164 413,164 C 430,164 445,163 455,163 L 497,164"
                                  : posFilter === "daily"
                                    ? "M 35,158 L 112,155 L 189,155 L 266,150 L 343,158 L 497,158"
                                    : "M 35,164 C 150,164 266,162 381,158 L 497,152"
                                }
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />

                              {/* Expenses Line */}
                              <path
                                d={posFilter === "monthly"
                                  ? "M 35,165 L 497,165"
                                  : posFilter === "daily"
                                    ? "M 35,164 L 112,164 L 189,163 L 266,163 L 343,164 L 497,164"
                                    : "M 35,165 L 150,165 L 266,164 L 381,162 L 497,160"
                                }
                                fill="none"
                                stroke="#2dd4bf"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          ) : (
                            <svg className="w-full h-full" viewBox="0 0 520 200" preserveAspectRatio="none">
                              {/* Grid lines */}
                              <line x1="30" y1="40" x2="500" y2="40" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
                              <line x1="30" y1="90" x2="500" y2="90" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
                              <line x1="30" y1="140" x2="500" y2="140" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
                              <line x1="30" y1="165" x2="500" y2="165" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
                              
                              {posFilterData[posFilter].chartPoints.map((pt, i) => {
                                const len = posFilterData[posFilter].chartPoints.length;
                                const interval = 470 / (len - 1);
                                const cx = 35 + i * interval;
                                const rh = Math.max(2, 165 - pt.revenue);
                                const ph = Math.max(2, 165 - pt.purchases);
                                const eh = Math.max(2, 165 - pt.expenses);
                                return (
                                  <g key={i}>
                                    <rect x={cx - 6} y={165 - rh} width="3.5" height={rh} fill="#8b5cf6" rx="1" />
                                    <rect x={cx - 1.5} y={165 - ph} width="3.5" height={ph} fill="#f43f5e" rx="1" />
                                    <rect x={cx + 3} y={165 - eh} width="3.5" height={eh} fill="#2dd4bf" rx="1" />
                                  </g>
                                );
                              })}
                            </svg>
                          )}
                          <div className="flex justify-between text-[7px] text-slate-400 dark:text-slate-500 mt-1 px-3 font-mono">
                            {posFilter === "monthly" ? (
                              <>
                                <span>Sep 25</span><span>Oct 25</span><span>Nov 25</span><span>Dec 25</span><span>Jan 26</span>
                                <span>Feb 26</span><span>Mar 26</span><span>Apr 26</span><span>May 26</span><span>Jun 26</span>
                                <span>Jul 26</span><span>Aug 26</span>
                              </>
                            ) : posFilter === "daily" ? (
                              <>
                                <span>05 Jul</span><span>12 Jul</span><span>18 Jul</span><span>24 Jul</span><span>29 Jul</span>
                              </>
                            ) : (
                              <>
                                <span>FY 2022</span><span>FY 2023</span><span>FY 2024</span><span>FY 2025</span><span>FY 2026</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Periods */}
                      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl flex flex-col justify-between">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-900 dark:text-white">Top Periods</h4>
                          <p className="text-[8px] text-slate-400 mt-0.5">Ranked by revenue</p>
                          
                          <div className="space-y-2 mt-2.5">
                            {posFilterData[posFilter].periods.map((period, i) => (
                              <div key={period.name} className="group">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1">
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${
                                      i === 0
                                        ? "bg-amber-400"
                                        : i === 1
                                          ? "bg-slate-400"
                                          : i === 2
                                            ? "bg-orange-400"
                                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                    }`}>
                                      {i + 1}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-350">{period.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[9px] font-black text-slate-805 dark:text-white">{period.revenue}</div>
                                    <div className={`text-[7px] font-bold ${
                                      period.isProfit ? "text-emerald-500" : "text-rose-500"
                                    }`}>
                                      {period.profit}
                                    </div>
                                  </div>
                                </div>
                                <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full"
                                    style={{ width: `${period.pct}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Top Periods Footer stats */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-1.5 text-center">
                          <div>
                            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">TOTAL REV.</p>
                            <p className="text-[9px] font-black text-slate-850 dark:text-white mt-0.5">
                              {posFilterData[posFilter].totalRev}
                            </p>
                          </div>
                          <div>
                            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">NET PROFIT</p>
                            <p className={`text-[9px] font-black mt-0.5 ${
                              posFilterData[posFilter].isFooterProfitPositive ? "text-emerald-600" : "text-rose-600"
                            }`}>
                              {posFilterData[posFilter].footerProfit}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating RupeeBill App Button */}
                    <div className="absolute bottom-3 right-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-extrabold text-sm shadow-lg hover:scale-105 transition-transform duration-300 border border-white/20 select-none pointer-events-none">
                        ₹
                      </div>
                    </div>
                  </div>

                  {/* Toast/Notification layer */}
                  <AnimatePresence>
                    {toastMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 z-40 ${
                          toastMessage.type === "success" 
                            ? "bg-slate-900 text-white border border-slate-700 dark:bg-white dark:text-slate-900" 
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        {toastMessage.type === "success" ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Database className="w-3.5 h-3.5" />}
                        <span>{toastMessage.text}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                // =========================================================================
                // 2. E-COMMERCE STOREFRONT & SYNC DASHBOARD (MATCHES ONLINE STORE SETUP)
                // =========================================================================
                <motion.div
                  key="storefront"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col lg:flex-row w-full min-h-[500px]"
                >
                  {/* Left Panel: Customer Phone Mockup (50%) */}
                  <div className="lg:w-1/2 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">Customer's Mobile Shop View</span>
                    
                    {/* Phone Frame */}
                    <div className="w-full max-w-[240px] h-[380px] border-4 border-slate-800 dark:border-slate-700 rounded-[2.5rem] shadow-2xl relative overflow-hidden bg-white flex flex-col text-slate-900">
                      {/* Phone Speaker/Camera Notch */}
                      <div className="absolute top-0 inset-x-0 h-4 flex items-center justify-center z-15">
                        <div className="w-16 h-3 bg-slate-850 dark:bg-slate-850 rounded-b-xl" />
                      </div>

                      {/* Customer Storefront Header */}
                      <div className="bg-slate-50 border-b border-slate-100 pt-5 pb-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">☕</div>
                          <div className="text-left font-sans">
                            <h4 className="font-bold text-[10px] leading-none text-slate-800">Aroma Coffee</h4>
                            <span className="text-[8px] text-emerald-500 font-bold">Online</span>
                          </div>
                        </div>
                        
                        {/* Cart Button */}
                        <div className="bg-slate-100 rounded-lg px-2 py-1 text-[9px] font-bold text-slate-750 flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-slate-505" />
                          <span>₹{storefrontCartTotal}</span>
                        </div>
                      </div>

                      {/* Storefront Products */}
                      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/40">
                        {storefrontProducts.map(p => (
                          <div key={p.id} className="bg-white border border-slate-100 p-2 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{p.icon}</span>
                              <div className="text-left">
                                <h5 className="font-bold text-[10px] leading-tight text-slate-850">{p.name.split(" ")[1]}</h5>
                                <span className="text-[8px] text-slate-400">Stock: {storefrontStock[p.id]}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-bold text-[10px] text-emerald-600">₹{p.price}</span>
                              <Button
                                size="sm"
                                disabled={storefrontStock[p.id] <= 0}
                                onClick={() => addToStorefrontCart(p.id)}
                                className="h-5 px-2 text-[8px] rounded bg-emerald-55 text-emerald-700 hover:bg-emerald-100 font-bold border-none shadow-none"
                              >
                                {storefrontStock[p.id] <= 0 ? "Sold Out" : "+ Add"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Buy Now Drawer Button */}
                      {storefrontCartTotal > 0 && (
                        <div className="p-3 border-t border-slate-100 bg-white">
                          <Button
                            size="sm"
                            onClick={placeStorefrontOrder}
                            disabled={isOrderingStorefront}
                            className="w-full h-8 rounded-lg bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-[9px] shadow-sm shadow-emerald-500/20 border-none animate-pulse"
                          >
                            {isOrderingStorefront ? "Placing Order..." : `Order Now · ₹${storefrontCartTotal}`}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Panel: Merchant Dashboard Sync Feed (50%) */}
                  <div className="lg:w-1/2 p-6 flex flex-col justify-between text-slate-900 dark:text-slate-100">
                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <div className="text-left">
                          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-emerald-500" /> Owner Dashboard
                          </h3>
                          <p className="text-[11px] text-slate-400">Online storefront sales linked directly to accounts.</p>
                        </div>
                      </div>

                      {/* Stats row with identical layout to real dashboard */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-805/85 p-3.5 rounded-xl text-left">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Storefront Income</span>
                          <span className="text-base font-black text-slate-850 dark:text-slate-100">₹{storefrontRevenue}</span>
                        </div>
                        <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-805/85 p-3.5 rounded-xl text-left">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Active Orders</span>
                          <span className="text-base font-black text-emerald-500">{storefrontOrders.filter(o => o.status !== "synced").length} active</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5 text-left">
                        <Globe className="w-4 h-4 text-emerald-500" /> Incoming Orders Feed
                      </h4>

                      {/* Incoming orders queue */}
                      <div className="space-y-2">
                        {storefrontOrders.map(o => (
                          <motion.div
                            key={o.id}
                            layout
                            className={`border rounded-xl p-3 flex justify-between items-center transition-colors text-left ${
                              o.status === "pending"
                                ? "bg-amber-500/5 border-amber-550/30"
                                : o.status === "processing"
                                  ? "bg-violet-500/5 border-violet-550/30"
                                  : "bg-white dark:bg-slate-900 border-slate-200/30 dark:border-slate-800"
                            }`}
                          >
                            <div className="text-left font-sans">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200">{o.id}</span>
                                <span className="text-[8px] text-slate-400 font-medium">{o.customer}</span>
                              </div>
                              <div className="text-xs font-semibold text-slate-750 dark:text-slate-350 mt-1">{o.items}</div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-xs text-slate-850 dark:text-slate-250 block">₹{o.total}</span>
                              <span className={`inline-block text-[8px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${
                                o.status === "synced"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : o.status === "processing"
                                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse"
                              }`}>
                                {o.status === "synced" ? "Synced" : o.status === "processing" ? "Processing" : "New order!"}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/80 text-[10px] text-slate-400 text-left leading-relaxed">
                      💡 <strong>Try this:</strong> Tap <strong>+ Add</strong> on the phone mockup on the left, then click <strong>Order Now</strong>. Watch the storefront sale instantly sync, updating inventory and metrics on the Owner Dashboard to the right!
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
