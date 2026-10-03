import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ShoppingBag, X, ChevronRight } from "lucide-react";
import { CartDrawerProps } from "./types";
import { useCartDrawerForm } from "./useCartDrawerForm";
import { CartItemsList } from "./CartItemsList";
import { CartCheckoutForm } from "./CartCheckoutForm";
import { CartDrawerFooter } from "./CartDrawerFooter";

export function CartDrawer({
  open,
  onClose,
  cart,
  products,
  cartTotal,
  cartCount,
  deliveryCharge,
  baseDeliveryCharge,
  freeDeliveryThreshold,
  formatCurrency,
  onRemoveOne,
  onAddOne,
  canAddOne,
  onClearItem,
  onSubmit,
  isSubmitting,
  onlinePaymentEnabled = false,
}: CartDrawerProps) {
  const {
    step,
    setStep,
    name,
    setName,
    phone,
    setPhone,
    address,
    setAddress,
    paymentMethod,
    setPaymentMethod,
    formValid,
    handleSubmit,
  } = useCartDrawerForm({
    open,
    onlinePaymentEnabled,
    onSubmit,
  });

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Panel sliding from right */}
        <DialogPrimitive.Content
          className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-300 data-[state=open]:duration-500"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Shopping Cart</DialogPrimitive.Title>

          {/* ── Drawer Header ── */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" style={{ color: "hsl(262 83% 58%)" }} />
                <h2 className="text-lg font-black text-slate-900">
                  {step === "cart" ? "Your Cart" : "Delivery Details"}
                </h2>
              </div>
              {step === "cart" && cartCount > 0 && (
                <p className="text-xs text-slate-400 mt-0.5 ml-7">
                  {cartCount} item{cartCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              aria-label="Close cart"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-0 px-6 py-3 border-b border-slate-50 flex-shrink-0 bg-slate-50/50">
            {["cart", "form"].map((s, i) => (
              <div key={s} className="flex items-center gap-0">
                <div
                  className={`flex items-center gap-2 text-xs font-bold transition-all ${
                    step === s ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      step === s ? "text-white" : "bg-slate-200 text-slate-400"
                    }`}
                    style={
                      step === s
                        ? {
                            background:
                              "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))",
                          }
                        : {}
                    }
                  >
                    {i + 1}
                  </div>
                  {s === "cart" ? "Cart" : "Details"}
                </div>
                {i === 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-2" />}
              </div>
            ))}
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto">
            {step === "cart" ? (
              <CartItemsList
                cart={cart}
                products={products}
                cartTotal={cartTotal}
                cartCount={cartCount}
                baseDeliveryCharge={baseDeliveryCharge}
                freeDeliveryThreshold={freeDeliveryThreshold}
                formatCurrency={formatCurrency}
                onRemoveOne={onRemoveOne}
                onAddOne={onAddOne}
                canAddOne={canAddOne}
                onClearItem={onClearItem}
              />
            ) : (
              <CartCheckoutForm
                name={name}
                setName={setName}
                phone={phone}
                setPhone={setPhone}
                address={address}
                setAddress={setAddress}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                onlinePaymentEnabled={onlinePaymentEnabled}
                cart={cart}
                products={products}
                cartTotal={cartTotal}
                deliveryCharge={deliveryCharge}
                baseDeliveryCharge={baseDeliveryCharge}
                formatCurrency={formatCurrency}
              />
            )}
          </div>

          {/* ── Footer CTA ── */}
          {cartCount > 0 && (
            <CartDrawerFooter
              step={step}
              setStep={setStep}
              cartTotal={cartTotal}
              deliveryCharge={deliveryCharge}
              baseDeliveryCharge={baseDeliveryCharge}
              formatCurrency={formatCurrency}
              isSubmitting={isSubmitting}
              formValid={formValid}
              onSubmit={handleSubmit}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
