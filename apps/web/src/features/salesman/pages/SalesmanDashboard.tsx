import React from "react";
import { Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import {
    useSalesmanDashboard,
    SalesmanLoadingScreen,
    SalesmanSuspendedScreen,
    SalesmanNoPermissionsScreen,
    SalesmanHeader,
    SalesmanMetrics,
    OrdersTab,
    ReturnsTab,
    ReturnImagePreviewDialog,
} from "../components";

export * from "../components/types";

export default function SalesmanDashboard() {
    const { formatCurrency } = useCurrency();
    const {
        currentStoreId,
        salesmanInfo,
        isLoadingSalesman,
        isSalesmanActive,
        canManageOrders,
        canManageReturns,
        businessName,
        filteredOrders,
        filteredReturns,
        stats,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        autoRefresh,
        setAutoRefresh,
        isFetchingOrders,
        isFetchingReturns,
        isLoadingOrders,
        isLoadingReturns,
        expandedOrders,
        copiedOrderId,
        previewReturnImageUrl,
        setPreviewReturnImageUrl,
        handleLogout,
        handleManualRefresh,
        handleCopyId,
        toggleExpandOrder,
        updateOrderStatus,
        updateReturnStatus,
    } = useSalesmanDashboard();

    if (isLoadingSalesman || !currentStoreId) {
        return <SalesmanLoadingScreen />;
    }

    if (!isSalesmanActive) {
        return <SalesmanSuspendedScreen onLogout={handleLogout} />;
    }

    if (!canManageOrders && !canManageReturns) {
        return <SalesmanNoPermissionsScreen onLogout={handleLogout} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
            {/* Header */}
            <SalesmanHeader
                salesmanName={salesmanInfo?.salesman_name}
                businessName={businessName}
                onLogout={handleLogout}
            />

            <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <SalesmanMetrics stats={stats} />

                {/* Controls Panel */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    {/* Search bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search orders, phone, customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/50"
                        />
                    </div>

                    {/* Auto-Refresh + Manual controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="flex items-center gap-2">
                            <Switch 
                                id="auto-refresh" 
                                checked={autoRefresh} 
                                onCheckedChange={setAutoRefresh} 
                            />
                            <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5 select-none">
                                {autoRefresh && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />}
                                Auto-refresh (10s)
                            </Label>
                        </div>

                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-850" />

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleManualRefresh}
                            className="h-10 rounded-xl border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2 font-bold text-xs"
                            disabled={isFetchingOrders || isFetchingReturns}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingOrders || isFetchingReturns ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Tabs for Orders and Returns */}
                <Tabs defaultValue={canManageOrders ? "orders" : "returns"} className="w-full">
                    {canManageOrders && canManageReturns && (
                        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full max-w-[400px] border border-slate-200/20 grid grid-cols-2 mb-4">
                            <TabsTrigger value="orders" className="rounded-lg py-2 font-bold text-xs transition-all">
                                Orders ({filteredOrders.length})
                            </TabsTrigger>
                            <TabsTrigger value="returns" className="rounded-lg py-2 font-bold text-xs transition-all">
                                Returns ({filteredReturns.length})
                            </TabsTrigger>
                        </TabsList>
                    )}

                    {/* Orders Tab */}
                    {canManageOrders && (
                        <TabsContent value="orders" className="outline-none space-y-4">
                            <OrdersTab
                                orders={filteredOrders}
                                statusFilter={statusFilter}
                                onStatusFilterChange={setStatusFilter}
                                searchQuery={searchQuery}
                                isLoading={isLoadingOrders}
                                expandedOrders={expandedOrders}
                                onToggleExpand={toggleExpandOrder}
                                copiedOrderId={copiedOrderId}
                                onCopyId={handleCopyId}
                                onUpdateStatus={(orderId, status) => updateOrderStatus.mutate({ orderId, status })}
                                isUpdatingStatus={updateOrderStatus.isPending}
                                formatCurrency={formatCurrency}
                            />
                        </TabsContent>
                    )}

                    {/* Returns Tab */}
                    {canManageReturns && (
                        <TabsContent value="returns" className="outline-none space-y-4">
                            <ReturnsTab
                                orderReturns={filteredReturns}
                                isLoading={isLoadingReturns}
                                onPreviewImage={(url) => setPreviewReturnImageUrl(url)}
                                onUpdateStatus={(returnId, status) => updateReturnStatus.mutate({ returnId, status })}
                                isUpdatingStatus={updateReturnStatus.isPending}
                                formatCurrency={formatCurrency}
                            />
                        </TabsContent>
                    )}
                </Tabs>
            </main>

            {/* Return Photo Zoom Dialog */}
            <ReturnImagePreviewDialog
                imageUrl={previewReturnImageUrl}
                onClose={() => setPreviewReturnImageUrl(null)}
            />
        </div>
    );
}
