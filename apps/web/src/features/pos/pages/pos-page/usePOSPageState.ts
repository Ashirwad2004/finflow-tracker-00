import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { sqliteService } from "@/core/offline/sqliteService";
import { toast } from "sonner";
import { playAudioBeep } from "../../utils/posFeedback";
import { POSProduct } from "../../types";
import {
  usePOSShift,
  usePOSCart,
  usePOSSaleMutation,
  usePOSShortcuts,
} from "../../hooks";

export function usePOSPageState() {
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

  const handleBarcodeNotFound = (code: string) => {
    playAudioBeep(330, 200);
    toast.error(`Barcode "${code}" not found in catalog.`);
  };

  const handleReturnSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["products", storeId] });
    refetchShift();
  };

  return {
    user,
    storeId,
    currentStore,
    isOnline,
    isFullscreen,
    toggleFullscreen,
    // Modals
    isPaymentOpen,
    setIsPaymentOpen,
    isReceiptOpen,
    setIsReceiptOpen,
    isShiftOpen,
    setIsShiftOpen,
    isHoldResumeOpen,
    setIsHoldResumeOpen,
    isReturnOpen,
    setIsReturnOpen,
    isCustomerModalOpen,
    setIsCustomerModalOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    lastCompletedSale,
    // Catalog & Filter
    products,
    isProductsLoading,
    categories,
    selectedCategory,
    setSelectedCategory,
    productGridSearch,
    setProductGridSearch,
    filteredGridProducts,
    visibleGridProducts,
    handleBarcodeNotFound,
    // Viewport
    mobileTab,
    setMobileTab,
    // Cart
    cartItems,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
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
    handleResumeBill,
    handleDeleteHeldBill,
    // Shift & Sale
    activeShift,
    shiftSummary,
    handleOpenShift,
    handleCloseShift,
    handleRecordCashMovement,
    handleCompleteSale,
    handleReturnSuccess,
    formatCurrency,
  };
}
