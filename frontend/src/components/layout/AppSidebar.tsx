import {
  LayoutDashboard,
  ReceiptIndianRupee,
  Users,
  Wallet,
  HandCoins,
  Clock,
  Calculator,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Package,
  FileBarChart,
  Printer,
  Globe,
  Sparkles,
  Landmark,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ArrowDown,
  FileText,
  ShoppingBag,
  Store,
  Barcode,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/core/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationDropdown } from "@/components/shared/NotificationDropdown";
import { useAuth } from "@/core/lib/auth";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator as CalculatorComponent } from "@/components/shared/calculator";
import { Settings } from "lucide-react";
import { SettingsDialog } from "@/features/settings/components/SettingsDialog";
import { BRAND } from "@/core/constants/brand";
import { Badge } from "@/components/ui/badge";
import { RequestFeatureDialog } from "@/components/shared/RequestFeatureDialog";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { Logo } from "@/components/shared/Logo";
import { useSubscription } from "@/core/hooks/useSubscription";

const personalMenuItems = [
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Overview & stats"
  },
  {
    title: "All Expenses",
    path: "/expenses",
    icon: ReceiptIndianRupee,
    description: "View all transactions"
  },
  {
    title: "Groups",
    path: "/groups",
    icon: Users,
    description: "Shared expenses"
  },
  {
    title: "Lent Money",
    path: "/lent-money",
    icon: HandCoins,
    description: "Track loans"
  },
  {
    title: "Borrowed Money",
    path: "/borrowed-money",
    icon: HandCoins,
    description: "Track debts"
  },
  {
    title: "Reports",
    path: "/personal-reports",
    icon: FileBarChart,
    description: "Analytics & summaries"
  },
  {
    title: "Recently Deleted",
    path: "/recently-deleted",
    icon: Clock,
    description: "Recover expenses"
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Preferences"
  }
];

export const businessMenuItems: any[] = [
  {
    title: "Dashboard",
    path: "/business-dashboard",
    icon: BarChart3,
    description: "Business Analytics"
  },
  {
    title: "Retail POS",
    path: "/pos",
    icon: Store,
    description: "Counter Billing & Barcode",
    badge: "New"
  },
  {
    title: "Sales & Invoices",
    path: "/sales",
    icon: TrendingUp,
    description: "Invoices & Receipts",
    children: [
      {
        title: "Sales",
        path: "/sales",
        icon: FileText,
      },
      {
        title: "Payment In",
        path: "/sales?tab=payment-in",
        icon: ArrowDownLeft,
      },
      {
        title: "Sales Order",
        path: "/sales?tab=sales-order",
        icon: ShoppingBag,      
      },
    ],
  },
  {
    title: "Inventory",
    path: "/inventory",
    icon: Package,
    description: "Manage Products",
    children: [
      {
        title: "Products & Stock",
        path: "/inventory",
        icon: Package,
      },
      {
        title: "Barcode Management",
        path: "/inventory/barcodes",
        icon: Barcode,
      },
    ],
  },
  {
    title: "Purchases",
    path: "/purchases",
    icon: ShoppingCart,
    description: "Bills & Payments",
    children: [
      {
        title: "Purchases",
        path: "/purchases",
        icon: FileText,
      },
      {
        title: "Payment Out",
        path: "/purchases?tab=payment-out",
        icon: ArrowUpRight,
      },
      {
        title: "Purchase Order",
        path: "/purchases?tab=purchase-order",
        icon: ShoppingBag,
      },
    ],
  },
  {
    title: "Parties",
    path: "/parties",
    icon: Users,
    description: "Customers & Vendors"
  },
  {
    title: "Print Studio",
    path: "/print-studio",
    icon: Printer,
    description: "Invoice Designs"
  },
  {
    title: "Reports",
    path: "/reports",
    icon: FileBarChart,
    description: "Financial & Tax Reports"
  },
  {
    title: "Online Store",
    path: "/online-store",
    icon: Globe,
    description: "Manage storefront"
  },
  {
    title: "All Expenses",
    path: "/expenses",
    icon: ReceiptIndianRupee,
    description: "Other Expenses"
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Preferences"
  },
  {
    title: "Banking & Treasury",
    path: "/bank-details",
    icon: Landmark,
    description: "Accounts, Passbook & BRS"
  },
  {
    title: "Loyalty & Campaigns",
    path: "/loyalty",
    icon: Sparkles,
    description: "Reward & Marketing Hub"
  },
  {
    title: "Recycle Bin",
    path: "/recently-deleted",
    icon: Trash2,
    description: "Recover deleted items"
  }
];

