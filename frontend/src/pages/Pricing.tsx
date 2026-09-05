import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/core/hooks/use-toast";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
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
  Info,
} from "lucide-react";

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: RazorpayPaymentResponse) => void) => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
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
  key_id?: string;
}

interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
}

interface SubscriptionStatus {
  plan: string;
  status: string;
  current_period_end?: string | null;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  /*
   * IMPORTANT:
   * Subscription information is READ ONLY on the frontend.
   *
   * The frontend must NEVER update subscription_status.
   * Only your backend should grant Premium after verifying Razorpay payment.
   */
  const { data: subStatus, isLoading: isSubLoading } =
    useQuery<SubscriptionStatus | null>({
      queryKey: ["subscription_status", user?.id],

      queryFn: async () => {
        if (!user?.id) return null;

        const { data, error } = await supabase
          .from("subscription_status")
          .select("plan,status,current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          return null;
        }

        return {
          plan: data.plan ?? "free",
          status: data.status ?? "inactive",
          current_period_end: data.current_period_end,
        };
      },

      enabled: !!user?.id,
    });

  useEffect(() => {
    if (!user) return;

    setName(
      user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        ""
    );
  }, [user]);

  const getTrialDaysRemaining = () => {
    if (!subStatus || subStatus.plan !== "trial") {
      return 0;
    }

    if (!subStatus.current_period_end) {
      return 15;
    }

    const end = new Date(subStatus.current_period_end);
    const now = new Date();

    const diffTime = end.getTime() - now.getTime();

    const diffDays = Math.ceil(
      diffTime / (1000 * 60 * 60 * 24)
    );

    return diffDays > 0 ? diffDays : 0;
  };

  const trialDaysLeft = getTrialDaysRemaining();

  const isTrialActive =
    subStatus?.plan === "trial" &&
    trialDaysLeft > 0;

  const isTrialExpired =
    (subStatus?.plan === "trial" &&
      trialDaysLeft <= 0) ||
    subStatus?.plan === "free";

  const isPaidSubscriber =
    ["pro", "business", "premium"].includes(
      subStatus?.plan || ""
    ) &&
    subStatus?.status === "active";

  /*
   * IMPORTANT:
   * Do not calculate the final payment amount here for security.
   *
   * The backend should determine the actual price.
   *
   * We only display the expected price to the user.
   */
  const displayBasePrice = 299;
  const displayGstAmount = Math.round(
    displayBasePrice * 0.18
  );
  const displayGrandTotal =
    displayBasePrice + displayGstAmount;

  /*
   * Authentication
   */
  const handleInlineAuth = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setAuthLoading(true);
    setAuthError("");

    try {
      if (authMode === "signup") {
        const { error } =
          await supabase.auth.signUp({
            email: authEmail.trim(),
            password: authPassword,
            options: {
              data: {
                full_name: authName.trim(),
              },
            },
          });

        if (error) {
          throw error;
        }

        toast({
          title: "Account Created",
          description:
            "Your account has been created successfully.",
        });
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: authEmail.trim(),
            password: authPassword,
          });

        if (error) {
          throw error;
        }

