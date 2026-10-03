import React from "react";
import { PurchaseOrder } from "../../types/orders";
import { CreatePurchaseOrderDialog } from "../CreatePurchaseOrderDialog";
import { ConvertOrderToBillDialog } from "../ConvertOrderToBillDialog";
import { OrderTimelineDrawer } from "@/features/sales/components/OrderTimelineDrawer";

interface PurchaseOrderDialogsProps {
  userId: string;
  parties?: any[];
  products?: any[];
  isCreateOpen: boolean;
  onCloseCreate: () => void;
  editingOrder: PurchaseOrder | null;
  receivingOrder: PurchaseOrder | null;
  onCloseReceiving: () => void;
  timelineOrder: PurchaseOrder | null;
  onCloseTimeline: () => void;
}

export const PurchaseOrderDialogs: React.FC<PurchaseOrderDialogsProps> = ({
  userId,
  parties = [],
  products = [],
  isCreateOpen,
  onCloseCreate,
  editingOrder,
  receivingOrder,
  onCloseReceiving,
  timelineOrder,
  onCloseTimeline,
}) => {
  return (
    <>
      <CreatePurchaseOrderDialog
        open={isCreateOpen}
        onOpenChange={(open) => !open && onCloseCreate()}
        purchaseOrderToEdit={editingOrder}
        parties={parties}
        products={products}
        userId={userId}
      />

      <ConvertOrderToBillDialog
        open={!!receivingOrder}
        onOpenChange={(open) => !open && onCloseReceiving()}
        purchaseOrder={receivingOrder}
        products={products}
        userId={userId}
      />

      <OrderTimelineDrawer
        open={!!timelineOrder}
        onOpenChange={(open) => !open && onCloseTimeline()}
        purchaseOrder={timelineOrder}
        userId={userId}
      />
    </>
  );
};
