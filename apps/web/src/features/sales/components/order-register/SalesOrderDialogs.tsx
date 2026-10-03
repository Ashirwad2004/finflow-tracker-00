import React from "react";
import { SaleOrder } from "../../types/orders";
import { CreateSaleOrderDialog } from "../CreateSaleOrderDialog";
import { ConvertOrderToInvoiceDialog } from "../ConvertOrderToInvoiceDialog";
import { ProcureItemsDialog } from "@/features/purchases/components/ProcureItemsDialog";
import { OrderTimelineDrawer } from "../OrderTimelineDrawer";

interface SalesOrderDialogsProps {
  userId: string;
  parties?: any[];
  products?: any[];
  isCreateOpen: boolean;
  onCloseCreate: () => void;
  editingOrder: SaleOrder | null;
  deliveringOrder: SaleOrder | null;
  onCloseDelivering: () => void;
  procuringOrder: SaleOrder | null;
  onCloseProcuring: () => void;
  timelineOrder: SaleOrder | null;
  onCloseTimeline: () => void;
}

export const SalesOrderDialogs: React.FC<SalesOrderDialogsProps> = ({
  userId,
  parties = [],
  products = [],
  isCreateOpen,
  onCloseCreate,
  editingOrder,
  deliveringOrder,
  onCloseDelivering,
  procuringOrder,
  onCloseProcuring,
  timelineOrder,
  onCloseTimeline,
}) => {
  return (
    <>
      <CreateSaleOrderDialog
        open={isCreateOpen}
        onOpenChange={(open) => !open && onCloseCreate()}
        saleOrderToEdit={editingOrder}
        parties={parties}
        products={products}
        userId={userId}
      />

      <ConvertOrderToInvoiceDialog
        open={!!deliveringOrder}
        onOpenChange={(open) => !open && onCloseDelivering()}
        saleOrder={deliveringOrder}
        products={products}
        userId={userId}
      />

      <ProcureItemsDialog
        open={!!procuringOrder}
        onOpenChange={(open) => !open && onCloseProcuring()}
        saleOrder={procuringOrder}
        parties={parties}
        products={products}
        userId={userId}
      />

      <OrderTimelineDrawer
        open={!!timelineOrder}
        onOpenChange={(open) => !open && onCloseTimeline()}
        saleOrder={timelineOrder}
        userId={userId}
      />
    </>
  );
};
