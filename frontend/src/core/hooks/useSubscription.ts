import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";

export interface SubscriptionInfo {
  plan: "free" | "trial" | "starter" | "pro" | "business" | "premium";
  status: "active" | "inactive" | "expired" | "cancelled";
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const { isSalesman } = useBusiness();

  // Query is_admin from profiles with localStorage fallback
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return { is_admin: false };
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("is_admin")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!error && data) {
          try {
            localStorage.setItem(`cached_is_admin_${user.id}`, JSON.stringify(data.is_admin === true));
          } catch {
            // ignore localStorage quota errors
          }
          return data;
        }
      } catch (e) {
        console.warn("[useSubscription] Offline or error fetching admin status:", e);
      }
      try {
        const cached = localStorage.getItem(`cached_is_admin_${user.id}`);
        if (cached !== null) return { is_admin: JSON.parse(cached) };
      } catch {
        // ignore
      }
      return { is_admin: false };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const isAdmin = profileData?.is_admin === true;

  // Query subscription_status with localStorage fallback
  const {
    data: subStatus,
    isLoading: subLoading,
    refetch,
  } = useQuery<SubscriptionInfo | null>({
    queryKey: ["subscription_status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const { data, error } = await (supabase as any)
          .from("subscription_status")
          .select("plan, status, current_period_start, current_period_end, cancel_at_period_end")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data) {
          try {
            localStorage.setItem(`cached_subscription_${user.id}`, JSON.stringify(data));
          } catch {
            // ignore localStorage quota errors
          }
          return data as SubscriptionInfo;
        }
      } catch (err) {
        console.warn("[useSubscription] Offline or error fetching subscription_status:", err);
      }

      // Check localStorage cache
      try {
        const cached = localStorage.getItem(`cached_subscription_${user.id}`);
        if (cached) {
          return JSON.parse(cached) as SubscriptionInfo;
        }
      } catch {
        // ignore
      }

      // If offline and no cache, allow offline trial usage gracefully
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return {
          plan: "trial",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
          cancel_at_period_end: false,
        };
      }

      return {
        plan: "free",
        status: "inactive",
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const plan = subStatus?.plan || "free";
  const status = subStatus?.status || "inactive";
  const currentPeriodEnd = subStatus?.current_period_end
    ? new Date(subStatus.current_period_end)
    : null;

  // Calculate remaining trial days
  const getTrialDaysRemaining = (): number => {
    if (plan !== "trial" || !currentPeriodEnd) return 0;
    const diffTime = currentPeriodEnd.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const trialDaysLeft = getTrialDaysRemaining();

  const isPaidSubscriber =
    ["pro", "business", "premium"].includes(plan) &&
    status === "active" &&
    (!currentPeriodEnd || currentPeriodEnd.getTime() > Date.now());

  const isTrialActive = plan === "trial" && trialDaysLeft > 0 && status === "active";

  const isTrialExpired =
    plan === "free" ||
    (plan === "trial" && trialDaysLeft <= 0) ||
    status === "expired" ||
    status === "inactive";

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  // Access is granted if paid, active trial, system admin, salesman session, OR if currently offline with active user session
  const canAccessApp =
    isPaidSubscriber || isTrialActive || isAdmin || isSalesman || (isOffline && !!user);

  const isLoading = authLoading || profileLoading || subLoading;

  return {
    plan,
    status,
    currentPeriodEnd,
    trialDaysLeft,
    isPaidSubscriber,
    isTrialActive,
    isTrialExpired,
    canAccessApp,
    isAdmin,
    isSalesman,
    isLoading,
    refetchSubscription: refetch,
  };
}