import React, { useState } from "react";
import { 
  Store, 
  BarChart3, 
  Globe, 
  Wifi, 
  WifiOff, 
  Printer, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Send, 
  Sparkles,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";

interface CartProduct {
  id: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
  barcode: string;
}

export const ProductPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pos" | "dashboard" | "store">("pos");
  const [offlineSimulated, setOfflineSimulated] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState<"today" | "week" | "month">("today");

  // Dynamic POS Cart State
  const [previewCart, setPreviewCart] = useState<CartProduct[]>([
    { id: "1", name: "Organic Honey 500g", price: 240, qty: 2, stock: 34, barcode: "890123" },
    { id: "3", name: "Pure Cow Ghee 1L", price: 650, qty: 1, stock: 8, barcode: "890789" },
    { id: "5", name: "Almonds California 250g", price: 280, qty: 1, stock: 14, barcode: "890654" },
  ]);

  const catalogProducts = [
    { id: "1", name: "Organic Honey 500g", price: 240, stock: 34, barcode: "890123" },
    { id: "2", name: "Basmati Rice 5kg", price: 480, stock: 18, barcode: "890456" },
    { id: "3", name: "Pure Cow Ghee 1L", price: 650, stock: 8, barcode: "890789" },
    { id: "4", name: "Whole Wheat Atta 10kg", price: 420, stock: 22, barcode: "890321" },
    { id: "5", name: "Almonds California 250g", price: 280, stock: 14, barcode: "890654" },
    { id: "6", name: "Green Tea Pack 100s", price: 195, stock: 45, barcode: "890987" },
  ];

  const handleAddToCart = (product: { id: string; name: string; price: number; stock: number; barcode: string }) => {
    setPreviewCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { ...product, qty: 1 }];
    });
    toast({
      title: "Item Scanned ⚡",
      description: `Added 1x ${product.name} to active bill.`,
    });
  };

  const handleRemoveFromCart = (id: string) => {
    setPreviewCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Cart financial calculations
  const totalAmount = previewCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxableValue = Math.round((totalAmount / 1.12) * 100) / 100;
  const gstAmount = Math.round((totalAmount - taxableValue) * 100) / 100;

  const handlePrintSlip = () => {
    toast({
      title: "3\" Thermal Slip Dispatched 🖨️",
      description: `Bill #1048 (₹${totalAmount}) printed to USB thermal printer.`,
    });
  };

  const handleChargeWhatsApp = () => {
    toast({
      title: "Invoice & UPI Dispatched 📲",
      description: `WhatsApp PDF invoice sent to customer with UPI QR link.`,
    });
  };

  // Dynamic Dashboard Stats
  const dashboardStats = {
    today: { sales: "₹18,450.00", bills: "32 Bills Completed", cash: "₹7,200.00", upi: "₹11,250.00" },
    week: { sales: "₹1,24,600.00", bills: "214 Bills Completed", cash: "₹48,100.00", upi: "₹76,500.00" },
    month: { sales: "₹4,86,200.00", bills: "890 Bills Completed", cash: "₹1,82,000.00", upi: "₹3,04,200.00" },
  };

  return (
    <section id="preview" className="py-16 sm:py-24 bg-muted/20 border-b border-border/50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Interactive Workspace Tour
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
            Experience What Fast Billing Actually Feels Like
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Test the live interface below. Click items to ring up bills, switch between counter checkout and executive daybooks, and test the offline disconnect simulator.
          </p>

          {/* Interactive Screen Selector */}
          <div className="inline-flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border mt-6 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab("pos")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "pos"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Store className="h-4 w-4 text-primary" />
              <span>Invoicing &amp; POS Checkout</span>
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              <span>Business Daybook &amp; Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab("store")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "store"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-4 w-4 text-violet-500" />
              <span>Online Storefront &amp; Catalog</span>
            </button>
          </div>
        </div>

        {/* Realistic Application Window Container */}
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Window Title Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 border-b border-border text-xs">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              </div>
              <span className="text-muted-foreground font-mono text-[11px] ml-2 hidden sm:inline">
                rupeebill.app/{activeTab === "pos" ? "pos-counter" : activeTab === "dashboard" ? "business-dashboard" : "store/my-shop"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const nextState = !offlineSimulated;
                  setOfflineSimulated(nextState);
                  toast({
                    title: nextState ? "Offline Simulator Engaged ⚡" : "Online Mode Restored 🌐",
                    description: nextState 
                      ? "Bills now write directly to browser OPFS hardware disk with 0ms latency."
                      : "Cloud sync reconnected. All local transactions backed up.",
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                  offlineSimulated
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                    : "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                }`}
                title="Click to test offline billing behavior"
              >
                {offlineSimulated ? (
                  <>
                    <WifiOff className="h-3 w-3" /> Offline (Disk Hardware Active)
                  </>
                ) : (
                  <>
                    <Wifi className="h-3 w-3" /> Online (Auto-Cloud Sync)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Offline Alert Strip */}
          {offlineSimulated && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs flex items-center justify-between text-amber-800 dark:text-amber-200">
              <span className="flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <strong>Offline Persistence Active:</strong> Wi-Fi disconnected. Your bills continue saving with zero latency to OPFS local hardware storage.
              </span>
              <button 
                onClick={() => setOfflineSimulated(false)}
                className="underline font-bold text-[11px] hover:text-amber-900 dark:hover:text-amber-100"
              >
                Reconnect
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: POS BILLING COUNTER */}
          {/* ======================================================== */}
          {activeTab === "pos" && (
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-background">
              {/* Product Catalog & Barcode Entry */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-primary" /> Store Items (Tap to ring up)
                  </span>
                  <span className="text-muted-foreground text-[11px]">Click any product to add to cart:</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {catalogProducts.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddToCart(item)}
                      className="p-3 rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:bg-muted/30 active:scale-[0.98] group flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          SKU #{item.barcode}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 text-xs">
                        <span className="font-extrabold text-foreground">₹{item.price}</span>
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Plus className="w-2.5 h-2.5" /> Add
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/80 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>💡 Tip: Connect standard USB or Bluetooth barcode guns for hands-free cashiering.</span>
                  <span className="font-mono font-bold text-foreground">F12 = Print</span>
                </div>
              </div>

              {/* Live POS Cart & Bill Summary */}
              <div className="lg:col-span-5 border border-border rounded-2xl p-4 sm:p-5 bg-card flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold">Active Customer Cart (#B-1048)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold">
                      Ready to Bill
                    </span>
                  </div>

                  {previewCart.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      Cart is empty. Click any item on the left to add it!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {previewCart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-muted/30 border border-border/60">
                          <div className="truncate max-w-[150px]">
                            <div className="font-medium text-foreground truncate">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              ₹{item.price} × {item.qty}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-foreground">₹{item.price * item.qty}</span>
                            <button
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="text-muted-foreground hover:text-rose-500 p-1 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Taxable Value:</span>
                    <span>₹{taxableValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>GST (CGST 6% + SGST 6%):</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-foreground pt-1.5 border-t border-border/60">
                    <span>Grand Total:</span>
                    <span className="text-primary text-lg">₹{totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrintSlip}
                      className="text-xs font-semibold h-9"
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5 text-amber-500" /> Print Thermal Slip
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleChargeWhatsApp}
                      className="text-xs font-bold h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Charge &amp; WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DAYBOOK & ANALYTICS */}
          {/* ======================================================== */}
          {activeTab === "dashboard" && (
            <div className="p-4 sm:p-6 bg-background space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Cash Drawer &amp; Daybook Summary</h4>
                  <p className="text-xs text-muted-foreground">Real-time collections separated by payment channel.</p>
                </div>

                {/* Range Filter Buttons */}
                <div className="inline-flex p-1 rounded-xl bg-muted border border-border text-xs">
                  <button
                    onClick={() => setDashboardFilter("today")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      dashboardFilter === "today" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setDashboardFilter("week")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      dashboardFilter === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setDashboardFilter("month")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      dashboardFilter === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    This Month
                  </button>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm">
                  <div className="text-xs text-muted-foreground font-medium">Total Gross Sales</div>
                  <div className="text-2xl font-black text-foreground mt-1">
                    {dashboardStats[dashboardFilter].sales}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    {dashboardStats[dashboardFilter].bills}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm">
                  <div className="text-xs text-muted-foreground font-medium">Cash in Drawer</div>
                  <div className="text-2xl font-black text-foreground mt-1">
                    {dashboardStats[dashboardFilter].cash}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                    Drawer Physically Reconciled
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm">
                  <div className="text-xs text-muted-foreground font-medium">UPI / Digital Settlements</div>
                  <div className="text-2xl font-black text-primary mt-1">
                    {dashboardStats[dashboardFilter].upi}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    Direct Bank Settlement Verified
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="p-4 rounded-2xl border border-border bg-card">
                <div className="text-xs font-bold text-foreground mb-3 flex items-center justify-between">
                  <span>Recent Invoices &amp; Dispatches</span>
                  <span className="text-[11px] text-muted-foreground font-normal">Real-time counter sync</span>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { id: "INV-2026-089", customer: "Ramesh Sharma", amount: "₹1,410.00", mode: "UPI", status: "Sent via WhatsApp", statusColor: "text-emerald-600 dark:text-emerald-400" },
                    { id: "INV-2026-088", customer: "Pooja Patel", amount: "₹450.00", mode: "Cash", status: "Printed Thermal 3\"", statusColor: "text-amber-600 dark:text-amber-400" },
                    { id: "INV-2026-087", customer: "Karan Verma", amount: "₹2,850.00", mode: "Credit Account", status: "Ledger Recorded (Khata)", statusColor: "text-blue-600 dark:text-blue-400" },
                  ].map((row, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/60 gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-foreground">{row.id}</span>
                        <span className="text-foreground">{row.customer}</span>
                        <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded text-muted-foreground">{row.mode}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="font-extrabold text-foreground">{row.amount}</span>
                        <span className={`text-[11px] font-semibold ${row.statusColor}`}>{row.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ONLINE STOREFRONT */}
          {/* ======================================================== */}
          {activeTab === "store" && (
            <div className="p-4 sm:p-6 bg-background space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <div>
                  <div className="text-xs font-black text-violet-700 dark:text-violet-300">
                    Live Storefront &amp; WhatsApp Ordering Link
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Share your digital store link with regular customers. When they order, items ring up straight on your counter.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold bg-background px-3 py-1.5 rounded-lg border border-border">
                    rupeebill.app/store/ganesh-supermarket
                  </span>
                  <Button size="sm" variant="outline" className="text-xs h-8">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "Organic Honey 500g", price: "₹240", status: "In Stock (34)", badge: "Instant Sync" },
                  { name: "Basmati Rice 5kg", price: "₹480", status: "In Stock (18)", badge: "Instant Sync" },
                  { name: "Pure Cow Ghee 1L", price: "₹650", status: "In Stock (8)", badge: "Instant Sync" },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-border bg-card flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-foreground">{item.name}</span>
                        <span className="text-[10px] text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded font-bold">
                          {item.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">{item.status}</div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/60">
                      <span className="text-sm font-extrabold text-foreground">{item.price}</span>
                      <span className="text-[11px] font-bold text-primary">Web Order Ready</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

