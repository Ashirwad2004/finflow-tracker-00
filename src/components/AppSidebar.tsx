import {
  LayoutDashboard,
  Receipt,
  Users,
  Wallet,
  HandCoins,
  Clock,
  Calculator,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShoppingCart
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator as CalculatorComponent } from "@/components/calculator";
import { Settings } from "lucide-react";
import { SettingsDialog } from "./SettingsDialog";
import { useBusiness } from "@/contexts/BusinessContext";

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
    icon: Receipt,
    description: "View all transactions"
  },
  {
    title: "Groups",
    path: "/groups",
    icon: Users,
    description: "Shared expenses"
  },
  {
    title: "Split Bills",
    path: "/split-bills",
    icon: Wallet,
    description: "Divide costs"
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

const businessMenuItems = [
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Business Overview"
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
    title: "All Expenses",
    path: "/expenses",
    icon: Receipt,
    description: "Other Expenses"
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
  const { signOut, user } = useAuth();
  const { isBusinessMode } = useBusiness();
  const [collapsed, setCollapsed] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const currentMenuItems = isBusinessMode ? businessMenuItems : personalMenuItems;

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col border-r bg-card transition-all duration-300",
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
              {isBusinessMode ? "FinFlow Bus." : "ExpenseTracker"}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{profile?.display_name || "Welcome!"}</p>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border bg-background shadow-md"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {currentMenuItems.map((item) => {
          const isActive = location.pathname === item.path;

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
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className={cn(
                    "text-xs truncate",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {item.description}
                  </p>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-2">
        <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3",
                collapsed && "justify-center px-0"
              )}
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
          "flex items-center gap-2",
          collapsed ? "flex-col" : "justify-between"
        )}>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </aside >
  );
}
