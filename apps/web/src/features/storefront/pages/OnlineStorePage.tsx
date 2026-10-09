import React, { useState } from "react";
import { ShoppingBag, CreditCard } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useBusiness } from "@/core/contexts/BusinessContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateFilterPeriod } from "../types";
import {
  useOnlineOrders,
  useStorePayments,
  usePaymentSettings,
  useStoreReturns,
  useStoreSalesmen,
} from "../hooks";
import {
  StoreMetricsCards,
  OrdersTab,
  PaymentsTab,
  RefundsTab,
  ReturnsTab,
  SalesmenTab,
  RevenueAnalyticsTab,
  PaymentAuditTab,
  PaymentSettingsTab,
  RefundDialog,
  ReturnImagePreviewDialog,
} from "../components";

export default function OnlineStorePage() {
  const { currentStoreId, isSalesman } = useBusiness();
  const { formatCurrency } = useCurrency();
  const [dateFilter, setDateFilter] = useState<DateFilterPeriod>("month");

  // Payment search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Refund dialog states
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundTargetId, setRefundTargetId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  // 1. Orders hook
  const {
    orders,
    isLoadingOrders,
    autoRefresh,
    setAutoRefresh,
    pendingCount,
    updateOrderStatus,
    metrics,
  } = useOnlineOrders(currentStoreId, dateFilter);

  // 2. Payments hook
  const {
    paymentsHistory,
    isLoadingHistory,
    refetchHistory,
    analyticsData,
    isLoadingStats,
    auditLogs,
    isLoadingLogs,
    storeProfile,
    refundPayment,
    chartData,
  } = useStorePayments({
    currentStoreId,
    isSalesman,
    searchQuery,
    statusFilter,
  });

  // 3. Payment settings hook
  const {
    payUpiId,
    setPayUpiId,
    payGateway,
    setPayGateway,
    payRazorpayKeyId,
    setPayRazorpayKeyId,
    payStripeKey,
    setPayStripeKey,
    payOnlineEnabled,
    setPayOnlineEnabled,
    isLoadingPaySettings,
    savePaymentSettings,
  } = usePaymentSettings({
    currentStoreId,
    isSalesman,
  });

  // 4. Returns hook
  const {
    orderReturns,
    isLoadingReturns,
    isFetchingReturns,
    refetchReturns,
    returnsRefreshInterval,
    setReturnsRefreshInterval,
    lastUpdatedReturns,
    previewReturnImageUrl,
    setPreviewReturnImageUrl,
    updateReturnStatus,
  } = useStoreReturns(currentStoreId);

  // 5. Salesmen hook
  const {
    salesmen,
    isLoadingSalesmen,
    newSalesmanOrders,
    setNewSalesmanOrders,
    newSalesmanReturns,
    setNewSalesmanReturns,
    addSalesman,
    updateSalesmanSettings,
    removeSalesman,
  } = useStoreSalesmen({
    currentStoreId,
    isSalesman,
  });

  // Handle refund submit
  const triggerRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTargetId) return;

    refundPayment.mutate({
      paymentId: refundTargetId,
      amount: refundAmount ? Number(refundAmount) : undefined,
      reason: refundReason,
    });

    setIsRefundOpen(false);
    setRefundTargetId(null);
    setRefundReason("");
    setRefundAmount("");
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-primary" />
              Online Store
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your public storefront and incoming online orders
            </p>
          </div>
          {!isSalesman && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Showing:</span>
              <Select value={dateFilter} onValueChange={(v: DateFilterPeriod) => setDateFilter(v)}>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* SaaS Metrics Dashboard */}
        {!isSalesman && (
          <StoreMetricsCards
            filteredSales={metrics.filteredSales}
            filteredOrdersCount={metrics.filteredOrdersCount}
            avgOrderValue={metrics.avgOrderValue}
            filteredDeliveryFee={metrics.filteredDeliveryFee}
            formatCurrency={formatCurrency}
          />
        )}

        <div className="flex-1">
          <Tabs defaultValue="orders" className="w-full space-y-6">
            <TabsList
              className={`grid h-12 w-full bg-muted/65 p-1 rounded-xl border ${
                isSalesman ? "grid-cols-2 max-w-xs" : "grid-cols-8 max-w-6xl"
              }`}
            >
              <TabsTrigger value="orders" className="rounded-lg text-xs font-semibold">
                Orders
              </TabsTrigger>
              {!isSalesman && (
                <>
                  <TabsTrigger value="payments" className="rounded-lg text-xs font-semibold">
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value="refunds" className="rounded-lg text-xs font-semibold">
                    Refunds
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="returns" className="rounded-lg text-xs font-semibold">
                Returns
              </TabsTrigger>
              {!isSalesman && (
                <>
                  <TabsTrigger value="salesmen" className="rounded-lg text-xs font-semibold">
                    Salesmen
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="rounded-lg text-xs font-semibold">
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="rounded-lg text-xs font-semibold">
                    Audit
                  </TabsTrigger>
                  <TabsTrigger value="pay-settings" className="rounded-lg text-xs font-semibold">
                    <CreditCard className="w-3 h-3 mr-1" /> Pay Setup
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* 1. INCOMING ORDERS TAB */}
            <TabsContent value="orders">
              <OrdersTab
                orders={orders}
                isLoadingOrders={isLoadingOrders}
                pendingCount={pendingCount}
                autoRefresh={autoRefresh}
                setAutoRefresh={setAutoRefresh}
                onRefresh={() => refetchHistory()}
                formatCurrency={formatCurrency}
                onStatusChange={(id, status) => updateOrderStatus.mutate({ orderId: id, status })}
                isUpdatingStatus={updateOrderStatus.isPending}
              />
            </TabsContent>

            {/* 2. PAYMENTS LEDGER TAB */}
            {!isSalesman && (
              <TabsContent value="payments">
                <PaymentsTab
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  paymentsHistory={paymentsHistory}
                  isLoadingHistory={isLoadingHistory}
                  storeProfile={storeProfile}
                  formatCurrency={formatCurrency}
                  onOpenRefund={(pId, pAmt) => {
                    setRefundTargetId(pId);
                    setRefundAmount(pAmt);
                    setIsRefundOpen(true);
                  }}
                />
              </TabsContent>
            )}

            {/* 3. REFUNDS HISTORY TAB */}
            {!isSalesman && (
              <TabsContent value="refunds">
                <RefundsTab
                  paymentsHistory={paymentsHistory}
                  isLoadingHistory={isLoadingHistory}
                  formatCurrency={formatCurrency}
                />
              </TabsContent>
            )}

            {/* 4. RETURNS MANAGEMENT TAB */}
            <TabsContent value="returns">
              <ReturnsTab
                orderReturns={orderReturns}
                isLoadingReturns={isLoadingReturns}
                isFetchingReturns={isFetchingReturns}
                returnsRefreshInterval={returnsRefreshInterval}
                setReturnsRefreshInterval={setReturnsRefreshInterval}
                lastUpdatedReturns={lastUpdatedReturns}
                onRefreshReturns={() => refetchReturns()}
                onPreviewImage={(url) => setPreviewReturnImageUrl(url)}
                onUpdateReturnStatus={(returnId, status) => updateReturnStatus.mutate({ returnId, status })}
                isUpdatingReturn={updateReturnStatus.isPending}
                formatCurrency={formatCurrency}
              />
            </TabsContent>

            {/* 5. SALESMEN MANAGEMENT TAB */}
            {!isSalesman && (
              <TabsContent value="salesmen">
                <SalesmenTab
                  salesmen={salesmen}
                  isLoadingSalesmen={isLoadingSalesmen}
                  newSalesmanOrders={newSalesmanOrders}
                  setNewSalesmanOrders={setNewSalesmanOrders}
                  newSalesmanReturns={newSalesmanReturns}
                  setNewSalesmanReturns={setNewSalesmanReturns}
                  onAddSalesman={(data) => addSalesman.mutate(data)}
                  isAddingSalesman={addSalesman.isPending}
                  onUpdateSalesmanSettings={(data) => updateSalesmanSettings.mutate(data)}
                  isUpdatingSalesman={updateSalesmanSettings.isPending}
                  onRemoveSalesman={(id) => removeSalesman.mutate(id)}
                  isRemovingSalesman={removeSalesman.isPending}
                />
              </TabsContent>
            )}

            {/* 6. REVENUE ANALYTICS TAB */}
            {!isSalesman && (
              <TabsContent value="analytics">
                <RevenueAnalyticsTab
                  isLoadingStats={isLoadingStats}
                  analyticsData={analyticsData}
                  chartData={chartData}
                />
              </TabsContent>
            )}

            {/* 7. PAYMENT AUDIT LOGS TAB */}
            {!isSalesman && (
              <TabsContent value="audit">
                <PaymentAuditTab auditLogs={auditLogs} isLoadingLogs={isLoadingLogs} />
              </TabsContent>
            )}

            {/* 8. PAYMENT SETTINGS TAB */}
            {!isSalesman && (
              <TabsContent value="pay-settings">
                <PaymentSettingsTab
                  isLoadingPaySettings={isLoadingPaySettings}
                  payOnlineEnabled={payOnlineEnabled}
                  setPayOnlineEnabled={setPayOnlineEnabled}
                  payUpiId={payUpiId}
                  setPayUpiId={setPayUpiId}
                  payGateway={payGateway}
                  setPayGateway={setPayGateway}
                  payRazorpayKeyId={payRazorpayKeyId}
                  setPayRazorpayKeyId={setPayRazorpayKeyId}
                  payStripeKey={payStripeKey}
                  setPayStripeKey={setPayStripeKey}
                  onSavePaymentSettings={() => savePaymentSettings.mutate()}
                  isSaving={savePaymentSettings.isPending}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Refund Validation Dialog */}
      <RefundDialog
        open={isRefundOpen}
        onOpenChange={setIsRefundOpen}
        refundAmount={refundAmount}
        setRefundAmount={setRefundAmount}
        refundReason={refundReason}
        setRefundReason={setRefundReason}
        onSubmit={triggerRefundSubmit}
        isPending={refundPayment.isPending}
      />

      {/* Return Photo Fullscreen Dialog */}
      <ReturnImagePreviewDialog
        imageUrl={previewReturnImageUrl}
        onClose={() => setPreviewReturnImageUrl(null)}
      />
    </>
  );
}
