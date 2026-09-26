import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import apiClient from "@/core/api/apiClient";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

// POS Components & Modals
import { BarcodeScannerInput } from "../components/BarcodeScannerInput";
import { POSCart } from "../components/POSCart";
import { POSPaymentModal } from "../components/POSPaymentModal";
import { POSReceiptModal } from "../components/POSReceiptModal";
import { POSShiftModal } from "../components/POSShiftModal";
import { POSHoldResumeModal } from "../components/POSHoldResumeModal";
import { POSReturnModal } from "../components/POSReturnModal";

// Types
import {
  POSProduct,
  POSCartItem,
  POSShift,
  POSShiftSummary,
  POSHeldBill,
  POSPaymentMethodType,
  POSSplitPaymentBreakdown,
} from "../types";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Clock,
  RotateCcw,
  Store,
  Wifi,
  WifiOff,
  User,
  Plus,
  Search,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Layers,
  Keyboard,
  Barcode as BarcodeIcon,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Package,
} from "lucide-react";

// Web Audio synthesizer for tactile POS feedback
const playAudioBeep = (freq = 880, durationMs = 80) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
};

const playSuccessChime = () => {
  playAudioBeep(587.33, 90); // D5
  setTimeout(() => playAudioBeep(880, 140), 100); // A5
};

