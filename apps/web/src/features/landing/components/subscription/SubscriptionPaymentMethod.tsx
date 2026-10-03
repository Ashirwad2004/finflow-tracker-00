import React from "react";
import { Smartphone, CreditCard, Building2, Tag, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaymentMethodType } from "./types";

interface SubscriptionPaymentMethodProps {
  paymentMethod: PaymentMethodType;
  setPaymentMethod: (method: PaymentMethodType) => void;
  upiId: string;
  setUpiId: (id: string) => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  appliedDiscountPercent: number;
  couponError: string;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
}

export function SubscriptionPaymentMethod({
  paymentMethod,
  setPaymentMethod,
  upiId,
  setUpiId,
  couponCode,
  setCouponCode,
  appliedDiscountPercent,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
}: SubscriptionPaymentMethodProps) {
  const methods = [
    { id: "upi" as const, label: "UPI / QR", icon: Smartphone },
    { id: "card" as const, label: "Cards", icon: CreditCard },
    { id: "netbanking" as const, label: "NetBanking", icon: Building2 },
  ];

  return (
    <>
      {/* Payment Method Selector */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-bold text-foreground">Select Payment Method</Label>
        <div className="grid grid-cols-3 gap-2">
          {methods.map((method) => {
            const isSel = paymentMethod === method.id;
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id)}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isSel
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {method.label}
              </button>
            );
          })}
        </div>

        {paymentMethod === "upi" && (
          <div className="p-3 rounded-xl bg-muted/40 border space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Instant UPI ID or QR Code</span>
              <span className="text-[10px] text-emerald-600 font-bold">GPay / PhonePe / Paytm</span>
            </div>
            <Input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi or 9876543210@paytm"
              className="h-9 text-xs bg-background"
            />
          </div>
        )}
      </div>

      {/* Coupon Code Input */}
      <div className="pt-2 border-t space-y-2">
        <Label className="text-xs font-bold text-foreground flex items-center justify-between">
          <span>Discount Coupon</span>
          {appliedDiscountPercent > 0 && (
            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
              <Tag className="w-3 h-3" /> {appliedDiscountPercent}% OFF Applied
            </span>
          )}
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Try RUPEEBILL20"
              className="h-9 text-xs font-mono uppercase bg-background pr-7"
              disabled={appliedDiscountPercent > 0}
            />
            {appliedDiscountPercent > 0 && (
              <button
                type="button"
                onClick={onRemoveCoupon}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Remove coupon"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onApplyCoupon}
            disabled={appliedDiscountPercent > 0 || !couponCode.trim()}
            className="h-9 text-xs font-bold"
          >
            Apply
          </Button>
        </div>
        {couponError && <p className="text-[10px] text-rose-500 font-medium">{couponError}</p>}
      </div>
    </>
  );
}