        toast({
          title: "Welcome Back",
          description:
            "Logged in successfully.",
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["subscription_status"],
      });
    } catch (error: unknown) {
      console.error("Authentication error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Authentication failed.";

      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  /*
   * Secure payment flow
   */
  const handleSubscribe = async () => {
    if (isProcessing) {
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description:
          "Please sign in before purchasing Premium.",
        variant: "destructive",
      });

      return;
    }

    setPaymentError(null);
    setIsProcessing(true);

    try {
      /*
       * Get the current authenticated Supabase session.
       *
       * The backend should use this JWT to identify the user.
       * Do NOT send user.id and trust it on the backend.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      /*
       * STEP 1
       *
       * Ask backend to create Razorpay order.
       *
       * IMPORTANT:
       * - No amount from frontend
       * - No userId from frontend
       * - Backend determines user from JWT
       * - Backend determines price
       */
      const orderResponse =
        await axios.post<CreateOrderResponse>(
          "/api/v1/payments/create-subscription-order",
          {
            planId: "premium",
            billingCycle: "monthly",
            customerName:
              name.trim() ||
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "Customer",
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

      /*
       * NEVER continue if backend did not create
       * a real Razorpay order.
       */
      if (
        !orderData?.success ||
        !orderData.gatewayOrderId
      ) {
        throw new Error(
          "Unable to create payment order."
        );
      }

      /*
       * STEP 2
       *
       * Load Razorpay.
       */
      const razorpayLoaded =
        await loadRazorpayScript();

      if (
        !razorpayLoaded ||
        !window.Razorpay
      ) {
        throw new Error(
          "Unable to load Razorpay checkout."
        );
      }

      /*
       * Never use a hardcoded secret/fallback key.
       *
       * key_id is safe for frontend usage.
       * Secret key MUST stay on backend.
       */
      const razorpayKey =
        orderData.key_id ||
        import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error(
          "Payment gateway configuration is unavailable."
        );
      }

      /*
       * STEP 3
       *
       * Open Razorpay checkout.
       *
       * IMPORTANT:
       * amount comes from the backend-created Razorpay order.
       * We do NOT calculate the payment amount here.
       */
      const options: RazorpayOptions = {
        key: razorpayKey,

        /*
         * IMPORTANT:
         *
         * Ideally your backend response should return
         * the exact amount associated with the Razorpay order.
         *
         * If your backend returns amount, use:
         *
         * amount: orderData.amount
         *
         * For now this field should be added to your backend response.
         */
        amount:
          (orderData as CreateOrderResponse & {
            amount?: number;
          }).amount || 0,

        currency: "INR",

        name: "FinFlow Tracker",

        description:
          "Premium Subscription - Monthly",

        order_id:
          orderData.gatewayOrderId,

        prefill: {
          name:
            name.trim() ||
            user.user_metadata?.full_name ||
            "",

          email:
            user.email || "",

          contact:
            phone.trim() || "",
        },

        theme: {
          color: "#6366f1",
        },

        /*
         * STEP 4
         *
         * Razorpay reports payment success.
         *
         * This DOES NOT mean we grant Premium.
         *
         * We send the Razorpay response to our backend.
         */
        handler: async (
          response
        ) => {
          try {
            setPaymentError(null);

            /*
             * Verify payment on backend.
             *
             * Backend MUST verify:
             *
             * - authenticated user
             * - order ID
             * - payment ID
             * - Razorpay signature
             * - amount
             * - currency
             * - payment status
             * - plan
             * - duplicate payment
             */
            const verification =
              await axios.post<VerifyPaymentResponse>(
                "/api/v1/payments/verify-payment",
                {
                  razorpay_order_id:
                    response.razorpay_order_id,

                  razorpay_payment_id:
                    response.razorpay_payment_id,

                  razorpay_signature:
                    response.razorpay_signature,

                  planId: "premium",

                  billingCycle: "monthly",
                },
                {
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type":
                      "application/json",
                  },

                  timeout: 15000,
                }
              );

            /*
             * NEVER ignore verification failure.
             */
            if (
              !verification.data?.success
            ) {
              throw new Error(
                verification.data?.message ||
                  "Payment verification failed."
              );
            }

            /*
             * VERY IMPORTANT:
             *
             * There is NO Supabase subscription upsert here.
             *
             * Backend is responsible for activating Premium.
             *
             * Refresh subscription status from database.
             */
            await queryClient.invalidateQueries({
              queryKey: [
                "subscription_status",
                user.id,
              ],
            });

            await queryClient.refetchQueries({
              queryKey: [
                "subscription_status",
                user.id,
              ],
            });

            setIsProcessing(false);

            toast({
              title: "Payment Successful",
              description:
                "Your Premium subscription has been activated.",
            });

            setTimeout(() => {
              navigate(
                "/business-dashboard"
              );
            }, 1500);
          } catch (error: unknown) {
            console.error(
              "Payment verification error:",
              error
            );

            const message =
              axios.isAxiosError(error)
                ? error.response?.data?.detail ||
                  error.message
                : error instanceof Error
                ? error.message
                : "Payment verification failed.";

            setPaymentError(message);

            setIsProcessing(false);

            toast({
              title:
                "Payment Verification Failed",
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
              description:
                "No subscription was activated.",
            });
          },
        },
      };

      /*
       * Do not open checkout if backend did not
       * provide a valid amount.
       */
      if (!options.amount || options.amount <= 0) {
        throw new Error(
          "Invalid payment amount returned by server."
        );
      }

      const razorpay =
        new window.Razorpay(options);

      razorpay.on(
        "payment.failed",
        (response) => {
          setIsProcessing(false);

          const errorMessage =
            response.error?.description ||
            "Payment failed.";

          setPaymentError(errorMessage);

          toast({
            title: "Payment Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      );

      razorpay.open();
    } catch (error: unknown) {
      console.error(
        "Subscription payment error:",
        error
      );

      setIsProcessing(false);

      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.detail ||
            error.message
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

  const premiumFeatures = [
    "Unlimited Expenses, Sales & Invoices",
    "AI Receipt OCR Scanning & Smart Categorization",
    "Customer & Vendor Parties Ledger Accounts",
    "Interactive Business & Personal Dashboards",
    "Generate Professional GSTR-1 Reports",
    "Multi-user Salesman & Staff Access Delegations",
    "Automatic Background Cloud Synchronization",
    "Offline-first SQLite Native Storage & Receipts",
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Logo
                size={32}
                showText
              />
            </Link>

            <span className="text-[10px] uppercase font-bold tracking-widest bg-primary/10 border border-primary/30 text-primary px-2.5 py-0.5 rounded-full">
              Billing
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            {user ? (
              <Button
                onClick={() =>
                  navigate(
                    "/business-dashboard"
                  )
                }
                variant="ghost"
                className="text-slate-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            ) : (
              <Button
                onClick={() =>
                  navigate("/auth")
                }
                variant="outline"
                className="border-slate-800 text-slate-300 hover:text-white"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Unlock{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                FinFlow Premium
              </span>
            </h1>

            <p className="text-slate-400 text-lg">
              Get full access to all standard,
              business, storefront, and AI
              features under a single premium
              membership.
            </p>
          </div>

          {user && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Calendar className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-lg">
                    Your Subscription Status
                  </h3>

                  {isPaidSubscriber ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <Sparkles className="w-4 h-4" />
                      Subscription Active
                    </div>
                  ) : isTrialActive ? (
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                      <Info className="w-4 h-4" />
                      Trial Active —{" "}
                      {trialDaysLeft} days
                      remaining
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      Trial/Subscription
                      Expired
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-1.5">
                    Plan Period End:{" "}
                    {subStatus?.current_period_end
                      ? new Date(
                          subStatus.current_period_end
                        ).toLocaleDateString()
                      : "Not Subscribed"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-500" />

            {!user ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-850">
                  <h2 className="font-bold text-xl">
                    Sign in to complete purchase
                  </h2>

                  <div className="flex gap-2">
                    <Button
                      variant={
                        authMode === "signup"
                          ? "default"
                          : "ghost"
                      }
                      size="sm"
                      onClick={() =>
                        setAuthMode("signup")
                      }
                      className="rounded-full"
                    >
                      Sign Up
                    </Button>

                    <Button
                      variant={
                        authMode === "login"
                          ? "default"
                          : "ghost"
                      }
                      size="sm"
                      onClick={() =>
                        setAuthMode("login")
                      }
                      className="rounded-full"
                    >
                      Log In
                    </Button>
                  </div>
                </div>

                <form
                  onSubmit={
                    handleInlineAuth
                  }
                  className="space-y-4"
                >
                  {authMode === "signup" && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="authName"
                        className="text-slate-300"
                      >
                        Display Name
                      </Label>

                      <Input
                        id="authName"
                        type="text"
                        value={authName}
                        onChange={(e) =>
                          setAuthName(
                            e.target.value
                          )
                        }
                        autoComplete="name"
                        required
                        className="bg-slate-950 border-slate-800 rounded-xl"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="authEmail"
                      className="text-slate-300"
                    >
                      Email Address
                    </Label>

                    <Input
                      id="authEmail"
                      type="email"
                      value={authEmail}
                      onChange={(e) =>
                        setAuthEmail(
                          e.target.value
                        )
                      }
                      autoComplete="email"
                      required
                      className="bg-slate-950 border-slate-800 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="authPassword"
                      className="text-slate-300"
                    >
                      Password
                    </Label>

                    <Input
                      id="authPassword"
                      type="password"
                      value={authPassword}
                      onChange={(e) =>
                        setAuthPassword(
                          e.target.value
                        )
                      }
                      autoComplete={
                        authMode === "signup"
                          ? "new-password"
                          : "current-password"
                      }
                      required
                      minLength={8}
                      className="bg-slate-950 border-slate-800 rounded-xl"
                    />
                  </div>

                  {authError && (
                    <div className="text-destructive text-xs font-semibold bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                      {authError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary text-white font-bold rounded-xl"
                    disabled={authLoading}
                  >
                    {authLoading
                      ? "Processing..."
                      : authMode === "signup"
                      ? "Create Account"
                      : "Log In"}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-850">
                  <h2 className="font-bold text-xl">
                    SaaS Premium Checkout
                  </h2>

                  <p className="text-slate-400 text-xs mt-1">
                    Complete your secure checkout
                    via Razorpay
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="billingName"
                        className="text-slate-300"
                      >
                        Customer Name
                      </Label>

                      <Input
                        id="billingName"
                        type="text"
                        value={name}
                        onChange={(e) =>
                          setName(
                            e.target.value
                          )
                        }
                        autoComplete="name"
                        maxLength={100}
                        className="bg-slate-950 border-slate-800 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="billingPhone"
                        className="text-slate-300"
                      >
                        Mobile Number
                      </Label>

                      <Input
                        id="billingPhone"
                        type="tel"
                        value={phone}
                        onChange={(e) =>
                          setPhone(
                            e.target.value
                          )
                        }
                        autoComplete="tel"
                        maxLength={15}
                        inputMode="tel"
                        className="bg-slate-950 border-slate-800 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-slate-300">
                      Preferred Payment Mode
                    </Label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod("upi")
                        }
                        className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 ${
                          paymentMethod === "upi"
                            ? "border-primary bg-primary/10 text-primary font-bold"
                            : "border-slate-800 bg-slate-950 text-slate-400"
                        }`}
                      >
                        <Smartphone className="w-5 h-5" />
                        <span className="text-[11px]">
                          UPI Apps
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod("card")
                        }
                        className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 ${
                          paymentMethod === "card"
                            ? "border-primary bg-primary/10 text-primary font-bold"
                            : "border-slate-800 bg-slate-950 text-slate-400"
                        }`}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-[11px]">
                          Cards
                        </span>
                      </button>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="text-destructive text-xs font-semibold bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />

                      <span>
                        {paymentError}
                      </span>
                    </div>
                  )}

                  {isPaidSubscriber ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center font-bold text-sm">
                      ✨ You are already on the
                      Premium Plan.
                    </div>
                  ) : (
                    <Button
                      onClick={
                        handleSubscribe
                      }
                      className="w-full h-14 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold text-base rounded-xl"
                      disabled={
                        isProcessing ||
                        isSubLoading
                      }
                    >
                      {isProcessing
                        ? "Opening Secure Payment Gateway..."
                        : `Pay ₹${displayGrandTotal} (Incl. GST)`}
                    </Button>
                  )}

                  <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest pt-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />

                    Secure checkout via Razorpay
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-[10px] font-extrabold uppercase tracking-wider mb-6">
              <Zap className="w-3 h-3" />
              All-Inclusive Plan
            </div>

            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-black text-white">
                Premium Access
              </h2>

              <p className="text-slate-400 text-xs">
                Full professional features
              </p>
            </div>

            <div className="flex items-baseline gap-2 mb-6 pb-6 border-b border-slate-850">
              <span className="text-6xl font-black text-white">
                ₹299
              </span>

              <span className="text-slate-400 text-sm font-semibold">
                / month
              </span>
            </div>

            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-4">
              Included Features
            </h3>

            <ul className="space-y-3.5 mb-8">
              {premiumFeatures.map(
                (feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />

                    <span className="text-slate-300 text-sm leading-relaxed">
                      {feature}
                    </span>
                  </li>
                )
              )}
            </ul>

            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-400">
                  Monthly Plan
                </span>

                <span>
                  ₹{displayBasePrice}.00
                </span>
              </div>

              <div className="flex justify-between text-slate-500">
                <span>
                  18% GST
                </span>

                <span>
                  ₹{displayGstAmount}.00
                </span>
              </div>

              <div className="border-t border-slate-850 pt-2 flex justify-between font-bold text-sm text-white">
                <span>
                  Grand Total
                </span>

                <span>
                  ₹{displayGrandTotal}.00
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>
          © 2026 FinFlow. Secure Payment Portal.
        </p>
      </footer>
    </div>
  );
}