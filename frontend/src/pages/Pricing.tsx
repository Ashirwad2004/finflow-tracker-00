import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/core/hooks/use-toast";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import { loadRazorpayScript } from "@/core/hooks/useRazorpayPayment";
import { generateSoftwareBillPDF } from "@/utils/generateSoftwareBillPDF";
import axios from "axios";
import {
  CheckCircle2,
  ShieldCheck,
  Zap,
  CreditCard,
  Smartphone,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Sparkles,
  Lock,
  Building,
  Check,
  ChevronDown,
  ChevronUp,
  Receipt,
  Clock,
  ArrowRight,
  Download,
  Star,
} from "lucide-react";

// Suppress Canvas2D willReadFrequently browser warning globally
if (typeof window !== "undefined" && typeof HTMLCanvasElement !== "undefined") {
  const canvasProto = HTMLCanvasElement.prototype as any;
  const originalGetContext = canvasProto.getContext;
  canvasProto.getContext = function (this: unknown, type: string, attributes?: any) {
    if (type === "2d") {
      return originalGetContext.call(this, type, { willReadFrequently: true, ...attributes });
    }
    return originalGetContext.call(this, type, attributes);
  };
}

// Convert Razorpay third-party preload links to prefetch to eliminate Chromium's unused preload warning
if (typeof window !== "undefined" && typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
  try {
    const preloadObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLLinkElement && node.rel === "preload") {
            const href = node.href || "";
            if (href.includes("razorpay.com") || href.includes("checkout-static")) {
              node.rel = "prefetch";
            }
          }
        }
      }
    });

    if (document.head) {
      preloadObserver.observe(document.head, { childList: true });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        preloadObserver.observe(document.head, { childList: true });
      });
    }

    // Filter out third-party SDK unhandled console warnings
    const originalWarn = console.warn.bind(console);
    console.warn = (...args: any[]) => {
      const first = typeof args[0] === "string" ? args[0] : "";
      if (
        (first.includes("razorpay.com") && first.includes("preloaded using link preload")) ||
        (first.includes("Canvas2D") && first.includes("willReadFrequently"))
      ) {
        return;
      }
      originalWarn(...args);
    };
  } catch (e) {
    // Ignore in non-browser environments
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayPaymentResponse) => Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface CreateOrderResponse {
  success: boolean;
  gatewayOrderId: string;
  order_id?: string;
  amount?: number;
  key_id?: string;
  currency?: string;
}

interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  status?: string;
  paymentId?: string;
}

