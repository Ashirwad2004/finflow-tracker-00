import { Sparkles, Calculator, ReceiptIndianRupee, LogOut } from "lucide-react";
import { NavigateFunction } from "react-router-dom";
import { cn } from "@/core/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calculator as CalculatorComponent } from "@/components/shared/calculator";
import { RequestFeatureDialog } from "@/components/shared/RequestFeatureDialog";
import { NotificationDropdown } from "@/components/shared/NotificationDropdown";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

interface SidebarFooterProps {
  collapsed: boolean;
  isSalesman: boolean;
  isPaidSubscriber: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  isTrialExpired: boolean;
  isCalculatorOpen: boolean;
  setIsCalculatorOpen: (open: boolean) => void;
  userId: string;
  signOut: () => void;
  navigate: NavigateFunction;
}

export const SidebarFooter = ({
  collapsed,
  isSalesman,
  isPaidSubscriber,
  isTrialActive,
  trialDaysLeft,
  isTrialExpired,
  isCalculatorOpen,
  setIsCalculatorOpen,
  userId,
  signOut,
  navigate,
}: SidebarFooterProps) => {
  return (
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
                <DialogTitle className="text-base font-bold">
                  Advanced GST & Business Calculator
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Statutory Indian GST computations, margin pricing & standard arithmetic
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <CalculatorComponent />
        </DialogContent>
      </Dialog>

      <div
        className={cn(
          "flex items-center gap-1",
          collapsed ? "flex-col" : "justify-between"
        )}
      >
        <div className="flex items-center gap-1">
          <NotificationDropdown userId={userId} />
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
  );
};
