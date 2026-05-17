import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Wallet, Shield, Lock, CheckCircle2 } from "lucide-react";

interface CheckoutMockupProps {
  onPayClick: () => void;
}

export const CheckoutMockup = ({ onPayClick }: CheckoutMockupProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="rounded-3xl border bg-background shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left — Checkout Form */}
        <div className="p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center shadow-md">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">FinFlow <span className="text-primary">Pro</span></span>
          </div>
          <h3 className="text-2xl font-bold mb-1">Complete your upgrade</h3>
          <p className="text-muted-foreground text-sm mb-8">Secure payment · All taxes included</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Card Number</label>
              <div className="h-12 rounded-xl border border-border/60 bg-muted/30 flex items-center px-4 gap-3">
                <div className="flex gap-1">
                  <div className="w-6 h-4 bg-red-500 rounded-sm opacity-80" />
                  <div className="w-6 h-4 bg-orange-400 rounded-sm opacity-60 -ml-2" />
                </div>
                <span className="text-muted-foreground text-sm font-mono tracking-widest">•••• •••• •••• 4242</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expiry</label>
                <div className="h-12 rounded-xl border border-border/60 bg-muted/30 flex items-center px-4">
                  <span className="text-muted-foreground text-sm font-mono">MM / YY</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">CVV</label>
                <div className="h-12 rounded-xl border border-border/60 bg-muted/30 flex items-center px-4">
                  <span className="text-muted-foreground text-sm font-mono">•••</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Name on Card</label>
              <div className="h-12 rounded-xl border border-border/60 bg-muted/30 flex items-center px-4">
                <span className="text-muted-foreground text-sm">Your Full Name</span>
              </div>
            </div>
          </div>

          <Button
            onClick={onPayClick}
            className="w-full h-14 mt-6 rounded-2xl text-base font-bold shadow-xl shadow-primary/30 bg-gradient-to-r from-primary to-violet-600 border-0 hover:opacity-90 transition-all hover:scale-[1.02]"
          >
            <Lock className="mr-2 w-4 h-4" /> Pay ₹799 securely
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> SSL Encrypted · PCI DSS Compliant
          </p>
        </div>

        {/* Right — Order Summary */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 md:p-10 flex flex-col">
          <h3 className="text-lg font-bold mb-2 text-white/90">Order Summary</h3>
          <p className="text-sm text-white/50 mb-8">FinFlow Pro · Billed annually</p>

          <div className="space-y-4 flex-1">
            {[
              { label: "Pro Plan (Annual)", amount: "₹7,990" },
              { label: "GST (18%)", amount: "₹1,438" },
              { label: "Discount (–20%)", amount: "–₹1,598" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-white/60">{item.label}</span>
                <span className="font-semibold text-white">{item.amount}</span>
              </div>
            ))}

            <div className="border-t border-white/10 pt-4 flex justify-between">
              <span className="text-lg font-bold text-white">Total Today</span>
              <span className="text-2xl font-extrabold text-primary">₹7,830</span>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {["Cancel anytime with 1-click", "7-day money back guarantee", "Premium support included"].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-xs text-white/40 text-center">
              Trusted by 10,000+ businesses across India
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
