import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  Zap, 
  CreditCard, 
  Building2, 
  Tag, 
  ArrowRight, 
  Loader2,
  Check,
  X,
  Smartphone,
  AlertCircle,
  UserCheck,
  LogIn,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { toast } from "@/core/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRazorpayPayment } from "@/core/hooks/useRazorpayPayment";


export interface PlanConfig {
  id: "starter" | "pro" | "business";
  name: string;
  monthlyPrice: number;
  annualPricePerMonth: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: "pro",
    name: "RupeeBill Pro (All-in-One)",
    monthlyPrice: 299,
    annualPricePerMonth: 299,
    description: "Complete, unlimited access to all billing, storefront, offline sync, and financial tools.",
    features: [
      "Unlimited Expenses, Sales & Purchases",
      "Digital Storefront & Real-time Order Sync",
      "Offline Host-Disk Persistence (OPFS)",
      "AI Receipt OCR & Smart Categorization",
      "Customer & Vendor Parties Ledgers",
      "GSTR-1 & Financial Reports Export",
      "Print Studio for Thermal & A4 Invoices",
      "Multi-device & Priority Cloud Sync"
    ],
    recommended: true,
  }
];

interface RealSubscriptionCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlanId?: "starter" | "pro" | "business";
  initialBillingCycle?: "monthly" | "annual";
}

