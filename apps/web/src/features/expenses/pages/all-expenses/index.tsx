import { AppLayout } from "@/components/layout/AppLayout";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddExpenseDialog } from "@/features/expenses/components/AddExpenseDialog";
import { MonthlyExpenseReport } from "@/features/expenses/components/MonthlyExpenseReport";
import { useAllExpensesState } from "./useAllExpensesState";
import { ExpensesMetricsCards } from "./ExpensesMetricsCards";
import { ExpensesFilterBar } from "./ExpensesFilterBar";
import { VirtualizedExpensesList } from "./VirtualizedExpensesList";

export const AllExpenses = () => {
  const {
    expenses,
    isLoading,
    categories,
    isAddDialogOpen,
    setIsAddDialogOpen,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    scrollContainerRef,
    handleRefresh,
    deleteExpense,
    totalExpenses,
    spentThisMonth,
    topCategoryName,
    topCategoryAmount,
    avgExpense,
    filteredExpenses,
    totalFiltered,
    rowVirtualizer,
    formatCurrency,
    user,
  } = useAllExpensesState();

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-display">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                All Expenses
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Track, filter, and audit your company operational costs and spending.
              </p>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-primary text-primary-foreground font-medium shadow-xs hover:shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>

          {/* KPI Metrics Cards */}
          <ExpensesMetricsCards
            totalExpenses={totalExpenses}
            spentThisMonth={spentThisMonth}
            topCategoryName={topCategoryName}
            topCategoryAmount={topCategoryAmount}
            avgExpense={avgExpense}
            expensesCount={expenses.length}
            formatCurrency={formatCurrency}
          />

          {/* Clean Tabs Container */}
          <Tabs defaultValue="transactions" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl h-10 border border-slate-200/60 dark:border-slate-700/50 w-full sm:w-[280px]">
                <TabsTrigger
                  value="transactions"
                  className="flex-1 text-xs py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs font-semibold"
                >
                  Transactions
                </TabsTrigger>
                <TabsTrigger
                  value="monthly-report"
                  className="flex-1 text-xs py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs font-semibold"
                >
                  Monthly Report
                </TabsTrigger>
              </TabsList>
              <div className="text-xs text-muted-foreground font-medium">
                Showing <span className="font-bold text-foreground">{filteredExpenses.length}</span> of {expenses.length} records
                {filteredExpenses.length > 0 && (
                  <> • Total: <span className="font-bold text-foreground">{formatCurrency(totalFiltered)}</span></>
                )}
              </div>
            </div>

            {/* Transactions View */}
            <TabsContent value="transactions" className="space-y-4 mt-0">
              <ExpensesFilterBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                categories={categories}
              />

              <VirtualizedExpensesList
                isLoading={isLoading}
                filteredExpenses={filteredExpenses}
                searchQuery={searchQuery}
                categoryFilter={categoryFilter}
                scrollContainerRef={scrollContainerRef}
                rowVirtualizer={rowVirtualizer}
                formatCurrency={formatCurrency}
                onAddExpense={() => setIsAddDialogOpen(true)}
                onDeleteExpense={(id) => deleteExpense.mutate(id)}
              />
            </TabsContent>

            {/* Monthly Report View */}
            <TabsContent value="monthly-report" className="mt-0">
              <MonthlyExpenseReport expenses={filteredExpenses} />
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>

      <AddExpenseDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categories={categories}
        userId={user?.id || ""}
      />
    </AppLayout>
  );
};

export default AllExpenses;
