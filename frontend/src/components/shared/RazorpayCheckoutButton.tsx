import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface RazorpayCheckoutButtonProps {
  amount: number; // in Rupees (e.g. 50 for ₹50)
  currency?: string;
  itemName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess?: (paymentDetails: { paymentId: string; orderId: string; signature: string }) => void;
  onFailure?: (error: string) => void;
  className?: string;
  buttonText?: string;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount,
  currency = "INR",
  itemName = "FinFlow Checkout",
  customerName = "Valued Customer",
  customerEmail = "customer@example.com",
  customerPhone = "9999999999",
  onSuccess,
  onFailure,
  className,
  buttonText
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // 1. Ensure Razorpay SDK script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay SDK. Please check your internet connection.");
        setLoading(false);
        return;
      }

      // Convert rupees to paise for Razorpay API (minimum 100 paise)
      const amountInPaise = Math.max(100, Math.round(amount * 100));

      // 2. Call backend order creation endpoint
      const orderRes = await axios.post("/api/create-order", {
        amount: amountInPaise,
        currency,
        receipt: `rcpt_${Date.now()}`,
        customerName,
        customerPhone
      });

      if (!orderRes.data || !orderRes.data.order_id) {
        throw new Error(orderRes.data?.error || "Failed to create order on payment server.");
      }

      const { order_id, key_id } = orderRes.data;
      const razorpayKey = key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TG7U7E97coCG1G";

      // 3. Configure Razorpay Standard Checkout options
      const options = {
        key: razorpayKey,
        amount: amountInPaise,
        currency,
        name: "FinFlow Tracker",
        description: itemName,
        order_id: order_id,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone
        },
        theme: {
          color: "#6366f1"
        },
        handler: async (response: any) => {
          try {
            // 4. Verify payment signature on backend
            const verifyRes = await axios.post("/api/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data && verifyRes.data.success) {
              toast.success("🎉 Payment Successful!", {
                description: `Payment ID: ${response.razorpay_payment_id}`
              });
              if (onSuccess) {
                onSuccess({
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature
                });
              }
            } else {
              throw new Error(verifyRes.data?.error || "Payment verification failed.");
            }
          } catch (vErr: any) {
            const errorMsg = vErr.response?.data?.error || vErr.message || "Payment verification failed.";
            toast.error(errorMsg);
            if (onFailure) onFailure(errorMsg);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info("Payment cancelled by user.");
          }
        }
      };

      // 5. Open Razorpay Payment Modal
      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (response: any) => {
        setLoading(false);
        const errorMsg = response.error?.description || "Payment failed.";
        toast.error(`Payment Failed: ${errorMsg}`);
        if (onFailure) onFailure(errorMsg);
      });

      rzp.open();

    } catch (err: any) {
      console.error("Razorpay Checkout Error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Checkout initialization failed.";
      toast.error(errorMsg);
      if (onFailure) onFailure(errorMsg);
      setLoading(false);
    }
  };

  return (
    <Button
      disabled={loading}
      onClick={handlePayment}
      className={className || "bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-md"}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing Payment...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          {buttonText || `Pay ₹${amount.toLocaleString("en-IN")} with Razorpay`}
        </>
      )}
    </Button>
  );
};
