import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { PageLoader } from "./PageLoader";

export const SalesmanRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isSalesman, isLoading: businessLoading } = useBusiness();

  if (loading || businessLoading) {
    return <PageLoader />;
  }

  // If identified as a salesman (e.g. via local session), allow access directly
  if (isSalesman) {
    return <>{children}</>;
  }

  // Otherwise, check if user is logged in
  if (!user) {
    return <Navigate to="/salesman-login" replace />;
  }

  // If logged in as standard merchant, redirect to business dashboard
  return <Navigate to="/business-dashboard" replace />;
};

export default SalesmanRoute;
