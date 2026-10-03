import { PurchaseOrder } from "../../types/orders";

export interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderToEdit?: PurchaseOrder | null;
  parties?: any[];
  products?: any[];
  userId: string;
}
