import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { toast } from "@/core/hooks/use-toast";
import { useRazorpayPayment } from "@/core/hooks/useRazorpayPayment";
import { PlanId, BillingCycle, PaymentMethodType, PLAN_CONFIGS } from "./types";

interface UseSubscriptionCheckoutOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlanId?: PlanId;
  initialBillingCycle?: BillingCycle;
}

export function useSubscriptionCheckout({
  open,
  onOpenChange,
  initialPlanId = "pro",
  initialBillingCycle = "annual",
}: UseSubscriptionCheckoutOptions) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { initiateSubscriptionPayment } = useRazorpayPayment();

  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialBillingCycle);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("upi");

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

  const currentPlan = PLAN_CONFIGS.find((p) => p.id === selectedPlanId) || PLAN_CONFIGS[0];

  // Pricing calculations: Canonical flat ₹299 subscription (all-inclusive)
  const rawSubtotal = 299;
  const couponDiscountAmount = 0;
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
              full_name: authName.trim() || cleanEmail.split("@")[0],
            },
          },
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
        },
      });
    } catch (err: any) {
      setIsProcessing(false);
      setPaymentError(err.message || "Payment initiation failed.");
    }
  };

  return {
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
  };
}
