import { BusinessDetailsDialog } from "@/features/settings/components/BusinessDetailsDialog";
import { RevenueAnalytics } from "@/features/reports/components/RevenueAnalytics";
import { useBusinessDashboardData } from "./useBusinessDashboardData";
import { BusinessDashboardMetrics } from "./BusinessDashboardMetrics";
import { BusinessDashboardCharts } from "./BusinessDashboardCharts";
import { BusinessDashboardRecentActivity } from "./BusinessDashboardRecentActivity";

export function BusinessDashboard() {
  const {
    formatCurrency,
    navigate,
    isEditProfileOpen,
    setIsEditProfileOpen,
    sales,
    purchases,
    expenses,
    totalRevenue,
    totalPurchases,
    totalExpenses,
    grossProfit,
    netProfit,
    chartData,
    topCustomers,
    pieData,
    combinedHistory,
  } = useBusinessDashboardData();

  return (
    <main className="px-4 lg:px-8 py-8 space-y-8 max-w-7xl mx-auto animate-fade-in font-display">
      {/* Metrics Section */}
      <BusinessDashboardMetrics
        totalRevenue={totalRevenue}
        grossProfit={grossProfit}
        totalPurchases={totalPurchases}
        totalExpenses={totalExpenses}
        netProfit={netProfit}
        formatCurrency={formatCurrency}
        onOpenProfile={() => setIsEditProfileOpen(true)}
      />

      {/* Revenue Analytics Section */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <RevenueAnalytics sales={sales} purchases={purchases} expenses={expenses} />
      </div>

      {/* Charts Section */}
      <BusinessDashboardCharts
        chartData={chartData}
        pieData={pieData}
        totalRevenue={totalRevenue}
        formatCurrency={formatCurrency}
      />

      {/* Bottom Data Section */}
      <BusinessDashboardRecentActivity
        topCustomers={topCustomers}
        combinedHistory={combinedHistory}
        formatCurrency={formatCurrency}
        onViewAllParties={() => navigate("/parties")}
      />

      <BusinessDetailsDialog
        open={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
      />
    </main>
  );
}

export default BusinessDashboard;
