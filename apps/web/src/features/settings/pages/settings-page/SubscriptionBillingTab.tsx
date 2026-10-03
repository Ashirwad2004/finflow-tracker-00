import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldCheck, CreditCard } from "lucide-react";

interface SubscriptionBillingTabProps {
  activePlanName: string;
  subStatus: any;
  onOpenCheckout: () => void;
}

export const SubscriptionBillingTab: React.FC<SubscriptionBillingTabProps> = ({
  activePlanName,
  subStatus,
  onOpenCheckout,
}) => {
  return (
    <div className="space-y-4 outline-none">
      <Card className="rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black">Subscription Status</CardTitle>
                <CardDescription className="text-xs">
                  Manage your RupeeBill tier and payment methods.
                </CardDescription>
              </div>
            </div>
            <Badge
              className={`px-3 py-1 font-bold text-xs ${
                activePlanName === "PRO" || activePlanName === "BUSINESS"
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {activePlanName} TIER
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-6">
          <div className="p-4 rounded-xl bg-background border space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current Active Plan:</span>
              <span className="font-black text-foreground text-sm">{activePlanName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Subscription Status:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Active & Verified
              </span>
            </div>
            {subStatus?.current_period_end && (
              <div className="flex justify-between items-center pt-2 border-t text-[11px]">
                <span className="text-muted-foreground">Renewal / Expiry Date:</span>
                <span className="font-semibold text-foreground">
                  {new Date(subStatus.current_period_end).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {activePlanName === "PRO" || activePlanName === "BUSINESS" ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  All Premium {activePlanName} Features Unlocked
                </span>
                <Badge className="bg-emerald-500 text-white font-bold text-[10px]">ACTIVE</Badge>
              </div>
              <Button
                variant="outline"
                onClick={onOpenCheckout}
                className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Manage Subscription / Billing Details
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={onOpenCheckout}
                className="w-full h-12 rounded-xl font-bold text-sm bg-gradient-to-r from-primary to-violet-600 text-white shadow-lg hover:opacity-95 transition-all"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Upgrade Plan & Make Payment
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Upgrade to unlock AI OCR receipt scanning, Party ledgers, online storefront & priority sync.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
