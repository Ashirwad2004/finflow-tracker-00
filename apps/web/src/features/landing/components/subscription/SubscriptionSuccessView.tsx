import React from "react";
import { Check } from "lucide-react";
import { PlanConfig, BillingCycle } from "./types";

interface SubscriptionSuccessViewProps {
  currentPlan: PlanConfig;
  billingCycle: BillingCycle;
  grandTotal: number;
}

export function SubscriptionSuccessView({
  currentPlan,
  billingCycle,
  grandTotal,
}: SubscriptionSuccessViewProps) {
  return (
    <div className="p-12 text-center space-y-6 bg-gradient-to-b from-emerald-500/10 to-transparent">
      <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl animate-bounce">
        <Check className="w-10 h-10 stroke-[3]" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-foreground">Upgrade Confirmed!</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Your account has been upgraded to{" "}
          <span className="font-bold text-primary">
            RupeeBill {currentPlan.name} ({billingCycle === "annual" ? "Annual" : "Monthly"})
          </span>
          .
        </p>
      </div>
      <div className="p-4 rounded-2xl bg-card border max-w-sm mx-auto text-left text-xs space-y-2">
        <div className="flex justify-between text-muted-foreground">
          <span>Total Amount Paid:</span>
          <span className="font-bold text-foreground">₹{grandTotal.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Billing Period:</span>
          <span className="font-medium text-foreground uppercase">{billingCycle}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Status:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">ACTIVE PRO TIER</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground animate-pulse">Redirecting to your dashboard...</p>
    </div>
  );
}
