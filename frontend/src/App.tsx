import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/core/contexts/CurrencyContext";
import { BusinessProvider, useBusiness } from "@/core/contexts/BusinessContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { ThemeInitializer } from "@/components/shared/ThemeToggle";
import { AppAssistantGate } from "@/components/shared/AppAssistantGate";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "@/pages/Index";

// Lazy-loaded pages
const Auth = lazy(() => import("@/features/auth/Auth"));
const SalesmanLogin = lazy(() => import("@/features/auth/SalesmanLogin"));
const SalesmanDashboard = lazy(() => import("@/features/salesman/pages/SalesmanDashboard"));
const Groups = lazy(() => import("@/features/groups/Groups"));
const GroupDetail = lazy(() => import("@/features/groups/GroupDetail"));
const JoinGroup = lazy(() => import("@/features/groups/JoinGroup"));
const AllExpenses = lazy(() => import("@/features/expenses/pages/AllExpenses"));
const LentMoney = lazy(() => import("@/features/loans/pages/LentMoney"));
const BorrowedMoney = lazy(() => import("@/features/loans/pages/BorrowedMoney"));
const RecentlyDeletedPage = lazy(() => import("@/features/trash/pages/RecentlyDeletedPage"));
const SettingsPage = lazy(() => import("@/features/settings/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const SalesPage = lazy(() => import("@/features/business/pages/Sales"));
const PurchasesPage = lazy(() => import("@/features/business/pages/Purchases"));
const BusinessDashboardPage = lazy(() => import("@/features/business/pages/BusinessDashboard"));
const PartiesPage = lazy(() => import("@/features/business/pages/Parties"));
const BankDetailsPage = lazy(() => import("@/features/business/pages/BankDetails"));
const PrintStudioPage = lazy(() => import("@/features/business/pages/PrintStudio"));
const InventoryPage = lazy(() => import("@/features/business/pages/Inventory"));
const OnlineStorePage = lazy(() => import("@/features/business/pages/OnlineStore"));
const ReportsPage = lazy(() => import("@/features/business/pages/Reports"));
const PersonalReportsPage = lazy(() => import("@/features/reports/pages/PersonalReports"));
const AdminDemoPage = lazy(() => import("@/features/demo/AdminDashboard"));
const StorefrontPage = lazy(() => import("@/features/storefront/Storefront"));
const PaymentSuccessPage = lazy(() => import("@/pages/PaymentSuccess"));
const PaymentFailurePage = lazy(() => import("@/pages/PaymentFailure"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));

// Optimize React Query: 
// 1. Keep data fresh for 5 mins (reduces duplicate network requests)
// 2. Keep unused cache around for 15 mins
// 3. Set networkMode to offlineFirst to prevent pausing queries/mutations when offline
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      retry: 1,
      refetchOnWindowFocus: false, // Prevents sudden UI slowdowns when switching tabs
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

// A reusable full-page loading skeleton while lazy components resolve
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading experience...</p>
    </div>
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Salesman route wrapper
const SalesmanRoute = ({ children }: { children: React.ReactNode }) => {
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

// Merchant route wrapper (excludes salesmen)
const MerchantRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isSalesman, isLoading: businessLoading } = useBusiness();

  if (loading || businessLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isSalesman) {
    return <Navigate to="/salesman-dashboard" replace />;
  }

  return <>{children}</>;
};

// Admin route wrapper with database checks and whitelist backup
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
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
        console.log("Fetched profile admin status:", data);
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

  // Determine admin status.
  // Whitelist fallback: any email containing "admin@" or "ashirwad" is automatically allowed.
  const isEmailAdmin = user.email?.toLowerCase().includes("admin@") || user.email?.toLowerCase().includes("ashirwad");
  const isAdmin = profile?.is_admin === true || isEmailAdmin;

  console.log("Admin check summary:", { 
    userId: user.id, 
    email: user.email, 
    dbIsAdmin: profile?.is_admin, 
    isEmailAdmin, 
    isAdmin 
  });

  if (profileLoading && !isEmailAdmin) {
    return <PageLoader />;
  }

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

import { useQueryCacheOffline } from "@/core/hooks/useQueryCacheOffline";

const AppRoutes = () => {
  useQueryCacheOffline();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check if the URL hash contains recovery type on initial load or path change
    const checkRecoveryHash = () => {
      const hash = window.location.hash;
      if (hash.includes("type=recovery")) {
        navigate(`/auth?reset=true${hash}`, { replace: true });
      }
    };

    checkRecoveryHash();

    // 2. Listen to PASSWORD_RECOVERY auth event globally
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          navigate("/auth?reset=true", { replace: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/salesman-login" element={<SalesmanLogin />} />
        <Route path="/expenses" element={<MerchantRoute><AllExpenses /></MerchantRoute>} />
        <Route path="/groups" element={<MerchantRoute><Groups /></MerchantRoute>} />
        <Route path="/groups/:groupId" element={<MerchantRoute><GroupDetail /></MerchantRoute>} />
        <Route path="/join/:inviteCode" element={<JoinGroup />} />
        <Route path="/lent-money" element={<MerchantRoute><LentMoney /></MerchantRoute>} />
        <Route path="/borrowed-money" element={<MerchantRoute><BorrowedMoney /></MerchantRoute>} />
        <Route path="/personal-reports" element={<MerchantRoute><PersonalReportsPage /></MerchantRoute>} />
        <Route path="/recently-deleted" element={<MerchantRoute><RecentlyDeletedPage /></MerchantRoute>} />
        <Route path="/settings" element={<MerchantRoute><SettingsPage /></MerchantRoute>} />
        <Route path="/sales" element={<MerchantRoute><SalesPage /></MerchantRoute>} />
        <Route path="/purchases" element={<MerchantRoute><PurchasesPage /></MerchantRoute>} />
        <Route path="/business-dashboard" element={<MerchantRoute><AppLayout><BusinessDashboardPage /></AppLayout></MerchantRoute>} />
        <Route path="/print-studio" element={<MerchantRoute><PrintStudioPage /></MerchantRoute>} />
        <Route path="/parties" element={<MerchantRoute><PartiesPage /></MerchantRoute>} />
        <Route path="/bank-details" element={<MerchantRoute><BankDetailsPage /></MerchantRoute>} />
        <Route path="/inventory" element={<MerchantRoute><InventoryPage /></MerchantRoute>} />
        <Route path="/online-store" element={<MerchantRoute><OnlineStorePage /></MerchantRoute>} />
        <Route path="/salesman-dashboard" element={<SalesmanRoute><SalesmanDashboard /></SalesmanRoute>} />
        <Route path="/store/:storeSlug" element={<StorefrontPage />} />
        <Route path="/store/:storeSlug/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/store/:storeSlug/payment-failure" element={<PaymentFailurePage />} />
        <Route path="/reports" element={<MerchantRoute><ReportsPage /></MerchantRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDemoPage /></AdminRoute>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BusinessProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ThemeInitializer />
              <AppAssistantGate />
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </BusinessProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;