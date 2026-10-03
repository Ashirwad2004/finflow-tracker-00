import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { StoreProfile, StoreBrandingData } from "../components/customer";

export function useStorefrontProfiles(storeSlug?: string) {
  // Fetch public store profile
  const {
    data: storeProfile,
    isLoading: isLoadingStore,
    isFetched: isStoreFetched,
    error: storeError,
  } = useQuery<StoreProfile | null>({
    queryKey: ["publicStoreProfile", storeSlug],
    queryFn: async () => {
      if (storeSlug === "aroma-coffee") {
        return {
          user_id: "demo-user-id",
          display_name: "Aroma Coffee Roasters",
          store_slug: "aroma-coffee",
          is_store_active: true,
          business_name: "Aroma Coffee Roasters",
          business_logo: null,
          delivery_charge: 49,
          free_delivery_min_amount: 1000,
        };
      }
      const { data, error } = await (supabase as any).rpc("get_public_store", { p_slug: storeSlug });
      if (error) {
        console.error("Supabase RPC Error:", error);
        throw new Error(`Database Error: ${error.message}. (Did you forget to run the SQL migrations?)`);
      }
      let row: any = null;
      if (Array.isArray(data)) row = data[0] ?? null;
      else if (data && typeof data === "object") row = data;
      return row ? (row as StoreProfile) : null;
    },
    enabled: !!storeSlug,
    retry: false,
    staleTime: 30_000,
  });

  const storeId = storeProfile?.user_id ?? null;

  // Fetch merchant profile
  const { data: merchantProfile } = useQuery({
    queryKey: ["merchantProfile", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      if (storeId === "demo-user-id") {
        return {
          business_name: "Aroma Coffee Roasters Ltd.",
          business_address: "123 Gourmet Coffee Blvd, Roast City, RC 560001",
          business_phone: "+91 98765 43210",
          gst_number: "29AAAAA1111A1Z1",
          signature_url: null,
          business_logo: null,
        };
      }
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("business_name, business_address, business_phone, gst_number, business_logo, signature_url, display_name")
        .eq("user_id", storeId)
        .single();
      if (error) {
        console.error("Error fetching merchant profile:", error);
        return null;
      }
      return data;
    },
    enabled: !!storeId,
  });

  // Fetch store branding
  const { data: brandingData } = useQuery<StoreBrandingData | null>({
    queryKey: ["publicStoreBranding", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("business_name, business_logo, delivery_charge, free_delivery_min_amount, upi_id, online_payment_enabled")
        .eq("user_id", storeId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });

  const businessName =
    storeProfile?.business_name || brandingData?.business_name || storeProfile?.display_name || "My Store";
  const businessLogo = storeProfile?.business_logo || brandingData?.business_logo || null;

  return {
    storeProfile,
    isLoadingStore,
    isStoreFetched,
    storeError,
    storeId,
    merchantProfile,
    brandingData,
    businessName,
    businessLogo,
  };
}
