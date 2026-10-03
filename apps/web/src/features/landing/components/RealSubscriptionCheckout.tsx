import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useSubscriptionCheckout,
  SubscriptionPlanSelector,
  SubscriptionInlineAuth,
  SubscriptionPaymentMethod,
  SubscriptionOrderSummary,
  SubscriptionSuccessView,
  PlanId,
  BillingCycle,
} from "./subscription";

export * from "./subscription";

export interface RealSubscriptionCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlanId?: PlanId;
  initialBillingCycle?: BillingCycle;
}

export function RealSubscriptionCheckout({
  open,
  onOpenChange,
  initialPlanId = "pro",
  initialBillingCycle = "annual",
}: RealSubscriptionCheckoutProps) {
  const {
    user,
    selectedPlanId,
    setSelectedPlanId,
    billingCycle,
    setBillingCycle,
    paymentMethod,
    setPaymentMethod,
    couponCode,
    setCouponCode,
    appliedDiscountPercent,
    couponError,
    upiId,
    setUpiId,
    currentPlan,
    isCurrentPlanActive,
    rawSubtotal,
    couponDiscountAmount,
    gstAmount,
    grandTotal,
    authMode,
    setAuthMode,
    authName,
    setAuthName,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authLoading,
    authError,
    isProcessing,
    isSuccess,
    paymentError,
    handleApplyCoupon,
    handleRemoveCoupon,
    handleInlineAuth,
    handleFullAuthRedirect,
    handleSubscribe,
  } = useSubscriptionCheckout({
    open,
    onOpenChange,
    initialPlanId,
    initialBillingCycle,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-card">
        {isSuccess ? (
          <SubscriptionSuccessView
            currentPlan={currentPlan}
            billingCycle={billingCycle}
            grandTotal={grandTotal}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x border-border/60">
            {/* Left Column — Plan Selector & Form (7 cols) */}
            <div className="md:col-span-7 p-6 md:p-8 space-y-6 overflow-y-auto max-h-[85vh]">
              <DialogHeader className="p-0 space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-wider">
                      Official Upgrade
                    </Badge>
                  </div>
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight">Choose Subscription Plan</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Select your tier and payment method to unlock full financial tools.
                </DialogDescription>
              </DialogHeader>

              {/* Plan & Cycle Selection */}
              <SubscriptionPlanSelector
                selectedPlanId={selectedPlanId}
                setSelectedPlanId={setSelectedPlanId}
                billingCycle={billingCycle}
                setBillingCycle={setBillingCycle}
              />

              {/* Authentication Guard / Inline Auth */}
              <SubscriptionInlineAuth
                user={user}
                planName={currentPlan.name}
                authMode={authMode}
                setAuthMode={setAuthMode}
                authName={authName}
                setAuthName={setAuthName}
                authEmail={authEmail}
                setAuthEmail={setAuthEmail}
                authPassword={authPassword}
                setAuthPassword={setAuthPassword}
                authLoading={authLoading}
                authError={authError}
                onInlineAuth={handleInlineAuth}
                onFullAuthRedirect={handleFullAuthRedirect}
              />

              {/* Payment Method & Coupons */}
              {selectedPlanId !== "starter" && (
                <SubscriptionPaymentMethod
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  upiId={upiId}
                  setUpiId={setUpiId}
                  couponCode={couponCode}
                  setCouponCode={setCouponCode}
                  appliedDiscountPercent={appliedDiscountPercent}
                  couponError={couponError}
                  onApplyCoupon={handleApplyCoupon}
                  onRemoveCoupon={handleRemoveCoupon}
                />
              )}
            </div>

            {/* Right Column — Summary & Checkout CTA (5 cols) */}
            <SubscriptionOrderSummary
              currentPlan={currentPlan}
              billingCycle={billingCycle}
              rawSubtotal={rawSubtotal}
              couponDiscountAmount={couponDiscountAmount}
              appliedDiscountPercent={appliedDiscountPercent}
              gstAmount={gstAmount}
              grandTotal={grandTotal}
              paymentError={paymentError}
              isProcessing={isProcessing}
              isCurrentPlanActive={isCurrentPlanActive}
              user={user}
              onSubscribe={handleSubscribe}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RealSubscriptionCheckout;