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
  Landmark
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
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator as CalculatorComponent } from "@/components/shared/calculator";
import { Settings } from "lucide-react";
import { SettingsDialog } from "@/features/settings/components/SettingsDialog";
import { BRAND } from "@/core/constants/brand";
import { Badge } from "@/components/ui/badge";
import { RequestFeatureDialog } from "@/components/shared/RequestFeatureDialog";
import { SyncStatusBadge } from "@/components/shared/SyncStatusBadge";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { RealSubscriptionCheckout } from "@/features/landing/components/RealSubscriptionCheckout";

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

export const businessMenuItems = [
  {
    title: "Dashboard",
    path: "/business-dashboard",
    icon: BarChart3,
    description: "Business Analytics"
  },
  {
    title: "Print Studio",
    path: "/print-studio",
    icon: Printer,
    description: "Invoice Designs"
  },
  {
    title: "Parties",
    path: "/parties",
    icon: Users,
    description: "Customers & Vendors"
  },
  {
    title: "Bank Details",
    path: "/bank-details",
    icon: Landmark,
    description: "Manage Bank Accounts"
  },
  {
    title: "Inventory",
    path: "/inventory",
    icon: Package,
    description: "Manage Products"
  },
  {
    title: "Sales & Invoices",
    path: "/sales",
    icon: TrendingUp,
    description: "Manage Sales"
  },
  {
    title: "Purchases",
    path: "/purchases",
    icon: ShoppingCart,
    description: "Manage Bills"
  },
  {
    title: "Online Store",
    path: "/online-store",
    icon: Globe,
    description: "Manage storefront"
  },
  {
    title: "Loyalty & Campaigns",
    path: "/loyalty",
    icon: Sparkles,
    description: "Reward & Marketing Hub"
  },
  {
    title: "Reports",
    path: "/reports",
    icon: FileBarChart,
    description: "Party & Analytics"
  },
  {
    title: "All Expenses",
    path: "/expenses",
    icon: ReceiptIndianRupee,
    description: "Other Expenses"
  },
  {
    title: "Recently Deleted",
    path: "/recently-deleted",
    icon: Clock,
    description: "Recover items"
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Preferences"
  }
];

// Exporting menuItems for backward compatibility in other files (though they should update)
export const menuItems = personalMenuItems;

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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

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

  // Query user subscription status to conditionally hide upgrade prompts
  const { data: subStatus } = useQuery({
    queryKey: ["subscription_status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("subscription_status")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.warn("Fetch subscription status warning:", error.message);
      return data || { plan: "starter", status: "active" };
    },
    enabled: !!user?.id,
  });

  const isUpgraded = subStatus?.plan === "pro" || subStatus?.plan === "business";

  const currentMenuItems = isSalesman
    ? businessMenuItems.filter(item => item.path === "/online-store" || item.path === "/settings")
    : (isBusinessMode ? businessMenuItems : personalMenuItems);

  return (
    <aside
      className={cn(
        "relative h-full flex flex-col border-r bg-card transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo & Brand */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Wallet className="w-6 h-6 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-lg text-foreground truncate">
              {isBusinessMode ? BRAND.businessLabel : BRAND.name}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {isSalesman ? "Salesman Access" : (profile?.display_name ?? profile?.business_name ?? "Welcome")}
            </p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 py-2 border-b bg-muted/20 flex items-center justify-between">
          <SyncStatusBadge />
        </div>
      )}

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border bg-background shadow-md"
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
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {currentMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showPendingBadge =
            item.path === "/online-store" && isBusinessMode && pendingOrderCount > 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
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
        {!isSalesman && !isUpgraded && (
          <Button
            variant="outline"
            onClick={() => setIsCheckoutOpen(true)}
            className={cn(
              "w-full justify-start gap-3 bg-gradient-to-r from-primary/10 to-violet-500/10 border-primary/20 text-primary font-bold hover:bg-primary/20 transition-all",
              collapsed && "justify-center px-0"
            )}
            title="Upgrade Subscription"
          >
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            {!collapsed && <span>Upgrade Plan</span>}
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
              {!collapsed && <span>Calculator</span>}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Calculator</DialogTitle>
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

      <RealSubscriptionCheckout
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        initialPlanId="pro"
        initialBillingCycle="annual"
      />
    </aside>
  );
}