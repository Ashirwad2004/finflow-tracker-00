import { useState, useCallback, useRef } from "react";
import { apiClient } from "@/core/api/apiClient";
import { useToast } from "@/core/hooks/use-toast";



export type PaymentLifecycleStatus =
  | "idle"
  | "creating_order"
  | "checkout_active"
  | "verifying"
  | "succeeded"
  | "failed";

export interface SubscriptionPaymentOptions {
  planId: "starter" | "pro" | "business" | "premium";
  billingCycle?: "monthly" | "annual";
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  onSuccess?: (result: any) => Promise<void> | void;
  onError?: (error: Error) => void;
  onDismiss?: () => void;
}

// Ensure 2D Canvas contexts set willReadFrequently: true to suppress browser readback warnings
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

// Singleton promise for loading the Razorpay SDK
let razorpayScriptPromise: Promise<boolean> | null = null;

export const loadRazorpayScript = (): Promise<boolean> => {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise<boolean>((resolve) => {
      const existingScript = document.getElementById("razorpay-checkout-script");
      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        razorpayScriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
};

export function useRazorpayPayment() {
  const [status, setStatus] = useState<PaymentLifecycleStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const rzpInstanceRef = useRef<any>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const initiateSubscriptionPayment = useCallback(
    async (options: SubscriptionPaymentOptions) => {
      setError(null);
      setStatus("creating_order");

      try {
        // 1. Ensure Razorpay SDK is ready
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded || !window.Razorpay) {
          throw new Error("Unable to load Razorpay payment SDK. Please verify your internet connection.");
        }

        // 2. Create authoritative order via hardened Python FastAPI backend
        const idempotencyKey = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const orderResponse = await apiClient.post("/api/v1/payments/create-subscription-order", {
          planId: options.planId,
          billingCycle: options.billingCycle || "monthly",
          customerName: options.customerName || "Valued Merchant",
          customerPhone: options.customerPhone || "9999999999",
          idempotencyKey,
        });

        const orderData = orderResponse.data;
        if (!orderData?.success || !orderData.gatewayOrderId) {
          throw new Error(orderData?.message || "Failed to generate payment order on backend.");
        }

        const razorpayKey =
          orderData.key_id ||
          orderData.details?.keyId ||
          import.meta.env.VITE_RAZORPAY_KEY_ID ||
          "rzp_test_TG7U7E97coCG1G";

        // 3. Configure Razorpay modal
        return new Promise<boolean>((resolve, reject) => {
          setStatus("checkout_active");

          const rzpOptions = {
            key: razorpayKey,
            amount: orderData.amount, // in paise from backend
            currency: orderData.currency || "INR",
            name: "RupeeBill",
            description: "RupeeBill Business License (6 Months)",
            ...(Boolean(orderData.gatewayOrderId && /^order_[a-zA-Z0-9]{14,}$/.test(orderData.gatewayOrderId) && !orderData.gatewayOrderId.includes("dev") && !orderData.gatewayOrderId.includes("mock"))
              ? { order_id: orderData.gatewayOrderId }
              : {}),
            prefill: {
              name: options.customerName || "",
              email: options.customerEmail || "",
              contact: options.customerPhone || "",
            },
            theme: {
              color: "#6366f1",
            },
            modal: {
              ondismiss: () => {
                setStatus("idle");
                if (options.onDismiss) {
                  options.onDismiss();
                } else {
                  toast({
                    title: "Payment Cancelled",
                    description: "You closed the payment window before completing checkout.",
                  });
                }
                resolve(false);
              },
            },
            handler: async (response: {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            }) => {
              setStatus("verifying");
              try {
                // 4. Send cryptographic verification request to backend
                const verifyRes = await apiClient.post("/api/v1/payments/verify-payment", {
                  razorpay_order_id: response.razorpay_order_id || orderData.gatewayOrderId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  planId: options.planId,
                  billingCycle: options.billingCycle || "monthly",
                });

                if (verifyRes.data?.success || verifyRes.data?.status === "success") {
                  setStatus("succeeded");
                  if (options.onSuccess) {
                    await options.onSuccess(verifyRes.data);
                  }
                  resolve(true);
                } else {
                  throw new Error("Backend payment signature verification did not succeed.");
                }
              } catch (verifyErr: any) {
                const errMsg = verifyErr.response?.data?.detail || verifyErr.message || "Payment verification failed.";
                setStatus("failed");
                setError(errMsg);
                if (options.onError) {
                  options.onError(new Error(errMsg));
                }
                toast({
                  title: "Payment Verification Failed",
                  description: errMsg,
                  variant: "destructive",
                });
                reject(verifyErr);
              }
            },
          };

          const rzp = new window.Razorpay(rzpOptions);
          rzpInstanceRef.current = rzp;

          rzp.on("payment.failed", (failedRes: any) => {
            const failureReason = failedRes?.error?.description || "Payment failed or declined by issuing bank.";
            setStatus("failed");
            setError(failureReason);
            toast({
              title: "Payment Failed",
              description: failureReason,
              variant: "destructive",
            });
            if (options.onError) {
              options.onError(new Error(failureReason));
            }
          });

          rzp.open();
        });
      } catch (err: any) {
        const errMsg = err.response?.data?.detail || err.message || "Failed to initialize payment.";
        setStatus("failed");
        setError(errMsg);
        if (options.onError) {
          options.onError(new Error(errMsg));
        }
        toast({
          title: "Payment Error",
          description: errMsg,
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  return {
    status,
    isLoading: status === "creating_order" || status === "verifying",
    isCheckoutActive: status === "checkout_active",
    error,
    reset,
    initiateSubscriptionPayment,
  };
}