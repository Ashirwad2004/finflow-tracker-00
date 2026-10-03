import { useState, useEffect } from "react";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/hooks/use-toast";
import { loadRazorpayScript } from "@/core/hooks/useRazorpayPayment";
import axios from "axios";
import {
  SubscriptionStatus,
  CreateOrderResponse,
  VerifyPaymentResponse,
  RazorpayOptions,
} from "./types";
import { downloadVerifiedSoftwareBill } from "./pricingUtils";

export function usePricingState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Authentication mode for unauthenticated users
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(true);

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
   * Handle Inline Authentication for unauthenticated visitors
   */
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
            emailRedirectTo: `${window.location.origin}/pricing`,
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
            const { error: fallbackSignInError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: authPassword,
            });

            if (!fallbackSignInError) {
              toast({
                title: "Logged In Successfully!",
                description: "Recognized existing account. Proceeding with checkout.",
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
      console.warn("[Pricing Auth] Handled warning:", err);
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

  /*
   * Handle Payment Submission
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
      // Step 1: Load Razorpay SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay payment gateway. Please check your internet connection.");
      }

      // Step 2: Get user session for authorization
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        throw new Error("Authentication session expired. Please sign in again.");
      }

      // Create authoritative order on the server
      const response = await axios.post<CreateOrderResponse>(
        "/api/v1/payments/create-subscription-order",
        {
          planId: "premium",
          billingCycle: "monthly",
          customerName: name.trim() || user.user_metadata?.full_name || "",
          customerEmail: user.email || "",
          customerPhone: phone.trim() || "",
        },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const orderData = response.data;
      if (!orderData?.success) {
        throw new Error("Failed to initialize payment order on server.");
      }

      const razorpayKey =
        orderData.key_id ||
        (import.meta as any).env.VITE_RAZORPAY_KEY_ID ||
        "rzp_test_TG7U7E97coCG1G";

      const isRazorpayServerOrder = Boolean(orderData.gatewayOrderId);

      // Step 3: Open Razorpay checkout modal
      const options: RazorpayOptions = {
        key: razorpayKey,
        amount: orderData.amount || 29900,
        currency: orderData.currency || "INR",
        name: "RupeeBill",
        description: "RupeeBill Business License (6 Months)",
        ...(isRazorpayServerOrder ? { order_id: orderData.gatewayOrderId } : {}),
        prefill: {
          name: name.trim() || user.user_metadata?.full_name || "",
          email: user.email || "",
          contact: phone.trim() || "",
        },
        theme: {
          color: "#4f46e5",
        },
        handler: async (paymentResponse) => {
          try {
            setPaymentError(null);

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

            setPaidPaymentId(paymentResponse.razorpay_payment_id);
            setPaidOrderId(paymentResponse.razorpay_order_id || orderData.gatewayOrderId);
            setPaidDateTime(nowString);

            // Step 4: Cryptographically verify HMAC-SHA256 signature on backend
            const verification = await axios.post<VerifyPaymentResponse>(
              "/api/v1/payments/verify-payment",
              {
                razorpay_order_id: paymentResponse.razorpay_order_id || orderData.gatewayOrderId,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                planId: "premium",
                billingCycle: "monthly",
              },
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  "Content-Type": "application/json",
                },
                timeout: 15000,
              }
            );

            if (!verification.data?.success) {
              throw new Error(verification.data?.message || "Payment signature verification failed.");
            }

            // Invalidate and refresh subscription status
            await queryClient.invalidateQueries({ queryKey: ["subscription_status"] });
            await queryClient.refetchQueries({ queryKey: ["subscription_status"] });

            setIsProcessing(false);
            setIsPaymentSuccess(true);

            toast({
              title: "🎉 Payment Verified!",
              description: "Your RupeeBill 6-month software license is now active.",
            });
          } catch (error: unknown) {
            console.error("Payment verification error:", error);
            const message =
              axios.isAxiosError(error)
                ? error.response?.data?.detail || error.message
                : error instanceof Error
                ? error.message
                : "Payment verification failed.";

            setPaymentError(message);
            setIsProcessing(false);

            toast({
              title: "Payment Verification Failed",
              description: message,
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "You closed the checkout window.",
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (failedRes: any) => {
        setIsProcessing(false);
        const errorMessage = failedRes.error?.description || "Payment failed. Please try again.";
        setPaymentError(errorMessage);
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
        });
      });

      razorpay.open();
    } catch (error: unknown) {
      console.error("Subscription payment error:", error);
      setIsProcessing(false);
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.detail || error.message
          : error instanceof Error
          ? error.message
          : "Unable to process payment.";
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
