import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/core/hooks/use-toast";
import {
  Store,
  ShoppingBag,
  TrendingUp,
  Package,
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  User,
  Plus,
  Minus,
  Check,
  Clock,
  ArrowRight,
  ChevronRight,
  ArrowDown,
  Trash2
} from "lucide-react";

interface Order {
  id: string;
  customer: string;
  items: string;
  total: number;
  status: "pending" | "accepted" | "completed";
  time: string;
  isNew?: boolean;
}

interface SyncTask {
  id: string;
  action: "insert" | "update";
  table: string;
  payload: {
    customer: string;
    items: string;
    total: number;
    productId: number;
    qty: number;
  };
  timestamp: number;
}

export const InteractivePlayground = () => {
  const { toast } = useToast();
  
  // System State
  const [isOnline, setIsOnline] = useState(true);
  const [stock, setStock] = useState<Record<number, number>>({
    1: 15, // Coffee Beans
    2: 8,  // Thermal Flask
  });
  const [salesToday, setSalesToday] = useState(3045);
  
  // Storefront State
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  
  // Order tracking
  const [orderComplete, setOrderComplete] = useState(false);
  const [activeTrackedOrder, setActiveTrackedOrder] = useState<Order | null>(null);
  
  // Merchant State
  const [activeTab, setActiveTab] = useState<"live" | "sync">("live");
  const [orders, setOrders] = useState<Order[]>([
    { id: "ORD-4821", customer: "Sarah K.", items: "1x Organic Coffee Beans", total: 599, status: "completed", time: "12 min ago" },
    { id: "ORD-4819", customer: "Amit R.", items: "1x Thermal Flask", total: 1299, status: "completed", time: "1h ago" }
  ]);
  
  // Offline Saved Bills
  const [syncQueue, setSyncQueue] = useState<SyncTask[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sound/Vibe cue when order arrives or sync happens
  const [highlightSales, setHighlightSales] = useState(false);
  const [highlightStock, setHighlightStock] = useState<number | null>(null);

  // Products Info
  const products = [
    { id: 1, name: "Aroma Organic Coffee Beans (500g)", price: 599, icon: "☕", gradient: "from-amber-700 to-amber-900" },
    { id: 2, name: "Premium Thermal Flask (750ml)", price: 1299, icon: "🧴", gradient: "from-slate-700 to-slate-900" }
  ];

  // Cart calculations
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const prod = products.find(p => p.id === Number(id));
    return sum + (prod ? prod.price * qty : 0);
  }, 0);
  
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const deliveryCharge = cartTotal > 0 && cartTotal < 1000 ? 49 : 0;

  // Add/Remove from cart
  const addToCart = (id: number) => {
    const currentQty = cart[id] || 0;
    if (currentQty >= stock[id]) {
      toast({
        title: "Limited Stock",
        description: `Only ${stock[id]} items available in inventory.`,
        variant: "destructive"
      });
      return;
    }
    setCart(prev => ({ ...prev, [id]: currentQty + 1 }));
  };

  const removeFromCart = (id: number) => {
    const currentQty = cart[id] || 0;
    if (currentQty <= 1) {
      const nextCart = { ...cart };
      delete nextCart[id];
      setCart(nextCart);
    } else {
      setCart(prev => ({ ...prev, [id]: currentQty - 1 }));
    }
  };

  // Simulated Order submission
  const handlePlaceOrder = () => {
    if (!name || !phone || !address) {
      toast({
        title: "Fields Required",
        description: "Please fill out all delivery details.",
        variant: "destructive"
      });
      return;
    }

    const itemsSummary = Object.entries(cart).map(([id, qty]) => {
      const prod = products.find(p => p.id === Number(id));
      return `${qty}x ${prod ? prod.name.split(" (")[0] : "Item"}`;
    }).join(", ");

    const orderTotal = cartTotal + deliveryCharge;
    const newOrderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isOnline) {
      // ONLINE FLOW: Direct API write
      // 1. Deduct Stock
      setStock(prev => {
        const next = { ...prev };
        Object.entries(cart).forEach(([id, qty]) => {
          next[Number(id)] = Math.max(0, next[Number(id)] - qty);
        });
        return next;
      });

      // 2. Highlight stock changes
      Object.keys(cart).forEach(id => {
        setHighlightStock(Number(id));
        setTimeout(() => setHighlightStock(null), 1500);
      });

      // 3. Create Order
      const newOrder: Order = {
        id: newOrderId,
        customer: name,
        items: itemsSummary,
        total: orderTotal,
        status: "pending",
        time: "Just now",
        isNew: true
      };

      setOrders(prev => [newOrder, ...prev]);
      setActiveTrackedOrder(newOrder);
      setSalesToday(prev => prev + orderTotal);
      setHighlightSales(true);
      setTimeout(() => setHighlightSales(false), 2000);

      // Simulate storefront order acceptance transitions
      setTimeout(() => {
        setOrders(prev => prev.map(o => o.id === newOrderId ? { ...o, status: "accepted" } : o));
        setActiveTrackedOrder(prev => prev && prev.id === newOrderId ? { ...prev, status: "accepted" } : prev);
        toast({
          title: "Order Received 🎉",
          description: "New order has been received on your dashboard!"
        });
      }, 3000);

      setTimeout(() => {
        setOrders(prev => prev.map(o => o.id === newOrderId ? { ...o, status: "completed", isNew: false } : o));
        setActiveTrackedOrder(prev => prev && prev.id === newOrderId ? { ...prev, status: "completed" } : prev);
      }, 8000);

      setOrderComplete(true);
      setCart({});
      setCheckoutOpen(false);
      setCartOpen(false);
    } else {
      // OFFLINE FLOW: Queue in local device storage
      const task: SyncTask = {
        id: `task-${Math.floor(100000 + Math.random() * 900000)}`,
        action: "insert",
        table: "orders",
        payload: {
          customer: name,
          items: itemsSummary,
          total: orderTotal,
          productId: Number(Object.keys(cart)[0]), // simple mock mapping for playground
          qty: Object.values(cart)[0]
        },
        timestamp: Date.now()
      };

      setSyncQueue(prev => [...prev, task]);
      
      toast({
        title: "Saved Offline 📴",
        description: "Transaction saved securely on your device. Ready to auto-sync.",
      });

      setOrderComplete(true);
      // Create a simulated tracked order in pending sync state
      setActiveTrackedOrder({
        id: newOrderId,
        customer: name,
        items: itemsSummary,
        total: orderTotal,
        status: "pending", // will show pending sync
        time: "Saved on Device"
      });
      
      setCart({});
      setCheckoutOpen(false);
      setCartOpen(false);
    }
  };

  // Simulated Sync when user goes online or presses sync
  const triggerSync = () => {
    if (syncQueue.length === 0) return;
    setIsSyncing(true);
    
    // Animate sync processing
    setTimeout(() => {
      // Deduct stock for all queued orders
      setStock(prev => {
        const next = { ...prev };
        syncQueue.forEach(task => {
          const pId = task.payload.productId;
          const qty = task.payload.qty;
          next[pId] = Math.max(0, next[pId] - qty);
        });
        return next;
      });

      // Add queued orders to dashboard orders
      const newOrders: Order[] = syncQueue.map((task, index) => ({
        id: `ORD-${Math.floor(5000 + Math.random() * 4000)}`,
        customer: task.payload.customer,
        items: task.payload.items,
        total: task.payload.total,
        status: "accepted",
        time: "Synced just now",
        isNew: true
      }));

      // Calculate new sales total
      const addedRevenue = syncQueue.reduce((sum, task) => sum + task.payload.total, 0);

      setOrders(prev => [...newOrders, ...prev]);
      setSalesToday(prev => prev + addedRevenue);
      setHighlightSales(true);
      setTimeout(() => setHighlightSales(false), 2000);

      // If active tracked order was in offline pending sync, update it
      if (activeTrackedOrder && activeTrackedOrder.time === "Saved on Device") {
        setActiveTrackedOrder(prev => prev ? { ...prev, status: "accepted", time: "Synced just now" } : null);
      }

      setSyncQueue([]);
      setIsSyncing(false);
      
      toast({
        title: "Backup Sync Complete! ⚡",
        description: `Successfully uploaded ${newOrders.length} offline transactions to your cloud database.`
      });
    }, 2000);
  };

  // Watch for online switch to trigger auto-sync
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      triggerSync();
    }
  }, [isOnline]);

  return (
    <div className="py-24 border-t relative overflow-hidden bg-slate-900 text-white w-full">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-semibold mb-6">
            <Store className="w-3.5 h-3.5" /> Interactive Live Demo
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-center">
            Try Our <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">Zero-Downtime</span> Shop Sync
          </h2>
          <p className="text-lg text-slate-300">
            See how your business continues to run even with no internet connection. Add items to your cart on the <span className="text-violet-400 font-semibold">Online Shop</span>, disconnect your internet, place an order, and watch it save securely on your device until connection is restored.
          </p>
        </div>

        {/* The Grid Playground */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto text-slate-900">
          
          {/* LEFT: Customer Storefront Mockup (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Customer's Phone View</span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">Active storefront</span>
              </div>
            </div>

            {/* Storefront Window Frame */}
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-700/30 overflow-hidden flex flex-col h-[520px] relative">
              
              {/* Store Header */}
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                    ☕
                  </div>
                  <div>
                    <h3 className="font-bold text-xs leading-none">Aroma Roasters</h3>
                    <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Open for Orders
                    </p>
                  </div>
                </div>
                
                {/* Cart Button */}
                <button
                  onClick={() => cartCount > 0 && setCartOpen(true)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    cartCount > 0 
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/30" 
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>₹{cartTotal}</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-black animate-bounce">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Storefront Content */}
              <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 space-y-4">
                
                {/* Product List */}
                <AnimatePresence>
                  {!orderComplete ? (
                    <div className="space-y-3">
                      {products.map(p => {
                        const inCartQty = cart[p.id] || 0;
                        const isOutOfStock = stock[p.id] <= 0;
                        return (
                          <motion.div
                            key={p.id}
                            layout
                            className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                          >
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-tr ${p.gradient} flex items-center justify-center text-3xl shadow-inner`}>
                              {p.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-xs text-slate-800 truncate">{p.name}</h4>
                              <p className="font-black text-xs text-violet-600 mt-1">₹{p.price}</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? "bg-red-500" : "bg-slate-400"}`} />
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {isOutOfStock ? "Sold Out" : `${stock[p.id]} units left`}
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex flex-col items-end gap-1.5">
                              {inCartQty > 0 ? (
                                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                                  <button onClick={() => removeFromCart(p.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-slate-600 transition-colors">
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-6 text-center font-bold text-xs text-slate-800">{inCartQty}</span>
                                  <button onClick={() => addToCart(p.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-slate-600 transition-colors">
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  disabled={isOutOfStock}
                                  onClick={() => addToCart(p.id)}
                                  size="sm"
                                  className="h-8 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 hover:text-violet-700 font-bold text-xs border border-violet-100 shadow-none px-3"
                                >
                                  Add
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    // ORDER SUCCESS SCREEN
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8 px-4 flex flex-col items-center justify-center h-full text-slate-800"
                    >
                      <div className="relative w-20 h-20 mb-6 mx-auto">
                        {!isOnline ? (
                          <>
                            <div className="absolute inset-0 rounded-full bg-amber-100 animate-pulse" />
                            <div className="relative w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                              <Database className="w-9 h-9 text-white" />
                            </div>
                          </>
                        ) : activeTrackedOrder?.status === "pending" ? (
                          <>
                            <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" />
                            <div className="relative w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                              <RefreshCw className="w-9 h-9 text-white animate-spin" />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-pulse" />
                            <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg mx-auto">
                              <Check className="w-10 h-10 text-white" />
                            </div>
                          </>
                        )}
                      </div>

                      <h3 className="text-lg font-black text-slate-800 mb-2">
                        {!isOnline ? "Saved Offline! 📴" : activeTrackedOrder?.status === "pending" ? "Submitting order..." : "Order Confirmed!"}
                      </h3>
                      
                      <p className="text-xs text-slate-500 leading-relaxed mb-6 max-w-xs mx-auto">
                        {!isOnline 
                          ? "Your shop internet is down, but the order has been saved securely to your offline vault. It will back up to your account automatically once you reconnect."
                          : activeTrackedOrder?.status === "pending" 
                            ? "Connecting to store servers and recording order details..."
                            : `Thank you, ${name}! Your order has been placed. Live warehouse stock has been updated.`
                        }
                      </p>

                      <div className="bg-slate-100 border border-slate-200/50 rounded-2xl p-4 w-full text-left space-y-2">
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <span>Order ID</span>
                          <span>{activeTrackedOrder?.id}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">Customer:</span>
                          <span className="font-bold text-slate-800">{name}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">Shop Connection:</span>
                          <span className={`font-bold flex items-center gap-1 ${isOnline ? "text-emerald-600" : "text-amber-600"}`}>
                            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                            {isOnline ? "Connected (Cloud)" : "Offline (Local)"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">Backup Status:</span>
                          <span className={`font-bold uppercase ${isOnline ? "text-emerald-600" : "text-amber-600 animate-pulse"}`}>
                            {isOnline ? "Backed Up" : "Waiting for Network"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setOrderComplete(false);
                          setActiveTrackedOrder(null);
                        }}
                        className="w-full mt-6 h-12 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition-colors"
                      >
                        Buy More (Test Again)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Storefront Cart overlay Drawer */}
              <AnimatePresence>
                {cartOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-30 flex flex-col justify-end"
                  >
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      className="bg-white rounded-t-3xl p-5 max-h-[85%] overflow-y-auto space-y-4 shadow-2xl border-t border-slate-200"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 text-sm">Shopping Cart ({cartCount})</h4>
                        <button onClick={() => setCartOpen(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close</button>
                      </div>

                      {/* Items */}
                      <div className="space-y-3 pt-2">
                        {Object.entries(cart).map(([id, qty]) => {
                          const prod = products.find(p => p.id === Number(id));
                          if (!prod) return null;
                          return (
                            <div key={id} className="flex justify-between items-center py-2 border-b border-slate-100">
                              <div>
                                <div className="font-bold text-xs text-slate-800">{prod.name.split(" (")[0]}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">₹{prod.price} x {qty}</div>
                              </div>
                              <span className="font-black text-xs text-slate-800">₹{prod.price * qty}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary */}
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Subtotal</span>
                          <span>₹{cartTotal}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Delivery</span>
                          <span>{deliveryCharge > 0 ? `₹${deliveryCharge}` : "Free"}</span>
                        </div>
                        <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t">
                          <span>Total</span>
                          <span>₹{cartTotal + deliveryCharge}</span>
                        </div>
                      </div>

                      {checkoutOpen ? (
                        // Checkout details form
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                          <h5 className="text-xs font-bold text-slate-800">Delivery Details</h5>
                          <Input
                            placeholder="Your Name (e.g. Rahul)"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="h-10 text-xs rounded-lg border-slate-200 text-slate-900 placeholder:text-slate-400"
                          />
                          <Input
                            placeholder="Phone Number"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="h-10 text-xs rounded-lg border-slate-200 text-slate-900 placeholder:text-slate-400"
                          />
                          <Input
                            placeholder="Delivery Address"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="h-10 text-xs rounded-lg border-slate-200 text-slate-900 placeholder:text-slate-400"
                          />
                          <Button
                            onClick={handlePlaceOrder}
                            className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs mt-2"
                          >
                            Place Order (Cash on Delivery)
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setCheckoutOpen(true)}
                          className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs"
                        >
                          Checkout & Pay
                        </Button>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* MIDDLE: Visual Connection Indicator (1 Col on Desktop, hidden on mobile) */}
          <div className="lg:col-span-1 hidden lg:flex flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-20 w-0.5 bg-gradient-to-b from-violet-600/30 to-violet-600 border-dashed border-l border-slate-600" />
              <div className={`p-3 rounded-full border shadow-xl flex items-center justify-center transition-colors ${
                isOnline ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}>
                {isOnline ? <Wifi className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                {isOnline ? "Live Sync" : "Backup Vault"}
              </p>
              <div className="h-20 w-0.5 bg-gradient-to-b from-violet-600 to-emerald-600/30 border-dashed border-l border-slate-600" />
            </div>
          </div>

          {/* RIGHT: Merchant Dashboard & Sync Queue Mockup (6 Cols) */}
          <div className="lg:col-span-6 flex flex-col text-white">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Business Owner Dashboard</span>
              
              {/* INTERACTION TRIGGER: ONLINE/OFFLINE TOGGLE */}
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-full px-3 py-1 shadow-md">
                <span className="text-[10px] font-bold text-slate-300">Simulate Store Internet:</span>
                <button
                  onClick={() => setIsOnline(!isOnline)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    isOnline ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      isOnline ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className={`text-[10px] font-black uppercase tracking-wider ${isOnline ? "text-emerald-400" : "text-amber-400"}`}>
                  {isOnline ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            {/* Merchant Dashboard Frame */}
            <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-850 overflow-hidden flex flex-col h-[520px] relative">
              
              {/* Dashboard Fake Topbar */}
              <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-sm text-white shadow-md">
                    F
                  </div>
                  <div>
                    <h3 className="font-bold text-xs leading-none">FinFlow Command Center</h3>
                    <p className="text-[9px] text-slate-500 mt-1">Aroma Roasters Workspace</p>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700/50">
                  <button
                    onClick={() => setActiveTab("live")}
                    className={`px-3 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wide transition-colors ${
                      activeTab === "live" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Live Operations
                  </button>
                  <button
                    onClick={() => setActiveTab("sync")}
                    className={`relative px-3 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wide transition-colors ${
                      activeTab === "sync" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Offline Sync Panel
                    {syncQueue.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-900 text-[9px] font-black flex items-center justify-center animate-pulse">
                        {syncQueue.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 bg-slate-900/40 border-b border-slate-800/60 p-4 gap-4">
                <div className="text-center p-2 rounded-xl bg-slate-900/30 border border-slate-800/40">
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Today's Revenue</div>
                  <motion.div
                    animate={highlightSales ? { scale: [1, 1.1, 1], color: ["#ffffff", "#a78bfa", "#ffffff"] } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-base font-extrabold"
                  >
                    ₹{salesToday}
                  </motion.div>
                </div>
                <div className="text-center p-2 rounded-xl bg-slate-900/30 border border-slate-800/40">
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">New Orders</div>
                  <div className="text-base font-extrabold text-violet-400">
                    {orders.filter(o => o.status !== "completed").length}
                  </div>
                </div>
                <div className="text-center p-2 rounded-xl bg-slate-900/30 border border-slate-800/40">
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Offline Bills</div>
                  <div className={`text-base font-extrabold ${syncQueue.length > 0 ? "text-amber-400 animate-pulse" : "text-slate-400"}`}>
                    {syncQueue.length} queued
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-5 overflow-y-auto">
                <AnimatePresence mode="wait">
                  
                  {setActiveTab && activeTab === "live" ? (
                    // OPERATIONS TAB: LIVE ORDERS + LIVE STOCK LEVELS
                    <motion.div
                      key="live"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 h-full"
                    >
                      {/* Live Stock Level Panel */}
                      <div>
                        <div className="flex justify-between items-center mb-2.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left block">Store Inventory & Stock</span>
                          <span className="text-[9px] text-slate-500 font-medium">Linked Live to Storefront</span>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-3.5 text-slate-200">
                          {products.map(p => (
                            <div key={p.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{p.icon}</span>
                                <span className="text-xs font-semibold">{p.name.split(" (")[0]}</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-semibold text-slate-400">₹{p.price}</span>
                                <motion.div
                                  animate={highlightStock === p.id ? { scale: [1, 1.3, 1], color: ["#94a3b8", "#a78bfa", "#94a3b8"] } : {}}
                                  transition={{ duration: 0.8 }}
                                  className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                                    stock[p.id] <= 0 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-slate-800 text-slate-300"
                                  }`}
                                >
                                  {stock[p.id]} left
                                </motion.div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Live Orders Feed */}
                      <div className="flex-1 text-slate-200">
                        <div className="flex justify-between items-center mb-2.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left block">Live Orders Feed</span>
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500" />
                            </span>
                            <span className="text-[9px] text-violet-400 font-medium uppercase tracking-wider">Listening</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <AnimatePresence>
                            {orders.map(order => (
                              <motion.div
                                key={order.id}
                                initial={order.isNew ? { opacity: 0, x: -30, backgroundColor: "rgba(124, 58, 237, 0.2)" } : false}
                                animate={{ opacity: 1, x: 0, backgroundColor: "rgba(30, 41, 59, 0.4)" }}
                                transition={{ duration: 0.5 }}
                                className="border border-slate-800/80 p-3 rounded-xl flex justify-between items-center hover:bg-slate-900/60 transition-colors"
                              >
                                <div className="min-w-0 text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-[11px] text-slate-200">{order.id}</span>
                                    <span className="text-[9px] text-slate-500">{order.time}</span>
                                  </div>
                                  <div className="text-xs font-semibold text-slate-200 truncate mt-1">{order.items}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 justify-start">
                                    <User className="w-3 h-3 text-slate-500" /> {order.customer}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-xs text-slate-200 block">₹{order.total}</span>
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${
                                    order.status === "completed" 
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : order.status === "accepted"
                                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse"
                                  }`}>
                                    {order.status === "pending" && <Clock className="w-2.5 h-2.5" />}
                                    {order.status === "accepted" && <Package className="w-2.5 h-2.5" />}
                                    {order.status === "completed" && <Check className="w-2.5 h-2.5" />}
                                    {order.status === "pending" ? "Received" : order.status}
                                  </span>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    // SYNC TAB: DEXIE.JS & SERVICE WORKER LOGIC
                    <motion.div
                      key="sync"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-5 h-full flex flex-col"
                    >
                      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-black">📦 Offline Vault (Pending Backup)</span>
                          </div>
                          <span className="text-[9px] text-slate-500">Backup Status: Encrypted & Secure</span>
                        </div>

                        {/* Local Table Display */}
                        <div className="space-y-3">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                            <span>Queued Item</span>
                            <span>Action</span>
                            <span>Backup Status</span>
                          </div>
                          
                          <AnimatePresence>
                            {syncQueue.length === 0 ? (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-8 text-xs text-slate-500 space-y-1.5 mx-auto"
                              >
                                <Database className="w-7 h-7 mx-auto text-slate-600" />
                                <p className="font-semibold text-slate-400">Offline Vault is empty</p>
                                <p className="text-[10px] text-slate-600 font-medium">All sales are synchronized with the cloud.</p>
                              </motion.div>
                            ) : (
                              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                {syncQueue.map(task => (
                                  <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98, x: 20 }}
                                    className="bg-slate-950 border border-slate-805 p-2.5 rounded-xl flex items-center justify-between text-xs text-slate-350"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                      <span className="text-slate-400 text-[10px] font-bold">{task.payload.customer}'s Bill</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-500">{task.payload.items.split(", ")[0]}</span>
                                    <span className="text-[9px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-bold uppercase animate-pulse">Waiting for Network</span>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Manual Sync Trigger Box */}
                      {syncQueue.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex flex-col gap-3.5 text-slate-200">
                          <p className="text-[11px] text-amber-400 leading-relaxed text-left">
                            💡 **Shop Owner Tip:** Turn the shop internet connection switch back to **Connected** to let your device automatically upload these saved orders. Or, trigger a manual upload now:
                          </p>
                          <Button
                            disabled={!isOnline || isSyncing}
                            onClick={triggerSync}
                            className={`h-11 rounded-xl font-extrabold text-xs shadow-lg transition-all border-0 ${
                              isOnline 
                                ? "bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-amber-500/10" 
                                : "bg-slate-800 text-slate-600 shadow-none border border-slate-700/50 cursor-not-allowed"
                            }`}
                          >
                            {isSyncing ? (
                              <>
                                <RefreshCw className="mr-2 w-4 h-4 animate-spin" /> Uploading Sales...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 w-4 h-4" /> 
                                {isOnline ? "Upload Saved Offline Sales Now" : "Establish Internet Connection to Sync"}
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Service Worker Status */}
                      <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-200">
                        <div className="flex items-center gap-2.5 text-left">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-450 text-base">
                            🔄
                          </div>
                          <div>
                            <span className="font-semibold block">Smart Sync Engine</span>
                            <span className="text-[10px] text-slate-500 mt-0.5">Online status monitor active</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase">
                          ACTIVE & READY
                        </span>
                      </div>
                      
                    </motion.div>
                  )}
                  
                </AnimatePresence>
              </div>

            </div>
          </div>

        </div>

        {/* Step pointers under playground */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-center text-slate-400 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-850">
            <span className="font-bold text-violet-400 text-sm block mb-1">1. Shop & Order</span>
            Add items to the cart on the storefront catalog and click check out.
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-850">
            <span className="font-bold text-amber-400 text-sm block mb-1">2. Simulate Disconnect</span>
            Toggle the network connection to **Disconnected** and submit the order.
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-850">
            <span className="font-bold text-emerald-400 text-sm block mb-1">3. Sync Automatically</span>
            Toggle back to **Connected** to see the local queue automatically flush to the cloud.
          </div>
        </div>

      </div>
    </div>
  );
};
