import React from "react";
import { ArrowRight, Loader2, Shield, Truck, RotateCcw } from "lucide-react";

interface CartDrawerFooterProps {
  step: "cart" | "form";
  setStep: (s: "cart" | "form") => void;
  cartTotal: number;
  deliveryCharge: number;
  baseDeliveryCharge: number;
  formatCurrency: (n: number) => string;
  isSubmitting: boolean;
  formValid: boolean;
  onSubmit: () => Promise<void>;
}

export const CartDrawerFooter: React.FC<CartDrawerFooterProps> = ({
  step,
  setStep,
  cartTotal,
  deliveryCharge,
  baseDeliveryCharge,
  formatCurrency,
  isSubmitting,
  formValid,
  onSubmit,
}) => {
  return (
    <div className="p-5 border-t border-slate-100 space-y-3 flex-shrink-0 bg-white">
      {/* Subtotal row */}
      <div className="space-y-1.5 px-1 mb-2">
        {baseDeliveryCharge > 0 && (
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Subtotal</span>
            <span>{formatCurrency(cartTotal)}</span>
          </div>
        )}
        {baseDeliveryCharge > 0 && (
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Delivery Fee</span>
            {deliveryCharge === 0 ? (
              <span className="font-bold text-green-600">FREE</span>
            ) : (
              <span>{formatCurrency(deliveryCharge)}</span>
            )}
          </div>
        )}
        <div className="flex justify-between text-sm font-bold text-slate-700 pt-1">
          <span>Total</span>
          <span className="font-black text-slate-900">
            {formatCurrency(cartTotal + deliveryCharge)}
          </span>
        </div>
      </div>

      {step === "cart" ? (
        <button
          onClick={() => setStep("form")}
          className="w-full h-14 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(290 80% 60%) 100%)",
            boxShadow: "0 6px 24px hsl(262 83% 58% / 0.4)",
          }}
        >
          Proceed to Checkout
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setStep("cart")}
            className="h-14 px-5 rounded-2xl border-2 border-slate-200 font-bold text-slate-600 text-sm transition-all hover:bg-slate-50"
          >
            Back
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !formValid}
            className="flex-1 h-14 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(290 80% 60%) 100%)",
              boxShadow: formValid ? "0 6px 24px hsl(262 83% 58% / 0.4)" : "none",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Placing…
              </>
            ) : (
              <>Place Order · {formatCurrency(cartTotal + deliveryCharge)}</>
            )}
          </button>
        </div>
      )}

      {/* Trust row */}
      <div className="flex items-center justify-center gap-5 pt-1">
        {[
          { icon: <Shield className="w-3 h-3 text-green-500" />, label: "Secure" },
          { icon: <Truck className="w-3 h-3 text-blue-500" />, label: "Fast Delivery" },
          { icon: <RotateCcw className="w-3 h-3 text-orange-500" />, label: "Easy Returns" },
        ].map((b) => (
          <div key={b.label} className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
            {b.icon} {b.label}
          </div>
        ))}
      </div>
    </div>
  );
};
