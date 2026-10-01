import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/core/integrations/supabase/client";
import { useQueryCacheOffline } from "@/core/hooks/useQueryCacheOffline";
import { OPFSStorageManager } from "@/core/offline/opfsStorage";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageLoader, MerchantRoute, SalesmanRoute, AdminRoute } from "./guards";

// Lazy-loaded pages
const Index = lazy(() => import("@/pages/public/LandingPage"));
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
const NotFound = lazy(() => import("@/pages/public/NotFound"));

// Domain Pages
const SalesPage = lazy(() => import("@/features/sales/pages/SalesPage"));
const PurchasesPage = lazy(() => import("@/features/purchases/pages/PurchasesPage"));
const BusinessDashboardPage = lazy(() => import("@/features/dashboard/BusinessDashboard"));
const PartiesPage = lazy(() => import("@/features/parties/pages/PartiesPage"));
const BankDetailsPage = lazy(() => import("@/features/banking/pages/BankDetails"));
const PrintStudioPage = lazy(() => import("@/features/print-studio/pages/PrintStudioPage"));
const InventoryPage = lazy(() => import("@/features/inventory/pages/InventoryPage"));
const OnlineStorePage = lazy(() => import("@/features/storefront/pages/OnlineStorePage"));
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage"));
const PersonalReportsPage = lazy(() => import("@/features/reports/pages/PersonalReports"));
const AdminDemoPage = lazy(() => import("@/features/demo/AdminDashboard"));
const StorefrontPage = lazy(() => import("@/features/storefront/Storefront"));
const PaymentSuccessPage = lazy(() => import("@/pages/public/PaymentSuccess"));
const PaymentFailurePage = lazy(() => import("@/pages/public/PaymentFailure"));
const PrivacyPolicy = lazy(() => import("@/pages/public/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/public/TermsOfService"));
const LoyaltyCampaigns = lazy(() => import("@/features/loyalty/pages/LoyaltyCampaignsPage"));
const PricingPage = lazy(() => import("@/pages/public/Pricing"));
const POSPage = lazy(() => import("@/features/pos/pages/POSPage"));
const BarcodeManagementPage = lazy(() => import("@/features/pos/pages/BarcodeManagement"));

// Automatically resets scroll position to top on route change
export const ScrollToTopOnNavigate = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export const AppRoutes: React.FC = () => {
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

          {/* Persistent Merchant AppLayout Shell */}
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

export default AppRoutes;

// Centralized domain route configurations
export { salesRoutes } from "@/features/sales/routes";
export { purchasesRoutes } from "@/features/purchases/routes";
export { partiesRoutes } from "@/features/parties/routes";
export { inventoryRoutes } from "@/features/inventory/routes";
export { bankingRoutes } from "@/features/banking/routes";
export { reportsRoutes } from "@/features/reports/routes";
export { dashboardRoutes } from "@/features/dashboard/routes";
export { settingsRoutes } from "@/features/settings/routes";
export { salesmanRoutes } from "@/features/salesman/routes";
export { posRoutes } from "@/features/pos/routes";
export { loyaltyRoutes } from "@/features/loyalty/routes";
export { storefrontRoutes } from "@/features/storefront/routes";
export { printStudioRoutes } from "@/features/print-studio/routes";
export { expensesRoutes } from "@/features/expenses/routes";
export { loansRoutes } from "@/features/loans/routes";
export { groupsRoutes } from "@/features/groups/routes";
export { trashRoutes } from "@/features/trash/routes";
