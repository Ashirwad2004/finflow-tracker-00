import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/core/contexts/CurrencyContext";
import { BusinessProvider } from "@/core/contexts/BusinessContext";
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
const PrintStudioPage = lazy(() => import("@/features/business/pages/PrintStudio"));
const InventoryPage = lazy(() => import("@/features/business/pages/Inventory"));
const OnlineStorePage = lazy(() => import("@/features/business/pages/OnlineStore"));
const ReportsPage = lazy(() => import("@/features/business/pages/Reports"));
const PersonalReportsPage = lazy(() => import("@/features/reports/pages/PersonalReports"));
const AdminDemoPage = lazy(() => import("@/features/demo/AdminDashboard"));
const StorefrontPage = lazy(() => import("@/features/storefront/Storefront"));
const PaymentSuccessPage = lazy(() => import("@/pages/PaymentSuccess"));
const PaymentFailurePage = lazy(() => import("@/pages/PaymentFailure"));

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

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/expenses" element={<ProtectedRoute><AllExpenses /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
        <Route path="/groups/:groupId" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
        <Route path="/join/:inviteCode" element={<JoinGroup />} />
        <Route path="/lent-money" element={<ProtectedRoute><LentMoney /></ProtectedRoute>} />
        <Route path="/borrowed-money" element={<ProtectedRoute><BorrowedMoney /></ProtectedRoute>} />
        <Route path="/personal-reports" element={<ProtectedRoute><PersonalReportsPage /></ProtectedRoute>} />
        <Route path="/recently-deleted" element={<ProtectedRoute><RecentlyDeletedPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute><PurchasesPage /></ProtectedRoute>} />
        <Route path="/business-dashboard" element={<ProtectedRoute><AppLayout><BusinessDashboardPage /></AppLayout></ProtectedRoute>} />
        <Route path="/print-studio" element={<ProtectedRoute><PrintStudioPage /></ProtectedRoute>} />
        <Route path="/parties" element={<ProtectedRoute><PartiesPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
        <Route path="/online-store" element={<ProtectedRoute><OnlineStorePage /></ProtectedRoute>} />
        <Route path="/store/:storeSlug" element={<StorefrontPage />} />
        <Route path="/store/:storeSlug/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/store/:storeSlug/payment-failure" element={<PaymentFailurePage />} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDemoPage /></AdminRoute>} />
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