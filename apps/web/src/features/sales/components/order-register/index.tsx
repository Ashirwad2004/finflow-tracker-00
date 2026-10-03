import React from "react";
import { SalesOrderRegisterProps } from "./types";
import { useSalesOrderRegister } from "./useSalesOrderRegister";
import { SalesOrderMetricsCards } from "./SalesOrderMetricsCards";
import { SalesOrderActionBar } from "./SalesOrderActionBar";
import { SalesOrderTable } from "./SalesOrderTable";
import { SalesOrderDialogs } from "./SalesOrderDialogs";

export * from "./types";
export * from "./useSalesOrderRegister";
export * from "./SalesOrderMetricsCards";
export * from "./SalesOrderActionBar";
export * from "./SalesOrderTable";
export * from "./SalesOrderDialogs";

export const SalesOrderRegister: React.FC<SalesOrderRegisterProps> = ({
  userId,
  parties = [],
  products = [],
  onOpenCreate,
}) => {
  const {
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredOrders,
    metrics,
    handleDelete,
    handleDownloadPDF,
    handlePreviewPDF,
    isCreateOpen,
    setIsCreateOpen,
    editingOrder,
    setEditingOrder,
    deliveringOrder,
    setDeliveringOrder,
    procuringOrder,
    setProcuringOrder,
    timelineOrder,
    setTimelineOrder,
  } = useSalesOrderRegister(userId);

  const handleCreateClick = () => {
    if (onOpenCreate) {
      onOpenCreate();
    } else {
      setEditingOrder(null);
      setIsCreateOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <SalesOrderMetricsCards metrics={metrics} />

      {/* Action Bar: Search, Filters, Create Button */}
      <SalesOrderActionBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenCreate={handleCreateClick}
      />

      {/* Orders Table */}
      <SalesOrderTable
        orders={filteredOrders}
        isLoading={isLoading}
        onOpenCreate={handleCreateClick}
        onDeliver={setDeliveringOrder}
        onProcure={setProcuringOrder}
        onTimeline={setTimelineOrder}
        onPreviewPDF={handlePreviewPDF}
        onDownloadPDF={handleDownloadPDF}
        onEdit={(order) => {
          setEditingOrder(order);
          setIsCreateOpen(true);
        }}
        onDelete={handleDelete}
      />

      {/* Dialogs */}
      <SalesOrderDialogs
        userId={userId}
        parties={parties}
        products={products}
        isCreateOpen={isCreateOpen}
        onCloseCreate={() => setIsCreateOpen(false)}
        editingOrder={editingOrder}
        deliveringOrder={deliveringOrder}
        onCloseDelivering={() => setDeliveringOrder(null)}
        procuringOrder={procuringOrder}
        onCloseProcuring={() => setProcuringOrder(null)}
        timelineOrder={timelineOrder}
        onCloseTimeline={() => setTimelineOrder(null)}
      />
    </div>
  );
};

export default SalesOrderRegister;
