import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/core/contexts/CurrencyContext";
import { BusinessProvider } from "@/core/contexts/BusinessContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/core/lib/auth";
import { ThemeInitializer } from "@/components/shared/ThemeToggle";
import { AIAssistantChat } from "@/components/shared/AIAssistantChat";
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

// Optimize React Query: 
// 1. Keep data fresh for 5 mins (reduces duplicate network requests)
// 2. Keep unused cache around for 15 mins
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      retry: 1,
      refetchOnWindowFocus: false, // Prevents sudden UI slowdowns when switching tabs
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

const AppRoutes = () => {
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
        <Route path="/business-dashboard" element={<ProtectedRoute><BusinessDashboardPage /></ProtectedRoute>} />
        <Route path="/print-studio" element={<ProtectedRoute><PrintStudioPage /></ProtectedRoute>} />
        <Route path="/parties" element={<ProtectedRoute><PartiesPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
        <Route path="/online-store" element={<ProtectedRoute><OnlineStorePage /></ProtectedRoute>} />
        <Route path="/store/:storeSlug" element={<StorefrontPage />} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDemoPage /></ProtectedRoute>} />
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
              <AIAssistantChat />
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </BusinessProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;