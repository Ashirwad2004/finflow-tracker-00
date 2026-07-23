import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Wallet, ShieldCheck, Lock, CheckCircle2, Zap, Tag, Sparkles, Smartphone, CreditCard, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CheckoutMockupProps {
  onPayClick: (planId?: "pro" | "business") => void;
}

export const CheckoutMockup = ({ onPayClick }: CheckoutMockupProps) => {
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "netbanking">("upi");

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="rounded-3xl border bg-card shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border-border/80">
        {/* Left — Live Payment Method Selector */}
        <div className="p-8 md:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-violet-600 flex items-center justify-center shadow-lg text-white">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight">FinFlow <span className="text-primary">Pro Tier</span></span>
                <p className="text-[11px] text-muted-foreground">Instant Subscription Activation</p>
              </div>
            </div>

            <h3 className="text-2xl font-black mb-1 text-foreground">Select Payment Method</h3>
            <p className="text-muted-foreground text-xs mb-6">All major Indian UPI apps, cards, and netbanking supported.</p>

            {/* Payment options */}
            <div className="space-y-3">
              {[
                { id: "upi", title: "Instant UPI / QR Code", desc: "GPay, PhonePe, Paytm, BHIM", icon: Smartphone, popular: true },
                { id: "card", title: "Credit & Debit Cards", desc: "Visa, Mastercard, RuPay", icon: CreditCard, popular: false },
                { id: "netbanking", title: "NetBanking / NEFT", desc: "HDFC, SBI, ICICI, Axis & 50+ Banks", icon: Building2, popular: false },
              ].map((m) => {
                const isSelected = selectedMethod === m.id;
                const Icon = m.icon;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id as any)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/60 hover:border-primary/40 bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground">{m.title}</span>
                          {m.popular && (
                            <Badge className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0">
                              Instant
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                      {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Auto Coupon promo notice */}
            <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Coupon <span className="font-mono font-bold uppercase">FINFLOW20</span> applied!
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">20% OFF</span>
            </div>
          </div>

          <div className="pt-6">
            <Button
              onClick={() => onPayClick("pro")}
              className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/30 bg-gradient-to-r from-primary to-violet-600 text-white border-0 hover:opacity-95 transition-all hover:scale-[1.01]"
            >
              <Lock className="mr-2 w-4 h-4" /> Proceed to Subscribe (₹639/mo)
            </Button>
            <p className="text-center text-[11px] text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> 256-Bit SSL Encrypted · Cancel Anytime
            </p>
          </div>
        </div>

        {/* Right — Order Summary & Included Value */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-8 md:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">Subscription Summary</h3>
              <Badge className="bg-primary text-white text-xs font-bold">Annual Savings</Badge>
            </div>
            <p className="text-xs text-white/60 mb-6">FinFlow Pro Tier · Billed annually</p>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between text-white/70">
                <span>Pro Plan Annual (₹639/mo x 12)</span>
                <span className="font-semibold text-white">₹7,668</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Annual Coupon Discount (20%)</span>
                <span>–₹1,533</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>GST (18%)</span>
                <span className="font-semibold text-white">₹1,104</span>
              </div>

              <div className="border-t border-white/10 pt-4 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-bold text-white block">Total Today</span>
                  <span className="text-[10px] text-white/50">Taxes included</span>
                </div>
                <span className="text-3xl font-black text-primary">₹7,239</span>
              </div>
            </div>

            <div className="mt-8 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Included in Pro:</span>
              {[
                "Unlimited Expenses, Sales & Purchases",
                "AI OCR Receipt Scanning & Auto Match",
                "Vendors & Customers Party Ledgers",
                "GSTR-1 & Financial Analytics Exports",
                "Priority Offline Background Sync"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <div className="text-[11px] text-white/50">
              Trusted by 10,000+ business owners across India
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
