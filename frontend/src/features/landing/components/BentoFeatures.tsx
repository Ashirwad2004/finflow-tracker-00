import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Printer,
  Barcode,
  Wifi,
  WifiOff,
  ShoppingCart,
  Users,
  Send,
  Package,
  FileSpreadsheet,
  Globe,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Receipt,
  Download,
  AlertTriangle,
  QrCode,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  hsn: string;
}

export const BentoFeatures: React.FC = () => {
  const navigate = useNavigate();

  // 1. POS Interactive State
  const [cart, setCart] = useState<CartItem[]>([
    { id: "1", name: "Organic Honey 500g", price: 240, qty: 2, hsn: "0409" },
    { id: "2", name: "Pure Cow Ghee 1L", price: 650, qty: 1, hsn: "0405" },
  ]);

  // 2. Offline Simulation State
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  // 3. Customer Khata reminder simulated state
  const [reminderSent, setReminderSent] = useState(false);

  // Available quick items to tap
  const quickItems = [
    { id: "1", name: "Organic Honey 500g", price: 240, hsn: "0409" },
    { id: "2", name: "Pure Cow Ghee 1L", price: 650, hsn: "0405" },
    { id: "3", name: "California Almonds 250g", price: 280, hsn: "0802" },
    { id: "4", name: "Basmati Rice 5kg", price: 480, hsn: "1006" },
  ];

  const handleAddItem = (item: { id: string; name: string; price: number; hsn: string }) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { ...item, qty: 1 }];
    });
    toast({
      title: "Barcode Scanned ⚡",
      description: `Added 1x ${item.name} to bill.`,
    });
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const gstAmount = Math.round(subtotal * 0.12 * 100) / 100;
  const grandTotal = subtotal + gstAmount;

  const handleSendReminder = () => {
    setReminderSent(true);
    toast({
      title: "WhatsApp Reminder Dispatched 📲",
      description: "Payment link for ₹14,250 sent to Priya V.",
    });
    setTimeout(() => setReminderSent(false), 4000);
  };

  return (
    <section id="features-bento" className="py-20 sm:py-28 bg-muted/20 border-b border-border/50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" /> High-Performance Engine
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground mb-4">
            Built for the Counter. Designed for Control.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Every screen is built around practical retail speed: fast barcode cashiering, zero downtime offline storage, instant WhatsApp ledgers, and 1-click accountant tax summaries.
          </p>
        </div>

        {/* ======================================================== */}
        {/* ASYMMETRIC BENTO GRID */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* ======================================================== */}
          {/* BENTO CARD 1: LIVE POS COUNTER (Wide 8-Columns) */}
          {/* ======================================================== */}
          <div id="billing" className="md:col-span-12 lg:col-span-8 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                    ⚡ High-Speed Checkout (Anchor #1)
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                    Lightning Barcode &amp; POS Counter
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click items to simulate live scanning or thermal bill creation:
                  </p>
                </div>

                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Thermal 2" &amp; 3" Plug &amp; Play
                </span>
              </div>

              {/* Interactive Barcode Simulator Tray */}
              <div className="mb-6">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5" /> Tap item to scan barcode into active bill:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {quickItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      className="p-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-primary/10 hover:border-primary/50 text-left transition-all active:scale-95 group/btn"
                    >
                      <div className="text-xs font-bold text-foreground truncate group-hover/btn:text-primary">
                        {item.name}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1">
                        <span className="font-semibold text-foreground">₹{item.price}</span>
                        <span className="text-[10px] font-mono text-primary font-bold">+ Scan</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Interactive Cart Sheet */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-foreground pb-2 border-b border-border/60">
                  <span className="flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-primary" /> Active Bill Items ({cart.length})
                  </span>
                  <span className="font-mono text-muted-foreground text-[11px]">Auto HSN Tax Applied</span>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    Cart empty. Tap any product above to scan!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs p-1.5 rounded-lg bg-card border border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({item.qty}x)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-foreground">₹{item.price * item.qty}</span>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-muted-foreground hover:text-destructive text-xs px-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Calculation Summary */}
                <div className="pt-2 border-t border-border flex justify-between items-end text-xs">
                  <div>
                    <div className="text-muted-foreground">Taxable: ₹{subtotal.toFixed(2)}</div>
                    <div className="text-muted-foreground">GST (12% Avg): ₹{gstAmount.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Grand Total</span>
                    <span className="text-xl font-black text-foreground">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border mt-6">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5 text-primary" /> Thermal 58/80mm USB &amp; Bluetooth
                </span>
                <span>•</span>
                <span>Barcode Scanner Gun Plug &amp; Play</span>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto text-xs font-bold"
              >
                Try POS 100% Free <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BENTO CARD 2: OFFLINE HOST-DISK ENGINE (4-Columns) */}
          {/* ======================================================== */}
          <div className="md:col-span-12 lg:col-span-4 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  Zero Network Drops
                </span>
                <span className="text-xs font-mono text-muted-foreground">OPFS Disk Storage</span>
              </div>

              <h3 className="text-xl font-black text-foreground">
                100% Offline Host-Disk Persistence
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Internet cuts off in busy markets all the time. RupeeBill saves every sale directly to your local device hardware disk.
              </p>

              {/* Interactive Offline Simulator Toggle */}
              <div className="my-6 p-4 rounded-2xl border border-border bg-muted/30 text-center space-y-3">
                <div className="text-xs font-bold text-foreground">Interactive Connectivity Simulator</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
                  className={`w-full font-bold text-xs transition-all ${
                    isSimulatedOffline
                      ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300"
                      : "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {isSimulatedOffline ? (
                    <>
                      <WifiOff className="w-4 h-4 mr-2" /> Internet Disconnected (Simulated)
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 mr-2" /> Wi-Fi Online (Click to test cut)
                    </>
                  )}
                </Button>

                <div className="text-[11px] text-muted-foreground text-left p-2.5 rounded-xl bg-background border border-border/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className={`w-2 h-2 rounded-full ${isSimulatedOffline ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <span>{isSimulatedOffline ? "Offline Hardware Mode Active" : "Cloud Backup Synchronized"}</span>
                  </div>
                  <p className="text-[10px]">
                    {isSimulatedOffline
                      ? "Bills continue generating with 0ms latency. Auto-syncs to cloud the moment Wi-Fi reconnects."
                      : "Real-time replica maintained across mobile, tablet, and PC."}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border text-xs text-muted-foreground font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Zero transaction drops. Guaranteed.</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BENTO CARD 3: CUSTOMER KHATA & PARTY LEDGERS (4-Columns) */}
          {/* ======================================================== */}
          <div id="parties" className="md:col-span-6 lg:col-span-4 rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                  Customer Ledgers
                </span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="text-lg font-black text-foreground">
                Udhar Khata &amp; Party Statements
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Track customer dues and vendor payables with automated WhatsApp reminders.
              </p>

              {/* Sample Khata Card */}
              <div className="my-5 p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-xs text-foreground">Priya V. (Green Leaf Studio)</div>
                    <div className="text-[10px] text-muted-foreground">GST: 27BBMPS4821M1Z5</div>
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                    Overdue
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-background border border-border/80 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Balance Due:</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">₹14,250.00</span>
                </div>

                <Button
                  size="sm"
                  onClick={handleSendReminder}
                  className={`w-full text-xs font-bold transition-all ${
                    reminderSent ? "bg-emerald-600 hover:bg-emerald-500" : "bg-[#25D366] hover:bg-[#20bd5a] text-white"
                  }`}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {reminderSent ? "Reminder Sent via WhatsApp!" : "Send WhatsApp Payment Link"}
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t border-border text-[11px] text-muted-foreground">
              Automated polite balance reminders with direct UPI link.
            </div>
          </div>

          {/* ======================================================== */}
          {/* BENTO CARD 4: REAL-TIME INVENTORY & BARCODE (4-Columns) */}
          {/* ======================================================== */}
          <div id="inventory" className="md:col-span-6 lg:col-span-4 rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                  Inventory &amp; Stock
                </span>
                <Package className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-lg font-black text-foreground">
                Stock Counts &amp; Barcode Labels
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Stock decrements with every bill. Generate custom barcode labels for bulk packaging.
              </p>

              {/* Sample Stock Status */}
              <div className="my-5 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex justify-between items-center">
                  <div>
                    <div className="font-bold text-foreground">Organic Honey 500g</div>
                    <div className="text-[10px] text-muted-foreground font-mono">SKU: HNY-500</div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    34 in stock
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex justify-between items-center">
                  <div>
                    <div className="font-bold text-foreground">Pure Cow Ghee 1L</div>
                    <div className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Low stock alert
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    4 left
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border text-[11px] text-muted-foreground flex justify-between items-center">
              <span>Barcode Tag Generator included</span>
              <span className="font-bold text-foreground">1-Click Excel Import</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BENTO CARD 5: 1-CLICK GST & ACCOUNTANT REPORTS (4-Columns) */}
          {/* ======================================================== */}
          <div id="reports" className="md:col-span-12 lg:col-span-4 rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full">
                  Tax &amp; Daybook
                </span>
                <FileSpreadsheet className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="text-lg font-black text-foreground">
                GSTR-1 &amp; Accountant Reports
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Zero headache during tax filing. One-click monthly summary broken down by GST slab.
              </p>

              {/* GST Slab Table */}
              <div className="my-5 p-3 rounded-2xl bg-muted/30 border border-border text-xs space-y-2">
                <div className="flex justify-between text-muted-foreground font-semibold pb-1 border-b border-border/60 text-[11px]">
                  <span>GST Slab</span>
                  <span>Taxable</span>
                  <span>Tax Amount</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>GST 5% Standard</span>
                  <span>₹48,250</span>
                  <span className="font-semibold text-foreground">₹2,412.50</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>GST 12% Goods</span>
                  <span>₹24,100</span>
                  <span className="font-semibold text-foreground">₹2,892.00</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>GST 18% General</span>
                  <span>₹82,600</span>
                  <span className="font-semibold text-foreground">₹14,868.00</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Profit Margin: 23.4%</span>
              <span className="font-bold text-primary flex items-center gap-1 cursor-pointer hover:underline">
                <Download className="w-3.5 h-3.5" /> Export Excel
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
