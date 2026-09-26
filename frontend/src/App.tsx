import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/core/contexts/CurrencyContext";
import { BusinessProvider, useBusiness } from "@/core/contexts/BusinessContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { ThemeInitializer } from "@/components/shared/ThemeToggle";
import { AppAssistantGate } from "@/components/shared/AppAssistantGate";
import { AppLayout } from "@/components/layout/AppLayout";

// Lazy-loaded pages (including Index for minimal initial bundle size)
const Index = lazy(() => import("@/pages/Index"));
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
const LoyaltyCampaigns = lazy(() => import("@/features/business/pages/LoyaltyCampaigns"));
const PricingPage = lazy(() => import("@/pages/Pricing"));
const POSPage = lazy(() => import("@/features/pos/pages/POSPage"));
const BarcodeManagementPage = lazy(() => import("@/features/pos/pages/BarcodeManagement"));

// Optimize React Query for Instant Client-Side SPA Rendering:
// 1. Keep data fresh for 5 mins (eliminates unnecessary duplicate network requests)
// 2. Keep unused cache around for 15 mins
// 3. placeholderData preserves current UI data in memory during background refetches
// 4. Set networkMode to offlineFirst to prevent pausing queries/mutations when offline
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      retry: 1,
      refetchOnWindowFocus: false, // Prevents sudden UI slowdowns when switching tabs
      networkMode: "offlineFirst",
      placeholderData: (previousData: any) => previousData, // Seamless in-memory transitions without layout flash
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
    </div>
  </div>
);

// Automatically resets scroll position to top on route change
const ScrollToTopOnNavigate = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

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

import { useSubscription } from "@/core/hooks/useSubscription";

// Merchant route wrapper (excludes salesmen)
const MerchantRoute = ({ children }: { children: React.ReactNode }) => {
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

import { useQueryCacheOffline } from "@/core/hooks/useQueryCacheOffline";
import { OPFSStorageManager } from "@/core/offline/opfsStorage";

const AppRoutes = () => {
  useQueryCacheOffline();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize OPFS and request persistent storage eviction-immunity on boot
    OPFSStorageManager.init().catch((err) => {
      console.warn("[App] OPFS initialization skipped or failed:", err);
    });

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
    <>
      <ScrollToTopOnNavigate />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/salesman-login" element={<SalesmanLogin />} />

          {/* Persistent Merchant AppLayout Shell: AppSidebar and shell stay continuously mounted for instant 0ms client-side route transitions */}
          <Route
            element={
              <MerchantRoute>
                <AppLayout>
                  <Outlet />
                </AppLayout>
              </MerchantRoute>
            }
          >
            <Route path="/business-dashboard" element={<BusinessDashboardPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/barcodes" element={<BarcodeManagementPage />} />
            <Route path="/parties" element={<PartiesPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/print-studio" element={<PrintStudioPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/online-store" element={<OnlineStorePage />} />
            <Route path="/bank-details" element={<BankDetailsPage />} />
            <Route path="/loyalty" element={<LoyaltyCampaigns />} />
            <Route path="/expenses" element={<AllExpenses />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId" element={<GroupDetail />} />
            <Route path="/lent-money" element={<LentMoney />} />
            <Route path="/borrowed-money" element={<BorrowedMoney />} />
            <Route path="/personal-reports" element={<PersonalReportsPage />} />
            <Route path="/recently-deleted" element={<RecentlyDeletedPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="/join/:inviteCode" element={<JoinGroup />} />
          <Route path="/salesman-dashboard" element={<SalesmanRoute><SalesmanDashboard /></SalesmanRoute>} />
          <Route path="/store/:storeSlug" element={<StorefrontPage />} />
          <Route path="/store/:storeSlug/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/store/:storeSlug/payment-failure" element={<PaymentFailurePage />} />
          <Route path="/admin" element={<AdminRoute><AdminDemoPage /></AdminRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/payment" element={<PricingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
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