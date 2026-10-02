import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { sqliteService } from "@/core/offline/sqliteService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShoppingCart, AlertCircle, Package } from "lucide-react";
import { playAudioBeep } from "../utils/posFeedback";

// POS Components & Modals
import {
  POSCart,
  POSPaymentModal,
  POSReceiptModal,
  POSShiftModal,
  POSHoldResumeModal,
  POSReturnModal,
  POSStationHeader,
  POSCatalogGrid,
  POSCustomerModal,
  POSShortcutsModal,
} from "../components";

// Hooks
import {
  usePOSShift,
  usePOSCart,
  usePOSSaleMutation,
  usePOSShortcuts,
} from "../hooks";

// Types
import { POSProduct } from "../types";

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

  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [isHoldResumeOpen, setIsHoldResumeOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

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

  // Viewport / Tab state for mobile
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [productGridSearch, setProductGridSearch] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");
  const [lastCompletedSale, setLastCompletedSale] = useState<any | null>(null);

  // 1. Shift Register Hook
  const {
    activeShift,
    shiftSummary,
    refetchShift,
    handleOpenShift,
    handleCloseShift,
    handleRecordCashMovement,
  } = usePOSShift({
    storeId,
    userId: user?.id,
    formatCurrency,
  });

  // 2. Fetch Catalog Products
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

  // 3. Cart Hook
  const {
    cartItems,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerPartyId,
    overallDiscountAmount,
    setOverallDiscountAmount,
    heldBills,
    subtotal,
    taxAmount,
    totalAmount,
    handleAddToCart,
    handleUpdateQuantity,
    handleUpdatePrice,
    handleUpdateDiscount,
    handleRemoveItem,
    handleClearCart,
    handleHoldBill,
    handleResumeBill,
    handleDeleteHeldBill,
  } = usePOSCart({
    storeId,
    cashierId: user?.id || "",
    formatCurrency,
  });

  // 4. Sale Mutation Hook
  const { handleCompleteSale } = usePOSSaleMutation({
    isOnline,
    storeId,
    activeShiftId: activeShift?.id || null,
    customerName,
    customerPhone,
    customerPartyId,
    cartItems,
    subtotal,
    taxAmount,
    totalAmount,
    overallDiscountAmount,
    products,
    onSuccess: (completedSale) => {
      setLastCompletedSale(completedSale);
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);
      handleClearCart();
    },
    refetchShift,
  });

  // 5. Retail Keyboard Shortcuts Hook
  usePOSShortcuts({
    onCustomerShortcut: () => setIsCustomerModalOpen(true),
    onPaymentShortcut: () => setIsPaymentOpen(true),
    onHoldShortcut: handleHoldBill,
    onClearCartShortcut: handleClearCart,
    onReturnShortcut: () => setIsReturnOpen(true),
    hasCartItems: cartItems.length > 0,
  });

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products for quick touch grid
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

  const visibleGridProducts = useMemo(() => {
    return filteredGridProducts.slice(0, 120);
  }, [filteredGridProducts]);

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-background text-foreground animate-fade-in font-display overflow-hidden select-none">
        {/* Top Station Control Bar */}
        <POSStationHeader
          currentStoreName={currentStore?.name}
          userEmail={user?.email}
          isOnline={isOnline}
          activeShift={activeShift}
          shiftSummary={shiftSummary}
          heldBillsCount={heldBills.length}
          formatCurrency={formatCurrency}
          onOpenShift={() => setIsShiftOpen(true)}
          onOpenHoldResume={() => setIsHoldResumeOpen(true)}
          onOpenReturn={() => setIsReturnOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Shift Closed Callout Banner */}
        {!activeShift && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                Cash register drawer is closed. Open your register drawer to track cash sales, floats, and discrepancies.
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => setIsShiftOpen(true)}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 rounded-lg shadow-xs cursor-pointer"
            >
              Open Register Float
            </Button>
          </div>
        )}

        {/* Mobile Viewport Toggle */}
        <div className="lg:hidden px-3 sm:px-4 py-2 bg-card border-b border-border/80 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("catalog")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
          {/* Left Column: Catalog & Barcode Scanner */}
          <div
            className={`lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 border-r border-border/80 overflow-hidden bg-muted/20 relative ${
              mobileTab === "catalog" ? "flex" : "hidden lg:flex"
            }`}
          >
            <POSCatalogGrid
              products={products}
              isProductsLoading={isProductsLoading}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              searchQuery={productGridSearch}
              onSearchChange={setProductGridSearch}
              filteredProducts={filteredGridProducts}
              visibleProducts={visibleGridProducts}
              formatCurrency={formatCurrency}
              onAddToCart={handleAddToCart}
              onBarcodeNotFound={(code) => {
                playAudioBeep(330, 200);
                toast.error(`Barcode "${code}" not found in catalog.`);
              }}
            />

            {/* Mobile Catalog Floating Bottom Bar when Cart has items */}
            {cartItems.length > 0 && (
              <div className="lg:hidden p-3 bg-background/95 backdrop-blur-md border-t border-border/80 shrink-0 shadow-lg">
                <Button
                  onClick={() => setMobileTab("cart")}
                  className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-between px-4 rounded-xl shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>
                      {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"} in Cart
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm sm:text-base">
                    View Cart • {formatCurrency(totalAmount)} →
                  </span>
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: POS Cart & Docked Pay Action */}
          <div
            className={`lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 bg-card/60 overflow-hidden ${
              mobileTab === "cart" ? "flex" : "hidden lg:flex"
            }`}
          >
            <POSCart
              items={cartItems}
              customerName={customerName}
              customerPhone={customerPhone}
              onOpenCustomerSelect={() => setIsCustomerModalOpen(true)}
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

      {/* Customer Quick Edit Modal (F2) */}
      <POSCustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        customerName={customerName}
        customerPhone={customerPhone}
        onApplyCustomer={(name, phone) => {
          setCustomerName(name);
          setCustomerPhone(phone);
        }}
      />

      {/* Keyboard Shortcuts Helper Modal */}
      <POSShortcutsModal
        open={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
      />

      {/* Payment Modal (F4) */}
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
        cashierName={
          shiftSummary?.cashier_snapshot_name ||
          user?.email?.split("@")[0] ||
          "Cashier"
        }
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        onRecordCashMovement={handleRecordCashMovement}
      />

      {/* Parked / Held Bills Drawer (F8) */}
      <POSHoldResumeModal
        open={isHoldResumeOpen}
        onOpenChange={setIsHoldResumeOpen}
        heldBills={heldBills}
        onResumeBill={(bill) => handleResumeBill(bill, () => setIsHoldResumeOpen(false))}
        onDeleteHeldBill={handleDeleteHeldBill}
      />

      {/* Returns & Credit Notes Modal (F10) */}
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
