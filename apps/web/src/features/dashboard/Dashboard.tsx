import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { ExpenseList } from "@/features/expenses/components/ExpenseList";
import { ExpenseChart } from "@/features/expenses/components/ExpenseChart";
import { RecentlyDeleted } from "@/features/trash/components/RecentlyDeleted";
import { AiInsights } from "@/features/dashboard/AiInsights";
import { LoansDebtsOverview } from "./LoansDebtsOverview";
import { useDashboardData } from "./hooks/useDashboardData";
import {
    WeeklySpendingChart,
    DashboardSummaryHeader,
    DashboardQuickActions,
    DashboardMetricCards,
    DashboardDialogs,
    BusinessModeView,
} from "./components";

export const Dashboard = () => {
    const navigate = useNavigate();
    const {
        user,
        profile,
        signOut,
        isBusinessMode,
        formatCurrency,
        expenses,
        isLoading,
        categories,
        deleteExpense,
        lentMoney,
        borrowedMoney,
        pendingLentTotal,
        pendingBorrowedTotal,
        netOutstanding,
        totalExpenses,
        thisMonthExpensesList,
        thisMonthExpenses,
        expenseTrendValue,
        isExpenseTrendPositive,
        monthlySparkline,
        last7DaysSparkline,
        transactionsSparkline,
        weeklyBarData,
        weeklyMetrics,
        getFullDayName,
        isAddDialogOpen,
        setIsAddDialogOpen,
        isLentMoneyDialogOpen,
        setIsLentMoneyDialogOpen,
        isBorrowedMoneyDialogOpen,
        setIsBorrowedMoneyDialogOpen,
        expenseToEdit,
        setExpenseToEdit,
        showRecentlyDeleted,
        setShowRecentlyDeleted,
        isSettingsOpen,
        setIsSettingsOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        showOnboarding,
        setShowOnboarding,
        showBusinessDetails,
        setShowBusinessDetails,
        handleOnboardingSelect,
    } = useDashboardData();

    // Memoize expense list and chart to preserve performance
    const memoizedExpenseList = useMemo(() => (
        <ExpenseList
            expenses={thisMonthExpensesList}
            isLoading={isLoading}
            onEdit={(expense) => setExpenseToEdit(expense)}
            onDelete={(id) => deleteExpense.mutate(id)}
            onDeleteAll={() => { }}
        />
    ), [thisMonthExpensesList, isLoading, deleteExpense, setExpenseToEdit]);

    const memoizedExpenseChart = useMemo(() => (
        <ExpenseChart expenses={expenses} />
    ), [expenses]);

    // Business Mode View
    if (isBusinessMode) {
        return (
            <BusinessModeView
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                onSignOut={() => signOut()}
            />
        );
    }

    return (
        <AppLayout>
            <div className="min-h-screen bg-background bg-noise">
                <main className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <DashboardSummaryHeader
                        displayName={profile?.display_name || "User"}
                        onOpenGroups={() => navigate("/groups")}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                    />

                    {/* AI Insights */}
                    <div className="mb-8">
                        <AiInsights expenses={expenses} categories={categories} />
                    </div>

                    {/* Summary Banner & Quick Actions */}
                    <DashboardQuickActions
                        pendingLentTotal={pendingLentTotal}
                        pendingBorrowedTotal={pendingBorrowedTotal}
                        netOutstanding={netOutstanding}
                        formatCurrency={formatCurrency}
                        onAddExpense={() => setIsAddDialogOpen(true)}
                        onLendMoney={() => setIsLentMoneyDialogOpen(true)}
                        onRecordDebt={() => setIsBorrowedMoneyDialogOpen(true)}
                        onShareBill={() => navigate("/groups")}
                    />

                    {/* Main KPI Cards Grid */}
                    <DashboardMetricCards
                        totalExpenses={totalExpenses}
                        thisMonthExpenses={thisMonthExpenses}
                        transactionsCount={expenses.length}
                        expenseTrendValue={expenseTrendValue}
                        isExpenseTrendPositive={isExpenseTrendPositive}
                        monthlySparkline={monthlySparkline}
                        last7DaysSparkline={last7DaysSparkline}
                        transactionsSparkline={transactionsSparkline}
                        userId={user?.id || ""}
                        hasCustomCurrency={Boolean(user?.user_metadata?.currency)}
                    />

                    {/* 2-Column Content Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT COLUMN: EXPENSE LIST & WEEKLY TREND (2cols on LG) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-500">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">
                                        {showRecentlyDeleted ? "Recently Deleted" : "Recent Transactions"}
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        {showRecentlyDeleted ? "Manage your deleted items" : "Track and manage your daily spending"}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        onClick={() => setShowRecentlyDeleted(!showRecentlyDeleted)}
                                        size="sm"
                                        variant="ghost"
                                        className="text-muted-foreground"
                                    >
                                        <Clock className="w-4 h-4 mr-2" />
                                        {showRecentlyDeleted ? "Back to List" : "History"}
                                    </Button>

                                    {!showRecentlyDeleted && (
                                        <Button
                                            onClick={() => navigate("/expenses")}
                                            size="sm"
                                            variant="ghost"
                                            className="text-muted-foreground"
                                        >
                                            <ArrowRight className="w-4 h-4 mr-2" />
                                            View All
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-card rounded-2xl border shadow-sm overflow-hidden"
                            >
                                {showRecentlyDeleted ? (
                                    <RecentlyDeleted userId={user?.id || ""} />
                                ) : (
                                    memoizedExpenseList
                                )}
                            </motion.div>

                            {/* Weekly Spending Trend Chart */}
                            {!showRecentlyDeleted && (
                                <WeeklySpendingChart
                                    weeklyBarData={weeklyBarData}
                                    weeklyMetrics={weeklyMetrics}
                                    formatCurrency={formatCurrency}
                                    getFullDayName={getFullDayName}
                                />
                            )}
                        </div>

                        {/* RIGHT COLUMN: CHARTS & LENT MONEY (1col on LG) */}
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="bg-card rounded-2xl border shadow-sm p-6 mb-6">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-primary" />
                                        Spending Analysis
                                    </h3>
                                    <div className="h-[300px] w-full min-h-[300px]">
                                        {memoizedExpenseChart}
                                    </div>
                                </div>
                                <LoansDebtsOverview
                                    lentMoney={lentMoney}
                                    borrowedMoney={borrowedMoney}
                                    userId={user?.id || ""}
                                    onLendClick={() => setIsLentMoneyDialogOpen(true)}
                                    onBorrowClick={() => setIsBorrowedMoneyDialogOpen(true)}
                                />
                            </motion.div>
                        </div>
                    </div>
                </main>

                {/* Modals & Dialogs Manager */}
                <DashboardDialogs
                    userId={user?.id || ""}
                    categories={categories}
                    isAddDialogOpen={isAddDialogOpen}
                    setIsAddDialogOpen={setIsAddDialogOpen}
                    expenseToEdit={expenseToEdit}
                    setExpenseToEdit={setExpenseToEdit}
                    isLentMoneyDialogOpen={isLentMoneyDialogOpen}
                    setIsLentMoneyDialogOpen={setIsLentMoneyDialogOpen}
                    isBorrowedMoneyDialogOpen={isBorrowedMoneyDialogOpen}
                    setIsBorrowedMoneyDialogOpen={setIsBorrowedMoneyDialogOpen}
                    isSettingsOpen={isSettingsOpen}
                    setIsSettingsOpen={setIsSettingsOpen}
                    showOnboarding={showOnboarding}
                    onSelectOnboarding={handleOnboardingSelect}
                    showBusinessDetails={showBusinessDetails}
                    setShowBusinessDetails={setShowBusinessDetails}
                />
            </div>
        </AppLayout>
    );
};

export default Dashboard;