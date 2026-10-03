import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useSubscription } from "@/core/hooks/useSubscription";
import { businessMenuItems, personalMenuItems } from "./sidebarNavItems";

export function useAppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isBusinessMode, toggleBusinessMode, isSalesman, currentStoreId } = useBusiness();
  const { isPaidSubscriber, isTrialActive, trialDaysLeft, isTrialExpired } = useSubscription();

  const [collapsed, setCollapsed] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "/sales": true,
    "/purchases": true,
  });

  const toggleSubmenu = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMenus((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  useEffect(() => {
    if (location.pathname.startsWith("/sales")) {
      setExpandedMenus((prev) => ({ ...prev, "/sales": true }));
    } else if (location.pathname.startsWith("/purchases")) {
      setExpandedMenus((prev) => ({ ...prev, "/purchases": true }));
    }
  }, [location.pathname]);

  const navigationRef = useRef<HTMLElement>(null);
  const navigationScrollKey = `sidebar-scroll:${user?.id || "anonymous"}:${isBusinessMode ? "business" : "personal"}`;

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;

    const savedScrollTop = Number(sessionStorage.getItem(navigationScrollKey) || 0);
    requestAnimationFrame(() => {
      navigation.scrollTop = Number.isFinite(savedScrollTop) ? savedScrollTop : 0;
    });
  }, [navigationScrollKey]);

  const rememberNavigationScroll = (event: React.UIEvent<HTMLElement>) => {
    sessionStorage.setItem(navigationScrollKey, String(event.currentTarget.scrollTop));
  };

  const handleModeToggle = async (checked: boolean) => {
    if (isSalesman) return;
    await toggleBusinessMode(checked);
    if (checked) {
      navigate("/business-dashboard");
    } else {
      navigate("/");
    }
  };

  const { data: pendingOrderCount = 0 } = useQuery({
    queryKey: ["online_orders_pending_count", currentStoreId],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("online_orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", currentStoreId)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!currentStoreId && isBusinessMode,
    refetchInterval: 20_000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", currentStoreId],
    queryFn: async () => {
      // @ts-ignore: types.ts might be incomplete
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", currentStoreId || "")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!currentStoreId,
  });

  const currentMenuItems = isSalesman
    ? businessMenuItems.filter((item) => item.path === "/online-store" || item.path === "/settings")
    : isBusinessMode
    ? businessMenuItems
    : personalMenuItems;

  return {
    location,
    navigate,
    signOut,
    user,
    profile,
    isBusinessMode,
    isSalesman,
    currentStoreId,
    isPaidSubscriber,
    isTrialActive,
    trialDaysLeft,
    isTrialExpired,
    collapsed,
    setCollapsed,
    isCalculatorOpen,
    setIsCalculatorOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    expandedMenus,
    toggleSubmenu,
    navigationRef,
    rememberNavigationScroll,
    handleModeToggle,
    pendingOrderCount,
    currentMenuItems,
  };
}
