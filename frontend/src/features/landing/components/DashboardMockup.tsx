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
  X
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
              {heroMode === "pos" ? "finflow.app/workspace/billing-overview" : "aroma-coffee.finflow.store"}
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
                // 1. BILLING COUNTER OVERVIEW (MATCHES WEBSITE'S ACTUAL BUSINESS DASHBOARD)
                // =========================================================================
                <motion.div
                  key="billing-dashboard"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 md:p-8 space-y-6 flex-1 flex flex-col text-slate-900 dark:text-slate-100 text-left"
                >
                  {/* Dashboard Header */}
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        Financial Overview
                      </h1>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time financial overview and performance metrics (Simulator)</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Simulating Wi-Fi Toggle inside Mockup */}
                      <button
                        onClick={() => setIsWifiOffline(!isWifiOffline)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm ${
                          isWifiOffline
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isWifiOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                        <span>Counter Wi-Fi: {isWifiOffline ? "Offline" : "Online"}</span>
                      </button>

                      <div className="flex bg-slate-150 dark:bg-slate-800 rounded-lg p-0.5 border dark:border-slate-700">
                        <button
                          onClick={() => setShowAddInvoice(true)}
                          className="px-3 py-1 text-[10px] font-semibold bg-violet-600 hover:bg-violet-750 text-white rounded-md flex items-center gap-1 transition-colors border-none"
                        >
                          + Invoice
                        </button>
                        <button
                          onClick={() => setShowAddExpense(true)}
                          className="px-3 py-1 text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md flex items-center gap-1 transition-colors border-none ml-1"
                        >
                          + Expense
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4 Metric Cards (Identical layout to real website dashboard) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Revenue */}
                    <div className="p-4 bg-white dark:bg-slate-900 border shadow-sm rounded-xl border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-1.5 rounded-lg text-primary bg-primary/10">
                          <Wallet className="w-4 h-4" />
                        </div>
                        {offlineVault.filter(i => i.type === "sale").length > 0 && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold animate-pulse">Offline Saved</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-455">Total Revenue</p>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-850 dark:text-white">₹{totalRevenue}</h3>
                    </div>

                    {/* Card 2: Net Profit */}
                    <div className="p-4 bg-white dark:bg-slate-900 border shadow-sm rounded-xl border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-1.5 text-teal-600 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                          <Landmark className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-455">Net Profit</p>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-850 dark:text-white">₹{netProfit}</h3>
                    </div>

                    {/* Card 3: Operating Expenses */}
                    <div className="p-4 bg-white dark:bg-slate-900 border shadow-sm rounded-xl border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-1.5 text-rose-600 bg-rose-105 dark:bg-rose-900/30 rounded-lg">
                          <ReceiptText className="w-4 h-4" />
                        </div>
                        {offlineVault.filter(i => i.type === "expense").length > 0 && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold animate-pulse">Offline Saved</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-455">Operating Expenses</p>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-850 dark:text-white">₹{totalExpenses}</h3>
                    </div>

                    {/* Card 4: Cash Flow */}
                    <div className="p-4 bg-white dark:bg-slate-900 border shadow-sm rounded-xl border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-1.5 text-indigo-650 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-455">Cash Flow</p>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-850 dark:text-white">₹{cashFlow}</h3>
                    </div>
                  </div>

                  {/* Main section: SVG Chart & Recent Transactions */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* SVG-based Line Chart (P&L Performance style) */}
                    <div className="p-5 bg-white border shadow-sm lg:col-span-2 dark:bg-slate-900 rounded-xl border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Profit & Loss Performance</h4>
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full w-2 h-2 bg-violet-600"></span>
                            <span className="text-[9px] text-slate-500">Revenue</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full w-2 h-2 bg-teal-400"></span>
                            <span className="text-[9px] text-slate-500">Expenses</span>
                          </div>
                        </div>
                      </div>

                      {/* SVG Line representation */}
                      <div className="w-full h-36 relative">
                        <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                          {/* Grid Lines */}
                          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5" />
                          <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5" />
                          <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5" />

                          {/* Mock Revenue Line Path */}
                          <path
                            d={`M 10 70 L 60 50 L 120 60 L 180 40 L 240 55 L 290 ${Math.max(10, 80 - (totalRevenue / 300))}`}
                            fill="none"
                            stroke="#8b5cf6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          {/* Mock Expenses Line Path */}
                          <path
                            d={`M 10 90 L 60 85 L 120 88 L 180 75 L 240 82 L 290 ${Math.max(30, 95 - (totalExpenses / 100))}`}
                            fill="none"
                            stroke="#2dd4bf"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="flex justify-between text-[8px] text-slate-400 mt-2 px-1">
                          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Transactions List (Matches right side of real dashboard) */}
                    <div className="flex flex-col bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200/60 dark:border-slate-800 max-h-[190px] overflow-hidden">
                      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Recent Transactions</h4>
                        {offlineVault.length > 0 && (
                          <span className="text-[8px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded animate-pulse">Vault ({offlineVault.length})</span>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto pr-1">
                        <div className="divide-y divide-slate-105 dark:divide-slate-800">
                          {/* Combine lists into unified history feed */}
                          {[
                            ...salesList.map(s => ({ id: s.id, type: "sale", title: `Invoice - ${s.customer}`, amt: s.total, date: s.date }), [salesList]),
                            ...expenseList.map(e => ({ id: e.id, type: "expense", title: e.title, amt: e.amount, date: e.date }), [expenseList])
                          ].slice(0, 5).map((tx, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <div className="flex items-center gap-2.5">
                                {tx.type === "sale" ? (
                                  <div className="rounded-lg p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                                    <PlusCircle className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="rounded-lg p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600">
                                    <MinusCircle className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <div className="text-left font-sans">
                                  <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{tx.title}</p>
                                  <p className="text-[8px] text-slate-400">{tx.date} · {tx.id}</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-black ${tx.type === "sale" ? "text-emerald-600" : "text-rose-600"}`}>
                                {tx.type === "sale" ? "+" : "-"}₹{tx.amt}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overlays / Modals for recording Invoice / Expense inside mockup */}
                  <AnimatePresence>
                    {showAddInvoice && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-30 flex items-center justify-center rounded-2xl p-4"
                      >
                        <motion.div
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0.95 }}
                          className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative"
                        >
                          <button
                            onClick={() => setShowAddInvoice(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 border-none bg-transparent"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          
                          <h3 className="font-extrabold text-sm mb-4 text-slate-800 dark:text-white flex items-center gap-1.5">
                            <PlusCircle className="w-5 h-5 text-violet-500" /> Create Sale Invoice
                          </h3>

                          <form onSubmit={handleAddInvoiceSubmit} className="space-y-4">
                            <div className="space-y-1.5 text-left">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Name</Label>
                              <Input
                                value={inputCustomer}
                                onChange={e => setInputCustomer(e.target.value)}
                                placeholder="e.g. Aarav Sharma"
                                className="h-9 text-xs rounded-lg border-slate-200 text-slate-900 placeholder:text-slate-400"
                                required
                              />
                            </div>
                            <div className="space-y-1.5 text-left">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Amount (₹)</Label>
                              <Input
                                type="number"
                                value={inputAmount}
                                onChange={e => setInputAmount(e.target.value)}
                                placeholder="e.g. 1500"
                                className="h-9 text-xs rounded-lg border-slate-200 text-slate-900 placeholder:text-slate-400"
                                required
                              />
                            </div>

                            <Button type="submit" className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs border-none mt-2">
                              {isWifiOffline ? "⚡ Save Invoice Offline" : "✅ Create Invoice"}
                            </Button>
                          </form>
                        </motion.div>
                      </motion.div>
                    )}

                    {showAddExpense && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-955/60 backdrop-blur-sm z-30 flex items-center justify-center rounded-2xl p-4"
                      >
                        <motion.div
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0.95 }}
                          className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative"
                        >
                          <button
                            onClick={() => setShowAddExpense(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 border-none bg-transparent"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          
                          <h3 className="font-extrabold text-sm mb-4 text-slate-800 dark:text-white flex items-center gap-1.5">
                            <MinusCircle className="w-5 h-5 text-rose-500" /> Record Business Expense
                          </h3>

                          <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
                            <div className="space-y-1.5 text-left">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expense Item / Title</Label>
                              <Input
                                value={inputExpenseTitle}
                                onChange={e => setInputExpenseTitle(e.target.value)}
                                placeholder="e.g. Office Stationery"
                                className="h-9 text-xs rounded-lg border-slate-200 text-slate-900 placeholder:text-slate-400"
                                required
                              />
                            </div>
                            <div className="space-y-1.5 text-left">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Spent (₹)</Label>
                              <Input
                                type="number"
                                value={inputExpenseAmount}
                                onChange={e => setInputExpenseAmount(e.target.value)}
                                placeholder="e.g. 450"
                                className="h-9 text-xs rounded-lg border-slate-200 text-slate-900 placeholder:text-slate-400"
                                required
                              />
                            </div>

                            <Button type="submit" className="w-full h-10 rounded-xl bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs border-none mt-2">
                              {isWifiOffline ? "⚡ Save Expense Offline" : "✅ Record Expense"}
                            </Button>
                          </form>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sync POS spinner */}
                  {syncingPOS && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-30 flex items-center justify-center rounded-2xl">
                      <div className="bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-2xl max-w-xs text-center flex flex-col items-center border-slate-250 dark:border-slate-800">
                        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Syncing Stored Sales...</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Connecting to secure cloud backup vault.</p>
                      </div>
                    </div>
                  )}

                  {/* Mockup Mini Toast notification */}
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
