import { SaleOrder, PurchaseOrder } from "../../types/orders";

export interface OrderTimelineDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleOrder?: SaleOrder | null;
  purchaseOrder?: PurchaseOrder | null;
  userId: string;
}
