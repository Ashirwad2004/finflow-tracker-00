import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { PageLoader } from "./PageLoader";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Query is_admin from profiles
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-is-admin", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("is_admin")
          .eq("user_id", user?.id || "")
          .maybeSingle();
        if (error) {
          console.error("Supabase error fetching admin status:", error);
          return { is_admin: false };
        }
        return data || { is_admin: false };
      } catch (e) {
        console.error("Exception fetching admin status:", e);
        return { is_admin: false };
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache admin check for 5 mins
  });

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profileLoading) {
    return <PageLoader />;
  }

  const isAdmin = profile?.is_admin === true;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
            <p className="text-slate-400 text-sm">
              This area is restricted to system administrators. Your account ({user?.email}) does not have administrative privileges.
            </p>
          </div>
          <Button onClick={() => navigate("/")} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