interface SubscriptionStatus {
  plan: string;
  status: string;
  current_period_end?: string | null;
  current_period_start?: string | null;
}

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Expandable secondary details
  const [showFeatures, setShowFeatures] = useState(false);

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

  /*
   * Flat pricing: ₹299 for 6 Months (Zero tax, zero hidden fees)
   */
  const displayTotal = 299;
  const validityMonths = 6;

  /*
   * Generate & Download Software Purchase Bill ONLY after verified payment
   */
  const handleDownloadVerifiedBill = () => {
    const txPaymentId = paidPaymentId || "PAY-VERIFIED-RZP";
    const txOrderId = paidOrderId || "ORD-RZP-SUB";
    const billNum = `BILL-RB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const now = new Date();
    const formattedDateTime =
      paidDateTime ||
      now.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
        ", " +
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }) +
        " IST";

    const startDateStr = now.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + validityMonths);
    const endDateStr = endDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const paymentMethodLabel =
      paymentMethod === "upi"
        ? "UPI Apps & QR (PhonePe / GPay / Paytm / BHIM)"
        : paymentMethod === "card"
        ? "Credit / Debit Card (Visa / MasterCard / RuPay)"
        : "Net Banking (Indian Banks)";

    generateSoftwareBillPDF({
      billNumber: billNum,
      paymentDateTime: formattedDateTime,
      customerName: name.trim() || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Valued Merchant",
      customerEmail: user?.email || "customer@rupeebill.com",
      customerPhone: phone.trim() || undefined,
      amount: displayTotal,
      paymentMethod: paymentMethodLabel,
      paymentSource: "Razorpay Secured Payment Gateway",
      paymentId: txPaymentId,
      orderId: txOrderId,
      validityMonths: validityMonths,
      licenseStartDate: startDateStr,
      licenseEndDate: endDateStr,
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
                title: "Welcome Back",
                description: "Signed in to your existing account successfully.",
              });
              await queryClient.invalidateQueries({ queryKey: ["subscription_status"] });
              return;
            }

            setAuthMode("login");
            throw new Error(
              "An account with this email already exists. Please sign in with your password."
            );
          }
          throw signUpError;
        }

        toast({
          title: "Account Ready",
          description: "Proceed directly with checkout.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: authPassword,
        });

        if (error) {
          if (error.message === "Invalid login credentials") {
            throw new Error("Incorrect email or password. Please try again.");
          }
          throw error;
        }

        toast({
          title: "Welcome Back",
          description: "Signed in successfully.",
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["subscription_status"] });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Authentication failed. Please check your credentials.";
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  /*
   * Authoritative Razorpay Subscription Flow (₹299 for 6 Months)
   */
  const handleSubscribe = async () => {
    if (isProcessing) return;

    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in or create an account before checkout.",
        variant: "destructive",
      });
      return;
    }

    setPaymentError(null);
    setIsProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      // Step 1: Create subscription order on FastAPI backend (29900 paise = ₹299)
      const orderResponse = await axios.post<CreateOrderResponse>(
        "/api/v1/payments/create-subscription-order",
        {
          planId: "premium",
          billingCycle: "monthly",
          customerName:
            name.trim() ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Valued Merchant",
          customerPhone: phone.trim() || undefined,
          paymentMethod,
        },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const orderData = orderResponse.data;

      if (!orderData?.success || !orderData.gatewayOrderId) {
        throw new Error("Unable to initialize secure payment order.");
      }

      // Step 2: Load Razorpay SDK
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout. Check your internet connection.");
      }

      const razorpayKey =
        orderData.key_id ||
        import.meta.env.VITE_RAZORPAY_KEY_ID ||
        "rzp_test_TG7U7E97coCG1G";

      // Industry-standard validation: only pass order_id if it is a genuine Razorpay server order ID (e.g. order_TcggsU9gJVepRo)
      const isRazorpayServerOrder = Boolean(
        orderData.gatewayOrderId &&
        /^order_[a-zA-Z0-9]{14,}$/.test(orderData.gatewayOrderId) &&
        !orderData.gatewayOrderId.includes("dev") &&
        !orderData.gatewayOrderId.includes("mock")
      );

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
        handler: async (response) => {
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

            setPaidPaymentId(response.razorpay_payment_id);
            setPaidOrderId(response.razorpay_order_id || orderData.gatewayOrderId);
            setPaidDateTime(nowString);

            // Step 4: Cryptographically verify HMAC-SHA256 signature on backend
            const verification = await axios.post<VerifyPaymentResponse>(
              "/api/v1/payments/verify-payment",
              {
                razorpay_order_id: response.razorpay_order_id || orderData.gatewayOrderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
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
      razorpay.on("payment.failed", (response: any) => {
        setIsProcessing(false);
        const errorMessage = response.error?.description || "Payment failed. Please try again.";
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-200">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Logo size={32} showText />
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">
              RupeeBill Pro
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <Button
                onClick={() => navigate("/business-dashboard")}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Back to</span> Dashboard
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-muted rounded-xl"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Focused Payment Screen */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        {/* Payment Success Overlay */}
        {isPaymentSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-card text-card-foreground border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-emerald-500/10 animate-scale-in">
              <div className="w-20 h-20 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: "6s" }} />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-foreground">Payment Confirmed!</h2>
                <p className="text-muted-foreground text-sm">
                  Your RupeeBill Business software license is active for 6 Months.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/50 border border-border text-xs text-muted-foreground space-y-2 text-left">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="font-semibold text-foreground">RupeeBill Business Pro</span>
                </div>
                <div className="flex justify-between">
                  <span>License Term:</span>
                  <span className="font-semibold text-primary">6 Months Access</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹299.00 (Flat)</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment ID:</span>
                  <span className="font-mono text-[11px] text-foreground">{paidPaymentId || "Verified"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span className="text-foreground">{paidDateTime}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={handleDownloadVerifiedBill}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" /> Download Official RupeeBill Bill (PDF)
                </Button>

                <Button
                  onClick={() => navigate("/business-dashboard")}
                  variant="outline"
                  className="w-full h-12 border-border font-bold rounded-xl"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Focused Single Checkout Card (No Distractions) */}
        <div className="w-full max-w-lg mx-auto">
          {/* Active Trial Notice (Minimal) */}
          {user && isTrialActive && (
            <div className="mb-4 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Clock className="w-3.5 h-3.5" /> Free trial active ({trialDaysLeft} days left) — Purchase now for 6 months access
              </span>
            </div>
          )}

          <div className="bg-card text-card-foreground border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />

            {/* Direct Plan Header */}
            <div className="flex items-start justify-between pb-6 border-b border-border gap-4">
              <div>
                <span className="inline-block text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                  RupeeBill Business
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                  6-Month License
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Full billing, thermal POS, digital store, and offline sync
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-foreground">₹299</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Flat for 6 Months
                </span>
              </div>
            </div>

            {/* If Not Logged In: Fast In-Line Auth */}
            {!user ? (
              <div className="py-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Sign In to Continue</h3>
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${
                        authMode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${
                        authMode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Log In
                    </button>
                  </div>
                </div>

                <form onSubmit={handleInlineAuth} className="space-y-3">
                  {authMode === "signup" && (
                    <div className="space-y-1">
                      <Label htmlFor="authName" className="text-xs text-foreground">Name</Label>
                      <Input
                        id="authName"
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="bg-background border-input rounded-xl text-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="authEmail" className="text-xs text-foreground">Email</Label>
                    <Input
                      id="authEmail"
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                      className="bg-background border-input rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="authPassword" className="text-xs text-foreground">Password</Label>
                    <Input
                      id="authPassword"
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Password (min 8 chars)"
                      required
                      minLength={8}
                      className="bg-background border-input rounded-xl text-sm"
                    />
                  </div>

                  {authError && (
                    <div className="text-destructive text-xs bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl">
                      {authError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={authLoading}
                    className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-xl"
                  >
                    {authLoading ? "Processing..." : authMode === "signup" ? "Create Account & Proceed" : "Sign In & Proceed"}
                  </Button>
                </form>
              </div>
            ) : (
              /* If Logged In: Direct Straightforward Payment */
              <div className="py-6 space-y-5">
                {/* User Pre-filled Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="billingName" className="text-xs text-foreground">Name on Bill</Label>
                    <Input
                      id="billingName"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="bg-background border-input rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="billingPhone" className="text-xs text-foreground">Mobile Number</Label>
                    <Input
                      id="billingPhone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="bg-background border-input rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Direct Payment Mode Tabs */}
                <div className="space-y-2">
                  <Label className="text-xs text-foreground">Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentMethod === "upi"
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      <Smartphone className="w-5 h-5" />
                      <span className="text-xs">UPI / QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentMethod === "card"
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-xs">Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("netbanking")}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentMethod === "netbanking"
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      <Building className="w-5 h-5" />
                      <span className="text-xs">Net Banking</span>
                    </button>
                  </div>
                </div>

                {/* Total Summary Block */}
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Total Amount</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-foreground">₹299</span>
                    <span className="text-[11px] text-muted-foreground ml-1">/ 6 Months (Zero Tax)</span>
                  </div>
                </div>

                {paymentError && (
                  <div className="text-destructive text-xs bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Direct Action Button */}
                {isPaidSubscriber ? (
                  <div className="space-y-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" /> You have an active RupeeBill license!
                    </div>

                    <Button
                      onClick={handleDownloadVerifiedBill}
                      variant="outline"
                      className="w-full h-11 border-primary/30 text-primary hover:bg-primary/10 font-bold rounded-xl flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download Official Software Bill (PDF)
                    </Button>

                    <Button
                      onClick={() => navigate("/business-dashboard")}
                      className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl"
                    >
                      Go to Business Dashboard
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleSubscribe}
                    disabled={isProcessing || isSubLoading}
                    className="w-full h-14 bg-primary text-primary-foreground font-black text-base rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        <span>Opening Razorpay...</span>
                      </div>
                    ) : (
                      `Pay ₹${displayTotal} for 6 Months`
                    )}
                  </Button>
                )}

                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest pt-1">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>Razorpay 256-Bit SSL Secured • Official Bill on Payment</span>
                </div>
              </div>
            )}

            {/* Optional Collapsible Features (Below Payment, not distracting) */}
            <div className="pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowFeatures(!showFeatures)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground font-semibold py-1"
              >
                <span>What's included in RupeeBill Business?</span>
                {showFeatures ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showFeatures && (
                <ul className="mt-3 space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3 animate-fade-in">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlimited Invoicing & POS Billing (Thermal & A4 Print Studio)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>100% Offline Host-Disk OPFS Storage & Auto Cloud Backup</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Digital Storefront with Live Online Order Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Customer & Vendor Parties Ledgers & Account Statements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>AI Receipt OCR Scanning & Expense Categorization</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Multi-Role Salesman & Staff Access Delegations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Official verified Software Purchase Bill issued upon payment</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-6 text-center text-xs text-muted-foreground transition-colors duration-200">
        <div className="container mx-auto px-6 space-y-1">
          <p>© 2026 RupeeBill. Official Software License & Payment Portal.</p>
          <div className="flex justify-center gap-4 text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}