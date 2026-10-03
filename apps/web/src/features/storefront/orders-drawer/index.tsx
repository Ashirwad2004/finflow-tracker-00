import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { PackageOpen, X, Loader2, AlertCircle } from "lucide-react";
import { OrdersDrawerProps } from "./types";
import { useOrdersDrawer } from "./useOrdersDrawer";
import { OrderItemCard } from "./OrderItemCard";
import { OrderReturnDialog } from "./OrderReturnDialog";

export * from "./types";
export * from "./useOrdersDrawer";
export * from "./OrderItemCard";
export * from "./OrderReturnDialog";

export const OrdersDrawer: React.FC<OrdersDrawerProps> = ({
  open,
  onClose,
  formatCurrency,
  storeId,
  savedOrderIds,
  merchantProfile,
  onPayOrder,
}) => {
  const {
    orders,
    isLoading,
    queryError,
    savedPhone,
    isReturnDialogOpen,
    setIsReturnDialogOpen,
    returnReason,
    setReturnReason,
    returnPreview,
    setReturnFile,
    setReturnPreview,
    isSubmittingReturn,
    isWithin24Hours,
    handleDownloadInvoice,
    handleReturnSubmit,
    openReturnModal,
  } = useOrdersDrawer(open, storeId, savedOrderIds, merchantProfile);

  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-300 data-[state=open]:duration-500">
            <DialogPrimitive.Title className="sr-only">My Orders</DialogPrimitive.Title>

            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-black text-slate-900">My Orders</h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {!savedPhone && !savedOrderIds.length ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                    <PackageOpen className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-400 text-sm">No orders yet</p>
                  <p className="text-xs text-slate-300 text-center">
                    Place an order to get started. Your order history will appear here and be accessible from any device using the same phone number.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  <p className="text-xs text-slate-400">Loading your orders...</p>
                </div>
              ) : queryError ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-300" />
                  </div>
                  <p className="font-semibold text-red-600 text-sm">Could not load orders</p>
                  <p className="text-xs text-slate-400 text-center">
                    {String(queryError) || "Please try again later."}
                  </p>
                </div>
              ) : !orders || orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                    <PackageOpen className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-400 text-sm">No orders found</p>
                  <p className="text-xs text-slate-300 text-center">
                    Your order history will show here. Orders are linked to your phone number, so you can see them from any device.
                  </p>
                </div>
              ) : (
                orders.map((order) => (
                  <OrderItemCard
                    key={order.id}
                    order={order}
                    formatCurrency={formatCurrency}
                    isWithin24Hours={isWithin24Hours}
                    onDownloadInvoice={handleDownloadInvoice}
                    onRequestReturn={openReturnModal}
                    onPayOrder={onPayOrder}
                  />
                ))
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <OrderReturnDialog
        open={isReturnDialogOpen}
        onOpenChange={setIsReturnDialogOpen}
        returnReason={returnReason}
        setReturnReason={setReturnReason}
        returnPreview={returnPreview}
        setReturnFile={setReturnFile}
        setReturnPreview={setReturnPreview}
        isSubmitting={isSubmittingReturn}
        onSubmit={handleReturnSubmit}
      />
    </>
  );
};

export default OrdersDrawer;