// Lazy route chunk preloaders for instantaneous 0ms client-side transitions
const routePreloaders: Record<string, () => Promise<any>> = {
  "/sales": () => import("@/features/business/pages/Sales"),
  "/purchases": () => import("@/features/business/pages/Purchases"),
  "/business-dashboard": () => import("@/features/business/pages/BusinessDashboard"),
  "/inventory": () => import("@/features/business/pages/Inventory"),
  "/inventory/barcodes": () => import("@/features/pos/pages/BarcodeManagement"),
  "/parties": () => import("@/features/business/pages/Parties"),
  "/pos": () => import("@/features/pos/pages/POSPage"),
  "/print-studio": () => import("@/features/business/pages/PrintStudio"),
  "/reports": () => import("@/features/business/pages/Reports"),
  "/online-store": () => import("@/features/business/pages/OnlineStore"),
  "/bank-details": () => import("@/features/business/pages/BankDetails"),
  "/loyalty": () => import("@/features/business/pages/LoyaltyCampaigns"),
  "/expenses": () => import("@/features/expenses/pages/AllExpenses"),
  "/groups": () => import("@/features/groups/Groups"),
  "/lent-money": () => import("@/features/loans/pages/LentMoney"),
  "/borrowed-money": () => import("@/features/loans/pages/BorrowedMoney"),
  "/personal-reports": () => import("@/features/reports/pages/PersonalReports"),
  "/recently-deleted": () => import("@/features/trash/pages/RecentlyDeletedPage"),
  "/settings": () => import("@/features/settings/pages/Settings"),
};

