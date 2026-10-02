import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";

interface UsePaymentSettingsProps {
  currentStoreId: string | null | undefined;
  isSalesman: boolean;
}

export function usePaymentSettings({ currentStoreId, isSalesman }: UsePaymentSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [payUpiId, setPayUpiId] = useState("");
  const [payGateway, setPayGateway] = useState("mock");
  const [payRazorpayKeyId, setPayRazorpayKeyId] = useState("");
  const [payStripeKey, setPayStripeKey] = useState("");
  const [payOnlineEnabled, setPayOnlineEnabled] = useState(false);

  const { isLoading: isLoadingPaySettings } = useQuery({
    queryKey: ["paymentSettings", currentStoreId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("upi_id, payment_gateway, razorpay_key_id, stripe_publishable_key, online_payment_enabled")
        .eq("user_id", currentStoreId || "")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setPayUpiId((data as any).upi_id || "");
        setPayGateway((data as any).payment_gateway || "mock");
        setPayRazorpayKeyId((data as any).razorpay_key_id || "");
        setPayStripeKey((data as any).stripe_publishable_key || "");
        setPayOnlineEnabled((data as any).online_payment_enabled || false);
      }
      return data;
    },
    enabled: !!currentStoreId && !isSalesman,
  });

  const savePaymentSettings = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          upi_id: payUpiId || null,
          payment_gateway: payGateway,
          razorpay_key_id: payRazorpayKeyId || null,
          stripe_publishable_key: payStripeKey || null,
          online_payment_enabled: payOnlineEnabled,
        })
        .eq("user_id", currentStoreId || "");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Payment settings saved", description: "Your payment configuration has been updated." });
      queryClient.invalidateQueries({ queryKey: ["paymentSettings", currentStoreId] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  return {
    payUpiId,
    setPayUpiId,
    payGateway,
    setPayGateway,
    payRazorpayKeyId,
    setPayRazorpayKeyId,
    payStripeKey,
    setPayStripeKey,
    payOnlineEnabled,
    setPayOnlineEnabled,
    isLoadingPaySettings,
    savePaymentSettings,
  };
}
