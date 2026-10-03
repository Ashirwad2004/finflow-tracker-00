import { useState, useEffect } from "react";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/hooks/use-toast";
import { useRazorpayPayment } from "@/core/hooks/useRazorpayPayment";
import { SubscriptionStatus } from "./types";
import { downloadVerifiedSoftwareBill } from "./pricingUtils";
import { usePricingAuth } from "./usePricingAuth";

export function usePricingState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { initiateSubscriptionPayment } = useRazorpayPayment();

  // Payment method & customer inputs
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);

  // Stored transaction details for generating the bill ONLY after payment
  const [paidPaymentId, setPaidPaymentId] = useState<string>("");
  const [paidOrderId, setPaidOrderId] = useState<string>("");
  const [paidDateTime, setPaidDateTime] = useState<string>("");

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Authentication subhook
  const {
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authName,
    setAuthName,
    authLoading,
    authError,
    handleInlineAuth,
  } = usePricingAuth();

  /*
   * Read-only subscription query
   */
  const { data: subStatus, isLoading: isSubLoading } = useQuery<SubscriptionStatus | null>({
    queryKey: ["subscription_status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("subscription_status")
        .select("plan,status,current_period_end,current_period_start")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        plan: data.plan ?? "free",
        status: data.status ?? "inactive",
        current_period_end: data.current_period_end,
        current_period_start: data.current_period_start,
      };
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user) return;
    setName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
  }, [user]);

  // 15-day trial calculation
  const getTrialDaysRemaining = () => {
    if (!subStatus || subStatus.plan !== "trial") return 0;
    if (!subStatus.current_period_end) return 15;

    const end = new Date(subStatus.current_period_end);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const trialDaysLeft = getTrialDaysRemaining();
  const isTrialActive = subStatus?.plan === "trial" && trialDaysLeft > 0;
  const isPaidSubscriber =
    ["pro", "business", "premium"].includes(subStatus?.plan || "") &&
    subStatus?.status === "active";

  const displayTotal = 299;
  const validityMonths = 6;

  /*
   * Generate & Download Software Purchase Bill ONLY after verified payment
   */
  const handleDownloadVerifiedBill = () => {
    downloadVerifiedSoftwareBill({
      paidPaymentId,
      paidOrderId,
      paidDateTime,
      name,
      userEmail: user?.email,
      userFullName: user?.user_metadata?.full_name,
      phone,
      displayTotal,
      validityMonths,
      paymentMethod,
    });

    toast({
      title: "Bill Downloaded",
      description: "Official RupeeBill Software Purchase Bill saved to your device.",
    });
  };

  /*
   * Handle Payment Submission via production-grade centralized useRazorpayPayment hook
   */
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

    if (!termsAccepted) {
      toast({
        title: "Terms Not Accepted",
        description: "Please accept the Terms & Conditions and Refund Policy to proceed.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      await initiateSubscriptionPayment({
        planId: "premium",
        billingCycle: "monthly",
        customerName: name.trim() || user.user_metadata?.full_name || "",
        customerEmail: user.email || "",
        customerPhone: phone.trim() || "",
        onSuccess: async (result) => {
          const completedNow = new Date();
          const nowString =
            completedNow.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }) +
            ", " +
            completedNow.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }) +
            " IST";

          setPaidPaymentId(result.paymentId || result.razorpay_payment_id || "");
          setPaidOrderId(result.orderId || result.razorpay_order_id || "");
          setPaidDateTime(nowString);

          // Invalidate and refresh subscription status
          await queryClient.invalidateQueries({ queryKey: ["subscription_status"] });
          await queryClient.refetchQueries({ queryKey: ["subscription_status"] });

          setIsProcessing(false);
          setIsPaymentSuccess(true);

          toast({
            title: "🎉 Payment Verified!",
            description: "Your RupeeBill 6-month software license is now active.",
          });
        },
        onError: (error) => {
          const message = error.message || "Payment verification failed.";
          setPaymentError(message);
          setIsProcessing(false);
          toast({
            title: "Payment Failed",
            description: message,
            variant: "destructive",
          });
        },
        onDismiss: () => {
          setIsProcessing(false);
          toast({
            title: "Payment Cancelled",
            description: "You closed the checkout window.",
          });
        },
      });
    } catch (error: unknown) {
      console.error("Subscription payment error:", error);
      setIsProcessing(false);
      const message = error instanceof Error ? error.message : "Unable to process payment.";
      setPaymentError(message);
      toast({
        title: "Checkout Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  return {
    user,
    paymentMethod,
    setPaymentMethod,
    name,
    setName,
    phone,
    setPhone,
    isProcessing,
    isPaymentSuccess,
    paidPaymentId,
    paidOrderId,
    paidDateTime,
    paymentError,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authName,
    setAuthName,
    authLoading,
    authError,
    termsAccepted,
    setTermsAccepted,
    subStatus,
    isSubLoading,
    trialDaysLeft,
    isTrialActive,
    isPaidSubscriber,
    displayTotal,
    handleDownloadVerifiedBill,
    handleInlineAuth,
    handleSubscribe,
  };
}