export function RealSubscriptionCheckout({
  open,
  onOpenChange,
  initialPlanId = "pro",
  initialBillingCycle = "annual"
}: RealSubscriptionCheckoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedPlanId, setSelectedPlanId] = useState<"starter" | "pro" | "business">(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(initialBillingCycle);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState<number>(0);
  const [couponError, setCouponError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [upiId, setUpiId] = useState("");

  // Fetch current user subscription status
  const { data: currentSub } = useQuery({
    queryKey: ["subscription_status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any)
        .from("subscription_status")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data || { plan: "starter", status: "active" };
    },
    enabled: !!user?.id && open,
  });

  const isCurrentPlanActive = !!user && (currentSub?.plan || "starter") === selectedPlanId;

  // Inline auth state for unauthenticated users
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedPlanId(initialPlanId);
      setBillingCycle(initialBillingCycle);
      setIsSuccess(false);
      setIsProcessing(false);
      setPaymentError(null);
      setAuthError("");
      if (user) {
        setEmail(user.email || "");
        setName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      }
    }
  }, [open, initialPlanId, initialBillingCycle, user]);

  const queryClient = useQueryClient();
  const { initiateSubscriptionPayment } = useRazorpayPayment();

  const currentPlan = PLAN_CONFIGS.find(p => p.id === selectedPlanId) || PLAN_CONFIGS[0];

  // Pricing calculations: Canonical flat ₹299 subscription (all-inclusive)
  const basePricePerMonth = 299;
  const billingMonths = 1;
  const rawSubtotal = 299;
  
  const couponDiscountAmount = 0;
  const subtotalAfterCoupon = 299;
  const gstAmount = 0; // Inclusive of all taxes
  const grandTotal = 299;

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setAppliedDiscountPercent(0);
    setCouponError("One simple subscription price: ₹299/month. Coupons are not available.");
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedDiscountPercent(0);
    setCouponError("");
  };

  // Inline Quick Auth Handler
  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const cleanEmail = authEmail.trim().toLowerCase();

    try {
      if (authMode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: authPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: authName.trim() || cleanEmail.split("@")[0],
              full_name: authName.trim() || cleanEmail.split("@")[0]
            }
          }
        });

        if (signUpError) {
          const errMsg = signUpError.message || String(signUpError);
          if (
            errMsg.includes("Database error updating user") ||
            errMsg.toLowerCase().includes("already registered") ||
            errMsg.toLowerCase().includes("already exists") ||
            (signUpError as any).status === 500
          ) {
            // Attempt automatic sign in if credentials match
            const { error: fallbackSignInError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: authPassword,
            });

            if (!fallbackSignInError) {
              toast({
                title: "Welcome Back",
                description: "Signed in to your existing account successfully.",
              });
              return;
            }

            setAuthMode("login");
            throw new Error(
              "An account with this email already exists. Please sign in with your password, or click 'Forgot password'."
            );
          }

          throw signUpError;
        }

        toast({
          title: "Account Created Successfully!",
          description: "You are now logged in. Proceeding to complete your payment.",
        });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: authPassword,
        });
        if (signInError) {
          if (signInError.message === "Invalid login credentials") {
            throw new Error("Incorrect email or password. Please try again.");
          }
          throw signInError;
        }
        toast({
          title: "Logged In Successfully!",
          description: "Ready to proceed with payment.",
        });
      }
    } catch (err: any) {
      console.warn("[Checkout Auth] Handled auth warning:", err);
      let message = err.message || "Authentication failed. Please check your details.";
      if (message.includes("Database error updating user")) {
        message = "An account with this email already exists. Please switch to Sign In.";
        setAuthMode("login");
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };


  // Save intent & redirect to full auth page
  const handleFullAuthRedirect = () => {
    localStorage.setItem("pending_subscription_plan", selectedPlanId);
    localStorage.setItem("pending_subscription_cycle", billingCycle);
    toast({
      title: "Authentication Required",
      description: `Your ${currentPlan.name} plan selection is saved. Please sign in or create an account.`,
    });
    onOpenChange(false);
    navigate(`/auth?redirect=${encodeURIComponent("/?open_checkout=true")}`);
  };

  const handleSubscribe = async () => {
    setPaymentError(null);

    if (!user) {
      toast({
        title: "🔒 Authentication Required Before Payment",
        description: "Please sign in or create an account below to complete your payment.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      await initiateSubscriptionPayment({
        planId: selectedPlanId,
        billingCycle,
        customerName: name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Valued Merchant",
        customerEmail: user.email || "",
        customerPhone: upiId || "9999999999",
        onSuccess: async () => {
          setIsProcessing(false);
          setIsSuccess(true);
          await queryClient.invalidateQueries({ queryKey: ["subscription_status"] });
          toast({
            title: "🎉 Payment Successful & Subscription Active!",
            description: `Welcome to FinFlow ${currentPlan.name}! All premium features are unlocked.`,
          });
          setTimeout(() => {
            onOpenChange(false);
            navigate("/");
          }, 2500);
        },
        onError: (err) => {
          setIsProcessing(false);
          setPaymentError(err.message || "Payment verification failed.");
        },
        onDismiss: () => {
          setIsProcessing(false);
        }
      });
    } catch (err: any) {
      setIsProcessing(false);
      setPaymentError(err.message || "Payment initiation failed.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-card">
        {isSuccess ? (
          <div className="p-12 text-center space-y-6 bg-gradient-to-b from-emerald-500/10 to-transparent">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl animate-bounce">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-foreground">Upgrade Confirmed!</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Your account has been upgraded to <span className="font-bold text-primary">RupeeBill {currentPlan.name} ({billingCycle === "annual" ? "Annual" : "Monthly"})</span>.
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
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                        }`}>
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

              {/* AUTHENTICATION GUARD BANNER & INLINE QUICK AUTH */}
              {!user ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>Authentication Required Before Payment</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Please sign in or create an account to activate your {currentPlan.name} plan.
                      </p>
                    </div>
                  </div>

                  {/* Inline Auth Form */}
                  <form onSubmit={handleInlineAuth} className="space-y-3 pt-2 border-t border-amber-500/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">
                        {authMode === "signup" ? "Create Account" : "Sign In"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}
                        className="text-primary hover:underline text-[11px] font-medium"
                      >
                        {authMode === "signup" ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                      </button>
                    </div>

                    {authMode === "signup" && (
                      <Input
                        type="text"
                        placeholder="Full Name"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        required
                        className="h-9 text-xs bg-background"
                      />
                    )}

                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      className="h-9 text-xs bg-background"
                    />

                    <Input
                      type="password"
                      placeholder="Password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      className="h-9 text-xs bg-background"
                    />

                    {authError && (
                      <p className="text-[10px] text-destructive font-medium">{authError}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="submit"
                        disabled={authLoading}
                        className="flex-1 h-9 text-xs font-bold bg-primary text-primary-foreground"
                      >
                        {authLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : authMode === "signup" ? (
                          <>
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Sign Up & Pay
                          </>
                        ) : (
                          <>
                            <LogIn className="w-3.5 h-3.5 mr-1.5" /> Sign In & Pay
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFullAuthRedirect}
                        className="h-9 text-xs font-bold"
                      >
                        Full Auth Page
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-foreground">
                      Logged in as <span className="font-bold">{user.email}</span>
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border-0">
                    Verified
                  </Badge>
                </div>
              )}

              {/* Payment Method Selector (Only for paid plans) */}
              {selectedPlanId !== "starter" && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-bold text-foreground">Select Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "upi", label: "UPI / QR", icon: Smartphone },
                      { id: "card", label: "Cards", icon: CreditCard },
                      { id: "netbanking", label: "NetBanking", icon: Building2 },
                    ].map((method) => {
                      const isSel = paymentMethod === method.id;
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id as any)}
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
              )}

              {/* Coupon Code Input */}
              {selectedPlanId !== "starter" && (
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
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError("");
                        }}
                        placeholder="Try RUPEEBILL20"
                        className="h-9 text-xs font-mono uppercase bg-background pr-7"
                        disabled={appliedDiscountPercent > 0}
                      />
                      {appliedDiscountPercent > 0 && (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={appliedDiscountPercent > 0 || !couponCode.trim()}
                      className="h-9 text-xs font-bold"
                    >
                      Apply
                    </Button>
                  </div>
                  {couponError && <p className="text-[10px] text-rose-500 font-medium">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Right Column — Summary & Checkout CTA (5 cols) */}
            <div className="md:col-span-5 p-6 md:p-8 bg-muted/30 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Order Breakdown</h4>
                  <p className="text-xs text-muted-foreground">Billed {billingCycle === "annual" ? "annually (12 months)" : "monthly"}</p>
                </div>

                {/* Pricing Calculation Lines */}
                <div className="space-y-3 text-xs border-y py-4 border-border/60">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{currentPlan.name} Plan ({billingCycle})</span>
                    <span className="font-semibold text-foreground">₹{rawSubtotal.toLocaleString("en-IN")}</span>
                  </div>

                  {couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Coupon Discount ({appliedDiscountPercent}%)</span>
                      <span>-₹{couponDiscountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span className="font-semibold text-foreground">₹{gstAmount.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-3 border-t text-sm">
                    <span className="font-black text-foreground">Total Due</span>
                    <span className="text-2xl font-black text-primary">₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Plan Key Included Features */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Plan Highlights</span>
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
                  onClick={handleSubscribe}
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
                        : `Subscribe & Pay ₹${grandTotal.toLocaleString("en-IN")}`
                      }
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  256-Bit SSL Encrypted · Instant Activation
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}