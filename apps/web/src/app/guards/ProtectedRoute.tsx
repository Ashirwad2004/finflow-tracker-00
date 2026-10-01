import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { PageLoader } from "./PageLoader";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