// Generates avatar initials and soft background colors
const getProductColor = (name: string) => {
  const colors = [
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40",
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40",
    "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/40",
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40",
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40",
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function POSPage() {
  const { user } = useAuth();
  const { currentStoreId } = useBusiness();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const storeId = currentStoreId || user?.id || "";

  // Fetch Store / Business Profile for branding, receipts, and QR payments
  const { data: profile } = useQuery({
    queryKey: ["profile", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("user_id", storeId)
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn("[POS] Profile fetch failed offline, reading from cache:", e);
      }
      return (await sqliteService.getById<any>(storeId)) || null;
    },
    enabled: !!storeId,
  });

  const currentStore = useMemo(() => {
    return {
      name: profile?.business_name || profile?.company_name || "Retail Billing Register",
      upi_id: profile?.upi_id || "retail@upi",
      ...profile,
    };
  }, [profile]);

  // Online / Offline connectivity tracker
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cart State
  const [cartItems, setCartItems] = useState<POSCartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerPartyId, setCustomerPartyId] = useState<string | undefined>(undefined);
  const [overallDiscountAmount, setOverallDiscountAmount] = useState<number>(0);

  // Quick category & search filters in main view
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [productGridSearch, setProductGridSearch] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [isHoldResumeOpen, setIsHoldResumeOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Customer Edit Form
  const [tempCustomerName, setTempCustomerName] = useState("");
  const [tempCustomerPhone, setTempCustomerPhone] = useState("");

  // Last Completed Sale for Receipt
  const [lastCompletedSale, setLastCompletedSale] = useState<any | null>(null);

  // Held Bills
  const [heldBills, setHeldBills] = useState<POSHeldBill[]>([]);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 1. Fetch Catalog Products
  const { data: products = [], isLoading: isProductsLoading } = useQuery<POSProduct[]>({
    queryKey: ["products", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", storeId)
          .order("name", { ascending: true });
        if (!error && data) return data as POSProduct[];
      } catch (e) {
        console.warn("[POS] Remote fetch failed, reading from offline cache:", e);
      }
      const local = await sqliteService.getAll<POSProduct>("products", storeId);
      return local || [];
    },
    initialData: () => queryClient.getQueryData<POSProduct[]>(["products", storeId]) || undefined,
    enabled: !!storeId,
  });

  // 2. Fetch Active Register Shift
  const { data: shiftData, refetch: refetchShift } = useQuery({
    queryKey: ["pos_current_shift", storeId, user?.id],
    queryFn: async () => {
      if (!storeId) return { active_shift: null, summary: null };
      try {
        const res = await apiClient.get("/api/v1/pos/shifts/current");
        return res.data;
      } catch (err) {
        console.warn("[POS] Shift check endpoint unavailable offline:", err);
        return { active_shift: null, summary: null };
      }
    },
    enabled: !!storeId,
    refetchInterval: 30000,
  });

  const activeShift: POSShift | null = shiftData?.active_shift || null;
  const shiftSummary: POSShiftSummary | null = shiftData?.summary || null;

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products for quick touch grid (optimized string lowering and early returns)
  const filteredGridProducts = useMemo(() => {
    const q = productGridSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [products, selectedCategory, productGridSearch]);

  // Keep DOM lean on POS terminals by rendering up to 120 quick-touch items
  const visibleGridProducts = useMemo(() => {
    return filteredGridProducts.slice(0, 120);
  }, [filteredGridProducts]);

  // Cart Calculations
  const { subtotal, taxAmount, totalAmount } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    cartItems.forEach((item) => {
      const lineSubtotal = item.quantity * item.price * (1 - item.discount / 100);
      const lineTax = (lineSubtotal * (item.tax_rate || 0)) / 100;
      sub += lineSubtotal;
      tax += lineTax;
    });

    const netTotal = Math.max(0, sub + tax - overallDiscountAmount);
    return {
      subtotal: Math.round(sub * 100) / 100,
      taxAmount: Math.round(tax * 100) / 100,
      totalAmount: Math.round(netTotal * 100) / 100,
    };
  }, [cartItems, overallDiscountAmount]);

  // Add product to cart (or increment quantity if already present)
  const handleAddToCart = useCallback((product: POSProduct) => {
    playAudioBeep(1046.5, 60); // C6 scan chirp
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product_id === product.id || item.id === product.id
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        const existing = next[existingIdx];
        const updatedQty = existing.quantity + 1;
        const lineSubtotal = updatedQty * existing.price * (1 - existing.discount / 100);
        const lineTax = (lineSubtotal * (existing.tax_rate || 0)) / 100;
        next[existingIdx] = {
          ...existing,
          quantity: updatedQty,
          tax_amount: lineTax,
          total: lineSubtotal + lineTax,
        };
        return next;
      }

      const defaultTax = product.tax_rate ?? 0;
      const initialTax = (product.price * defaultTax) / 100;

      const newItem: POSCartItem = {
        id: uuidv4(),
        product_id: product.id,
        name: product.name,
        description: product.description,
        quantity: 1,
        price: product.price,
        mrp: product.mrp || undefined,
        discount: 0,
        tax_rate: defaultTax,
        tax_amount: initialTax,
        total: product.price + initialTax,
        unit: product.unit || "pc",
        hsn_code: product.hsn_code || undefined,
      };
      return [...prev, newItem];
    });
  }, []);

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const lineSub = newQty * it.price * (1 - it.discount / 100);
          const lineTax = (lineSub * (it.tax_rate || 0)) / 100;
          return {
            ...it,
            quantity: newQty,
            tax_amount: lineTax,
            total: lineSub + lineTax,
          };
        }
        return it;
      })
    );
  };

  const handleUpdatePrice = (id: string, newPrice: number) => {
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const lineSub = it.quantity * Math.max(0, newPrice) * (1 - it.discount / 100);
          const lineTax = (lineSub * (it.tax_rate || 0)) / 100;
          return {
            ...it,
            price: Math.max(0, newPrice),
            tax_amount: lineTax,
            total: lineSub + lineTax,
          };
        }
        return it;
      })
    );
  };

  const handleUpdateDiscount = (id: string, newDisc: number) => {
    const clampedDisc = Math.min(100, Math.max(0, newDisc));
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const lineSub = it.quantity * it.price * (1 - clampedDisc / 100);
          const lineTax = (lineSub * (it.tax_rate || 0)) / 100;
          return {
            ...it,
            discount: clampedDisc,
            tax_amount: lineTax,
            total: lineSub + lineTax,
          };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setOverallDiscountAmount(0);
    setCustomerName("Walk-in Customer");
    setCustomerPhone("");
    setCustomerPartyId(undefined);
  };

  // Hold current cart
  const handleHoldBill = () => {
    if (cartItems.length === 0) {
      toast.info("Cart is empty; nothing to hold.");
      return;
    }

    const heldBill: POSHeldBill = {
      id: uuidv4(),
      store_id: storeId,
      cashier_id: user?.id || "",
      customer_name: customerName,
      customer_phone: customerPhone || null,
      party_id: customerPartyId || null,
      items: [...cartItems],
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      discount_amount: overallDiscountAmount,
      created_at: new Date().toISOString(),
    };

    setHeldBills((prev) => [heldBill, ...prev]);
    toast.success(`Bill for ${customerName} parked (Total ${formatCurrency(totalAmount)})`);
    handleClearCart();
  };

  // Resume held cart
  const handleResumeBill = (bill: POSHeldBill) => {
    if (cartItems.length > 0) {
      const confirmReplace = window.confirm(
        "You have items in your current cart. Resuming this bill will replace the current cart. Continue?"
      );
      if (!confirmReplace) return;
    }

    setCartItems(bill.items);
    setCustomerName(bill.customer_name);
    setCustomerPhone(bill.customer_phone || "");
    setCustomerPartyId(bill.party_id || undefined);
    setOverallDiscountAmount(bill.discount_amount || 0);

    setHeldBills((prev) => prev.filter((b) => b.id !== bill.id));
    setIsHoldResumeOpen(false);
    toast.success(`Resumed bill for ${bill.customer_name}`);
  };

  const handleDeleteHeldBill = (id: string) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== id));
    toast.info("Parked bill discarded");
  };

  // Keyboard Shortcuts (F2, F4, F8, F9, F10)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if modal is open or typing inside inputs (except F-keys)
      if (e.key === "F2") {
        e.preventDefault();
        setTempCustomerName(customerName);
        setTempCustomerPhone(customerPhone);
        setIsCustomerModalOpen(true);
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cartItems.length > 0) {
          setIsPaymentOpen(true);
        } else {
          toast.warning("Cart is empty! Add products to proceed to payment.");
        }
      } else if (e.key === "F8") {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === "F9") {
        e.preventDefault();
        handleClearCart();
        toast.info("Started new sale");
      } else if (e.key === "F10") {
        e.preventDefault();
        setIsReturnOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems, customerName, customerPhone]);

  // Complete POS Sale
  const handleCompleteSale = async ({
    paymentMethod,
    amountPaid,
    splitBreakdown,
    notes,
    idempotencyKey,
  }: {
    paymentMethod: POSPaymentMethodType;
    amountPaid: number;
    splitBreakdown?: POSSplitPaymentBreakdown;
    notes?: string;
    idempotencyKey: string;
  }) => {
    if (cartItems.length === 0) {
      toast.error("Cannot complete an empty sale");
      return;
    }

    const saleItemsPayload = cartItems.map((item) => ({
      product_id: item.product_id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount,
      tax_rate: item.tax_rate,
      unit: item.unit,
      hsn_code: item.hsn_code,
    }));

    try {
      if (isOnline) {
        // Online Server-Authoritative Flow
        const res = await apiClient.post("/api/v1/pos/sales", {
          shift_id: activeShift?.id || null,
          idempotency_key: idempotencyKey,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          party_id: customerPartyId || null,
          items: saleItemsPayload,
          discount_amount: overallDiscountAmount,
          payment_method: paymentMethod,
          amount_paid: amountPaid,
          notes: notes || null,
          is_offline_sync: false,
        });

        const createdSale = res.data.sale;
        playSuccessChime();
        toast.success(`Sale #${createdSale.invoice_number} completed!`);

        setLastCompletedSale(createdSale);
        setIsPaymentOpen(false);
        setIsReceiptOpen(true);
        handleClearCart();
        queryClient.invalidateQueries({ queryKey: ["products", storeId] });
        refetchShift();
      } else {
        // Offline Resilience Flow
        const provisionalInvoiceNum = `OFF-${Date.now().toString(36).toUpperCase()}`;
        const recordId = uuidv4();

        const offlineSale = {
          id: recordId,
          user_id: storeId,
          invoice_number: provisionalInvoiceNum,
          customer_name: customerName,
          customer_phone: customerPhone,
          date: new Date().toISOString(),
          items: saleItemsPayload,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          discount_amount: overallDiscountAmount,
          amount_paid: amountPaid,
          balance_due: Math.max(0, totalAmount - amountPaid),
          payment_method: paymentMethod,
          status: amountPaid >= totalAmount ? "paid" : "partial",
          pos_shift_id: activeShift?.id || null,
          idempotency_key: idempotencyKey,
          offline_invoice_number: provisionalInvoiceNum,
          document_type: "invoice",
        };

        // 1. Save to local SQLite/Dexie and queue for sync
        await offlineMutate({
          table: "sales",
          action: "insert",
          recordId,
          userId: storeId,
          payload: offlineSale,
        });

        // 2. Decrement local product stock
        for (const item of cartItems) {
          if (item.product_id) {
            const prod = products.find((p) => p.id === item.product_id);
            if (prod) {
              const updatedStock = Math.max(0, (prod.stock_quantity || 0) - item.quantity);
              await sqliteService.upsert("products", storeId, {
                ...prod,
                stock_quantity: updatedStock,
              });
            }
          }
        }

        playSuccessChime();
        toast.success(`[Offline] Sale #${provisionalInvoiceNum} saved locally! Will sync when reconnected.`);

        setLastCompletedSale(offlineSale);
        setIsPaymentOpen(false);
        setIsReceiptOpen(true);
        handleClearCart();
        queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      }
    } catch (err: any) {
      console.error("Failed to complete sale:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to process sale.";
      toast.error(`Sale Failed: ${detail}`);
      throw err;
    }
  };

  // Shift Modal Actions
  const handleOpenShift = async (openingCash: number, notes?: string) => {
    try {
      await apiClient.post("/api/v1/pos/shifts/open", {
        opening_cash: openingCash,
        notes: notes || null,
      });
      toast.success("Register shift opened successfully!");
      await queryClient.invalidateQueries({ queryKey: ["pos_current_shift"] });
      await refetchShift();
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Failed to open shift";
      toast.error(`Shift Error: ${detail}`);
      throw err;
    }
  };

  const handleCloseShift = async (shiftId: string, actualCash: number, notes?: string) => {
    try {
      const res = await apiClient.post(`/api/v1/pos/shifts/${shiftId}/close`, {
        actual_cash: actualCash,
        notes: notes || null,
      });
      const diff = res.data.difference;
      if (diff === 0) {
        toast.success("Register balanced perfectly! Shift closed.");
      } else if (diff > 0) {
        toast.warning(`Shift closed with surplus cash of +${formatCurrency(diff)}`);
      } else {
        toast.error(`Shift closed with cash shortage of -${formatCurrency(Math.abs(diff))}`);
      }
      await queryClient.invalidateQueries({ queryKey: ["pos_current_shift"] });
      await refetchShift();
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Failed to close shift";
      toast.error(`Shift Close Error: ${detail}`);
      throw err;
    }
  };

  const handleRecordCashMovement = async (
    shiftId: string,
    type: "cash_in" | "cash_out",
    amount: number,
    reason: string
  ) => {
    try {
      await apiClient.post("/api/v1/pos/cash-movements", {
        shift_id: shiftId,
        type,
        amount,
        reason,
      });
      toast.success(`Recorded ${type === "cash_in" ? "Cash In (+)" : "Cash Out (-)"} of ${formatCurrency(amount)}`);
      await queryClient.invalidateQueries({ queryKey: ["pos_current_shift"] });
      await refetchShift();
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Failed to record cash movement";
      toast.error(`Cash Movement Error: ${detail}`);
      throw err;
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-background text-foreground animate-fade-in font-display overflow-hidden select-none">
        {/* Top Professional Station Control Bar */}
        <header className="h-16 px-4 sm:px-6 border-b border-border/80 bg-card/60 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 sticky top-0 z-10 shadow-2xs">
          {/* Left station identity & status pills */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shadow-2xs">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0 hidden md:block">
                <h1 className="text-sm font-bold text-foreground truncate leading-tight">
                  {currentStore?.name || "Retail Billing Register"}
                </h1>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                  <span>Counter Terminal</span>
                  <span>•</span>
                  <span className="truncate">{user?.email}</span>
                </p>
              </div>
            </div>

            {/* Online / Offline status badge */}
            <Badge
              variant="outline"
              className={`text-[11px] font-medium h-7 px-2.5 flex items-center gap-1.5 transition-colors ${
                isOnline
                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 animate-pulse"
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isOnline ? "Online" : "Offline Cache"}</span>
            </Badge>

            {/* Register Shift Pill */}
            <button
              onClick={() => setIsShiftOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-background hover:bg-muted/80 text-xs text-foreground transition-all shadow-2xs group"
              title="Click to view Cash Register Float / Shift"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeShift
                    ? "bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              <span className="font-semibold group-hover:text-primary transition-colors">
                {activeShift ? "Register Open" : "Register Closed"}
              </span>
              {activeShift && shiftSummary && (
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold ml-0.5">
                  {formatCurrency(shiftSummary.expected_cash || 0)}
                </span>
              )}
            </button>
          </div>

          {/* Right Action Hub */}
          <div className="flex items-center gap-2">
            {/* Parked / Held Bills Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsHoldResumeOpen(true)}
              className="h-9 px-3 text-xs border-border/80 bg-background hover:bg-muted font-medium relative shadow-2xs"
              title="Parked / Held Bills (F8)"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              <span className="hidden sm:inline">Parked Bills</span>
              <kbd className="hidden lg:inline-block ml-1 text-[9px] text-muted-foreground bg-muted px-1 rounded border">F8</kbd>
              {heldBills.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {heldBills.length}
                </span>
              )}
            </Button>

            {/* Returns & Credit Note Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsReturnOpen(true)}
              className="h-9 px-3 text-xs border-border/80 bg-background hover:bg-muted font-medium shadow-2xs"
              title="Process Customer Return & Issue Credit Note (F10)"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-primary" />
              <span>Return</span>
              <kbd className="hidden lg:inline-block ml-1 text-[9px] text-muted-foreground bg-muted px-1 rounded border">F10</kbd>
            </Button>

            {/* Keyboard Shortcuts Dialog Trigger */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsShortcutsOpen(true)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
              title="Keyboard Shortcuts Cheat Sheet"
            >
              <Keyboard className="w-4 h-4" />
            </Button>

            {/* Fullscreen Mode Toggle */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleFullscreen}
              className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 hidden sm:flex"
              title="Toggle Fullscreen Mode"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        {/* Shift Closed Callout Banner */}
        {!activeShift && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Cash register drawer is closed. Open your register drawer to track cash sales, floats, and discrepancies.</span>
            </div>
            <Button
              size="sm"
              onClick={() => setIsShiftOpen(true)}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 rounded-lg shadow-xs"
            >
              Open Register Float
            </Button>
          </div>
        )}

        {/* Mobile / Compact Tablet Viewport Toggle (Visible only below lg breakpoint) */}
        <div className="lg:hidden px-3 sm:px-4 py-2 bg-card border-b border-border/80 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("catalog")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mobileTab === "catalog"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catalog ({filteredGridProducts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("cart")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mobileTab === "cart"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Cart ({cartItems.length})</span>
            {cartItems.length > 0 && (
              <span className="font-mono text-[11px] font-extrabold ml-0.5">
                • {formatCurrency(totalAmount)}
              </span>
            )}
          </button>
        </div>

        {/* Main Workstation Screen: 2 Columns */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Fast Scanner Input + Touch Category Tabs + Independently Scrollable Product Grid */}
          <div
            className={`lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 border-r border-border/80 overflow-hidden bg-muted/20 relative ${
              mobileTab === "catalog" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Top Barcode Input Area */}
            <div className="p-3 sm:p-4 border-b border-border/80 bg-card/40 shrink-0">
              <BarcodeScannerInput
                products={products}
                onProductFound={handleAddToCart}
                onBarcodeNotFound={(code) => {
                  playAudioBeep(330, 200);
                  toast.error(`Barcode "${code}" not found in catalog.`);
                }}
              />
            </div>

            {/* Category Filter Chips & Quick Search Filter */}
            <div className="p-2.5 sm:p-3 border-b border-border/80 bg-card/60 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                All ({products.length})
              </button>

              {categories.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}

              <div className="ml-auto min-w-[140px] sm:min-w-[170px] relative shrink-0">
                <Input
                  placeholder="Filter items..."
                  value={productGridSearch}
                  onChange={(e) => setProductGridSearch(e.target.value)}
                  className="h-7.5 text-xs bg-background border-border/80 rounded-lg pr-7"
                />
                {productGridSearch && (
                  <button
                    onClick={() => setProductGridSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
                    title="Clear filter"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Product Quick-Touch Grid - Independently Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 overscroll-contain">
              {isProductsLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Loading catalog inventory...
                </div>
              ) : filteredGridProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm space-y-3 py-16">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                    <Package className="w-7 h-7" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">No products found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {productGridSearch ? "Try a different search term" : "Add products in the Inventory page"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {visibleGridProducts.map((product) => {
                      const isOutOfStock = (product.stock_quantity || 0) <= 0;
                      const avatarStyle = getProductColor(product.name);

                      return (
                        <div
                          key={product.id}
                          onClick={() => handleAddToCart(product)}
                          className={`group relative p-3 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between select-none active:scale-[0.98] ${
                            isOutOfStock ? "opacity-75" : ""
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold uppercase shrink-0 ${avatarStyle}`}
                              >
                                {product.name.slice(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-foreground text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                  {product.name}
                                </h3>
                                <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                                  {product.barcode ? product.barcode : (product.sku || "No Barcode")}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                            <div className="font-extrabold text-foreground text-sm font-mono">
                              {formatCurrency(product.price)}
                            </div>

                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                (product.stock_quantity || 0) > 5
                                  ? "bg-muted text-muted-foreground border-border/80"
                                  : (product.stock_quantity || 0) > 0
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40"
                              }`}
                            >
                              {product.stock_quantity} {product.unit || "pc"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredGridProducts.length > 120 && (
                    <div className="p-3 text-center bg-muted/30 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                      Showing top 120 of {filteredGridProducts.length} items. Use barcode scanner or search to refine.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Catalog Floating Bottom Bar when Cart has items */}
            {cartItems.length > 0 && (
              <div className="lg:hidden p-3 bg-background/95 backdrop-blur-md border-t border-border/80 shrink-0 shadow-lg">
                <Button
                  onClick={() => setMobileTab("cart")}
                  className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-between px-4 rounded-xl shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>{cartItems.length} {cartItems.length === 1 ? "Item" : "Items"} in Cart</span>
                  </div>
                  <span className="font-mono font-black text-sm sm:text-base">
                    View Cart • {formatCurrency(totalAmount)} →
                  </span>
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: POS Cart & Realtime Bill with Permanently Docked Pay Action */}
          <div
            className={`lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 bg-card/60 overflow-hidden ${
              mobileTab === "cart" ? "flex" : "hidden lg:flex"
            }`}
          >
            <POSCart
              items={cartItems}
              customerName={customerName}
              customerPhone={customerPhone}
              onOpenCustomerSelect={() => {
                setTempCustomerName(customerName);
                setTempCustomerPhone(customerPhone);
                setIsCustomerModalOpen(true);
              }}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdatePrice={handleUpdatePrice}
              onUpdateDiscount={handleUpdateDiscount}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              overallDiscountAmount={overallDiscountAmount}
              onUpdateOverallDiscount={setOverallDiscountAmount}
              subtotal={subtotal}
              taxAmount={taxAmount}
              totalAmount={totalAmount}
              onPay={() => setIsPaymentOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Customer Quick Edit Modal */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="max-w-md bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Customer Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Customer Name</Label>
              <Input
                value={tempCustomerName}
                onChange={(e) => setTempCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="bg-card border-border text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Mobile / WhatsApp Number</Label>
              <Input
                value={tempCustomerPhone}
                onChange={(e) => setTempCustomerPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="bg-card border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCustomerModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setCustomerName(tempCustomerName.trim() || "Walk-in Customer");
                setCustomerPhone(tempCustomerPhone.trim());
                setIsCustomerModalOpen(false);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Apply Customer (F2)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Helper Modal */}
      <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
        <DialogContent className="max-w-md bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              Retail POS Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 py-3 text-sm">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
              <span className="text-muted-foreground">Change Customer</span>
              <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">F2</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
              <span className="text-muted-foreground">Charge / Open Payment Modal</span>
              <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">F4</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
              <span className="text-muted-foreground">Park / Hold Current Bill</span>
              <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">F8</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
              <span className="text-muted-foreground">Clear Cart / New Sale</span>
              <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">F9</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
              <span className="text-muted-foreground">Sales Return & Credit Note</span>
              <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">F10</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
              <span className="text-muted-foreground">Focus Barcode / Search Input</span>
              <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">Ctrl + K</kbd>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsShortcutsOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <POSPaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        totalAmount={totalAmount}
        customerName={customerName}
        upiId={currentStore?.upi_id || "retail@upi"}
        businessName={currentStore?.name || "FinFlow Retail Store"}
        onCompleteSale={handleCompleteSale}
      />

      {/* Thermal & A4 Receipt Modal */}
      <POSReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        saleData={lastCompletedSale}
        profileData={currentStore}
        onNewSale={() => {
          setIsReceiptOpen(false);
          handleClearCart();
        }}
      />

      {/* Shift Register Management Modal */}
      <POSShiftModal
        open={isShiftOpen}
        onOpenChange={setIsShiftOpen}
        activeShift={activeShift}
        shiftSummary={shiftSummary}
        cashierName={shiftSummary?.cashier_snapshot_name || user?.email?.split("@")[0] || "Cashier"}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        onRecordCashMovement={handleRecordCashMovement}
      />

      {/* Parked / Held Bills Drawer */}
      <POSHoldResumeModal
        open={isHoldResumeOpen}
        onOpenChange={setIsHoldResumeOpen}
        heldBills={heldBills}
        onResumeBill={handleResumeBill}
        onDeleteHeldBill={handleDeleteHeldBill}
      />

      {/* Returns & Credit Notes Modal */}
      <POSReturnModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        activeShiftId={activeShift?.id}
        onReturnSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["products", storeId] });
          refetchShift();
        }}
      />
    </AppLayout>
  );
}
