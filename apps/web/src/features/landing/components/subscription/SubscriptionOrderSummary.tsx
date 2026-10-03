import React from "react";
import { CheckCircle2, AlertCircle, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanConfig, BillingCycle } from "./types";

interface SubscriptionOrderSummaryProps {
  currentPlan: PlanConfig;
  billingCycle: BillingCycle;
  rawSubtotal: number;
  couponDiscountAmount: number;
  appliedDiscountPercent: number;
  gstAmount: number;
  grandTotal: number;
  paymentError: string | null;
  isProcessing: boolean;
  isCurrentPlanActive: boolean;
  user: any;
  onSubscribe: () => void;
}

export function SubscriptionOrderSummary({
  currentPlan,
  billingCycle,
  rawSubtotal,
  couponDiscountAmount,
  appliedDiscountPercent,
  gstAmount,
  grandTotal,
  paymentError,
  isProcessing,
  isCurrentPlanActive,
  user,
  onSubscribe,
}: SubscriptionOrderSummaryProps) {
  return (
    <div className="md:col-span-5 p-6 md:p-8 bg-muted/30 flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        <div className="space-y-1">
          <h4 className="text-base font-bold text-foreground">Order Breakdown</h4>
          <p className="text-xs text-muted-foreground">
            Billed {billingCycle === "annual" ? "annually (12 months)" : "monthly"}
          </p>
        </div>

        {/* Pricing Calculation Lines */}
        <div className="space-y-3 text-xs border-y py-4 border-border/60">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {currentPlan.name} Plan ({billingCycle})
            </span>
            <span className="font-semibold text-foreground">
              ₹{rawSubtotal.toLocaleString("en-IN")}
            </span>
          </div>

          {couponDiscountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Coupon Discount ({appliedDiscountPercent}%)</span>
              <span>-₹{couponDiscountAmount.toLocaleString("en-IN")}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">GST (18%)</span>
            <span className="font-semibold text-foreground">
              ₹{gstAmount.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-3 border-t text-sm">
            <span className="font-black text-foreground">Total Due</span>
            <span className="text-2xl font-black text-primary">
              ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Plan Key Included Features */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Plan Highlights
          </span>
          <ul className="space-y-1.5">
            {currentPlan.features.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {paymentError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}
      </div>

      {/* Action Buttons & SSL Guarantee */}
      <div className="space-y-3 pt-4 border-t border-border/60">
        <Button
          disabled={isProcessing || isCurrentPlanActive}
          onClick={onSubscribe}
          className={`w-full h-12 rounded-xl font-bold text-sm transition-all ${
            isCurrentPlanActive
              ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 cursor-not-allowed opacity-100"
              : "bg-gradient-to-r from-primary to-violet-600 text-white shadow-lg hover:opacity-95"
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Securing Order...
            </>
          ) : isCurrentPlanActive ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
              {currentPlan.name} Plan Currently Active
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              {!user
                ? "Log In to Subscribe"
                : `Subscribe & Pay ₹${grandTotal.toLocaleString("en-IN")}`}
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          256-Bit SSL Encrypted · Instant Activation
        </div>
      </div>
    </div>
  );
}
