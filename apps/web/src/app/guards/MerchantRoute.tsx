import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useSubscription } from "@/core/hooks/useSubscription";
import { PageLoader } from "./PageLoader";

export const MerchantRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isSalesman, isLoading: businessLoading } = useBusiness();
  const { canAccessApp, isLoading: subLoading, isTrialExpired } = useSubscription();

  if (loading || businessLoading || subLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isSalesman) {
    return <Navigate to="/salesman-dashboard" replace />;
  }

  if (!canAccessApp) {
    return <Navigate to="/pricing" replace state={{ trialExpired: isTrialExpired }} />;
  }

  return <>{children}</>;
};

export default MerchantRoute;
