import React from "react";
import { PurchaseOrderRegisterProps } from "./types";
import { usePurchaseOrderRegister } from "./usePurchaseOrderRegister";
import { PurchaseOrderMetricsCards } from "./PurchaseOrderMetricsCards";
import { PurchaseOrderActionBar } from "./PurchaseOrderActionBar";
import { PurchaseOrderTable } from "./PurchaseOrderTable";
import { PurchaseOrderDialogs } from "./PurchaseOrderDialogs";

export * from "./types";
export * from "./usePurchaseOrderRegister";
export * from "./PurchaseOrderMetricsCards";
export * from "./PurchaseOrderActionBar";
export * from "./PurchaseOrderTable";
export * from "./PurchaseOrderDialogs";

export const PurchaseOrderRegister: React.FC<PurchaseOrderRegisterProps> = ({
  userId,
  parties = [],
  products = [],
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
    receivingOrder,
    setReceivingOrder,
    timelineOrder,
    setTimelineOrder,
  } = usePurchaseOrderRegister(userId);

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <PurchaseOrderMetricsCards metrics={metrics} />

      {/* Action Bar */}
      <PurchaseOrderActionBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenCreate={() => {
          setEditingOrder(null);
          setIsCreateOpen(true);
        }}
      />

      {/* Orders Table */}
      <PurchaseOrderTable
        orders={filteredOrders}
        isLoading={isLoading}
        onOpenCreate={() => {
          setEditingOrder(null);
          setIsCreateOpen(true);
        }}
        onReceive={setReceivingOrder}
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
      <PurchaseOrderDialogs
        userId={userId}
        parties={parties}
        products={products}
        isCreateOpen={isCreateOpen}
        onCloseCreate={() => setIsCreateOpen(false)}
        editingOrder={editingOrder}
        receivingOrder={receivingOrder}
        onCloseReceiving={() => setReceivingOrder(null)}
        timelineOrder={timelineOrder}
        onCloseTimeline={() => setTimelineOrder(null)}
      />
    </div>
  );
};

export default PurchaseOrderRegister;
