import React from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanId, BillingCycle, PLAN_CONFIGS } from "./types";

interface SubscriptionPlanSelectorProps {
  selectedPlanId: PlanId;
  setSelectedPlanId: (id: PlanId) => void;
  billingCycle: BillingCycle;
  setBillingCycle: (cycle: BillingCycle) => void;
}

export function SubscriptionPlanSelector({
  selectedPlanId,
  setSelectedPlanId,
  billingCycle,
  setBillingCycle,
}: SubscriptionPlanSelectorProps) {
  return (
    <>
      {/* Billing Cycle Switcher */}
      <div className="bg-muted/60 p-1 rounded-xl flex items-center gap-1 border">
        <button
          type="button"
          onClick={() => setBillingCycle("monthly")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            billingCycle === "monthly"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly Billing
        </button>
        <button
          type="button"
          onClick={() => setBillingCycle("annual")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            billingCycle === "annual"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Annual Billing
        </button>
      </div>

      {/* Plan Tier Selector */}
      <div className="space-y-2.5">
        {PLAN_CONFIGS.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          const price = billingCycle === "annual" ? plan.annualPricePerMonth : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border/60 hover:border-primary/40 bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-foreground">{plan.name}</span>
                    {plan.recommended && (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] font-bold px-1.5 py-0">
                        Most Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{plan.description}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-black text-foreground">
                  {price === 0 ? "Free" : `₹${price}`}
                </span>
                {price > 0 && <span className="text-[10px] text-muted-foreground">/mo</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