export const prefetchRoute = (path: string) => {
  const cleanPath = path.split("?")[0];
  const loader = routePreloaders[cleanPath];
  if (loader) {
    loader().catch(() => {});
  }
};

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isBusinessMode, toggleBusinessMode, isSalesman, currentStoreId } = useBusiness();
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

  const { isPaidSubscriber, isTrialActive, trialDaysLeft, isTrialExpired } = useSubscription();

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
      navigate('/business-dashboard');
    } else {
      navigate('/');
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
    ? businessMenuItems.filter(item => item.path === "/online-store" || item.path === "/settings")
    : (isBusinessMode ? businessMenuItems : personalMenuItems);

  return (
    <aside
      className={cn(
        "relative h-full flex flex-col border-r bg-card transition-all duration-300 shrink-0 w-full md:w-auto",
        collapsed ? "md:w-16" : "md:w-64"
      )}
    >
      {/* Logo & Brand */}
      <div className="flex flex-col gap-2.5 p-4 border-b">
        <div className="flex items-center">
          {collapsed ? (
            <div className="mx-auto">
              <Logo size={40} showText={false} />
            </div>
          ) : (
            <Logo size={36} showText={true} />
          )}
        </div>
        {!collapsed && (
          <div className="mt-1 px-2.5 py-1.5 bg-muted/40 rounded-xl border border-border/40 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {isBusinessMode ? BRAND.businessLabel : BRAND.name}
              </p>
              <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                {isSalesman ? "Salesman Session" : (profile?.display_name ?? profile?.business_name ?? "Welcome")}
              </p>
            </div>
            {!isSalesman && (
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                isPaidSubscriber
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : isTrialActive
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              )}>
                {isPaidSubscriber ? "PRO" : isTrialActive ? `${trialDaysLeft}d Trial` : "Expired"}
              </span>
            )}
          </div>
        )}
      </div>


      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border bg-background shadow-md"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* Mode Toggle / Role Label */}
      <div className={cn(
        "px-4 py-3 border-b flex items-center transition-all duration-200",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {isSalesman ? (
          <>
            {!collapsed && <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">Salesman Session</span>}
            <Switch
              checked={true}
              disabled={true}
              title="Salesman forced Business Mode"
            />
          </>
        ) : (
          <>
            {!collapsed && <span className="text-sm font-medium">Business Mode</span>}
            <Switch
              checked={isBusinessMode}
              onCheckedChange={handleModeToggle}
              title={isBusinessMode ? "Switch to Personal Mode" : "Switch to Business Mode"}
            />
          </>
        )}
      </div>

      {/* Navigation */}
      <nav
        ref={navigationRef}
        onScroll={rememberNavigationScroll}
        className="flex-1 p-3 space-y-1 overflow-y-auto"
      >
        {currentMenuItems.map((item: any) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0;
          const isSubmenuOpen = expandedMenus[item.path] ?? false;
          const isParentActive = location.pathname.startsWith(item.path);

          // If menu has children and sidebar is expanded, render collapsible submenu
          if (hasChildren && !collapsed) {
            return (
              <div key={item.path} className="space-y-1">
                {/* Parent Nav Row with Down Arrow */}
                <div
                  onMouseEnter={() => prefetchRoute(item.path)}
                  onFocus={() => prefetchRoute(item.path)}
                  onClick={() => {
                    if (!isSubmenuOpen) {
                      setExpandedMenus((prev) => ({ ...prev, [item.path]: true }));
                      navigate(item.path);
                    } else {
                      setExpandedMenus((prev) => ({ ...prev, [item.path]: false }));
                    }
                    if (onNavigate) onNavigate();
                  }}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group select-none",
                    isParentActive
                      ? "bg-primary/10 text-primary dark:bg-primary/20 font-bold"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <item.icon className={cn(
                      "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                      isParentActive && "text-primary"
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{item.title}</p>
                      <p className="text-xs truncate text-muted-foreground/80">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Down Arrow / Chevron button */}
                  <button
                    type="button"
                    onClick={(e) => toggleSubmenu(item.path, e)}
                    className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title={isSubmenuOpen ? "Collapse Submenu" : "Expand Submenu"}
                  >
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      isSubmenuOpen ? "rotate-180 text-primary" : "rotate-0"
                    )} />
                  </button>
                </div>

                {/* Submenu Tree (Downwards) */}
                {isSubmenuOpen && (
                  <div className="ml-5 pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-800 animate-in fade-in-50 duration-200">
                    {item.children.map((child: any, idx: number) => {
                      const isChildActive = child.path.includes("?")
                        ? (location.pathname + location.search) === child.path
                        : location.pathname === child.path && !location.search.includes("tab=");

                      return (
                        <div key={child.path} className="flex flex-col">
                          {idx > 0 && (
                            <div className="flex items-center pl-3.5 py-0.5 text-slate-300 dark:text-slate-700 select-none">
                              <ArrowDown className="w-2.5 h-2.5 opacity-50" />
                            </div>
                          )}
                          <NavLink
                            to={child.path}
                            onClick={onNavigate}
                            onMouseEnter={() => prefetchRoute(child.path)}
                            onFocus={() => prefetchRoute(child.path)}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group",
                              isChildActive
                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {child.icon && (
                                <child.icon className={cn(
                                  "w-4 h-4 shrink-0 transition-transform group-hover:scale-105",
                                  isChildActive ? "text-primary-foreground" : "text-muted-foreground"
                                )} />
                              )}
                              <span className="truncate">{child.title}</span>
                            </div>
                            {child.badge && (
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider",
                                isChildActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                              )}>
                                {child.badge}
                              </span>
                            )}
                          </NavLink>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Single Item or Collapsed View
          const currentFullPath = location.pathname + location.search;
          const isActive = item.path.includes("?")
            ? currentFullPath === item.path
            : location.pathname === item.path;
          const showPendingBadge =
            item.path === "/online-store" && isBusinessMode && pendingOrderCount > 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              onMouseEnter={() => prefetchRoute(item.path)}
              onFocus={() => prefetchRoute(item.path)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                isActive && "text-primary-foreground"
              )} />
              {!collapsed && (
                <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className={cn(
                      "text-xs truncate",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </p>
                  </div>
                  {showPendingBadge && (
                    <Badge
                      variant={isActive ? "secondary" : "destructive"}
                      className="h-5 min-w-5 px-1.5 text-[10px] font-bold shrink-0"
                    >
                      {pendingOrderCount > 99 ? "99+" : pendingOrderCount}
                    </Badge>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-2">
        {/* Upgrade Plan Button (Hidden if user is already upgraded) */}
        {!isSalesman && !isPaidSubscriber && (
          <Button
            variant="outline"
            onClick={() => navigate("/pricing")}
            className={cn(
              "w-full justify-start gap-3 border font-bold transition-all",
              isTrialExpired
                ? "bg-amber-500/15 border-amber-500/30 text-amber-500 hover:bg-amber-500/25"
                : "bg-gradient-to-r from-primary/10 to-violet-500/10 border-primary/20 text-primary hover:bg-primary/20",
              collapsed && "justify-center px-0"
            )}
            title={isTrialExpired ? "Trial Expired - Pay to Continue" : "Upgrade Subscription"}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <span className="truncate">
                {isTrialExpired
                  ? "Trial Expired • ₹299"
                  : isTrialActive
                  ? `Trial: ${trialDaysLeft}d left`
                  : "Upgrade Plan"}
              </span>
            )}
          </Button>
        )}

        <RequestFeatureDialog collapsed={collapsed} />

        <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3",
                collapsed && "justify-center px-0"
              )}
              title="Calculator"
              aria-label="Calculator"
            >
              <Calculator className="w-5 h-5" />
              {!collapsed && <span>GST & Calculator</span>}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-2 border-b">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ReceiptIndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">Advanced GST & Business Calculator</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Statutory Indian GST computations, margin pricing & standard arithmetic
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <CalculatorComponent />
          </DialogContent>
        </Dialog>

        <div className={cn(
          "flex items-center gap-1",
          collapsed ? "flex-col" : "justify-between"
        )}>
          <div className="flex items-center gap-1">
            <NotificationDropdown userId={user?.id || ""} />
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-muted-foreground hover:text-destructive"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

    </aside>
  );
}