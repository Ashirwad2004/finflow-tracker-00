import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OrderTimelineDrawerProps } from "./types";
import { useSaleOrderRelations, usePurchaseOrderRelations } from "../../hooks/useOrders";
import { SaleOrderTimeline } from "./SaleOrderTimeline";
import { PurchaseOrderTimeline } from "./PurchaseOrderTimeline";

export const OrderTimelineDrawer: React.FC<OrderTimelineDrawerProps> = ({
  open,
  onOpenChange,
  saleOrder,
  purchaseOrder,
  userId,
}) => {
  const isSaleOrder = !!saleOrder;
  const isPurchaseOrder = !!purchaseOrder;

  const { data: soRelations } = useSaleOrderRelations(saleOrder?.id, userId);
  const { data: poRelations } = usePurchaseOrderRelations(purchaseOrder?.id, userId);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Document Lifecycle & Order Timeline</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit-ready lineage showing linked procurement POs, delivery invoices, and stock reservations.
          </DialogDescription>
        </div>

        <div className="p-6">
          {isSaleOrder && saleOrder && (
            <SaleOrderTimeline order={saleOrder} soRelations={soRelations} />
          )}
          {isPurchaseOrder && purchaseOrder && (
            <PurchaseOrderTimeline order={purchaseOrder} poRelations={poRelations} />
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
