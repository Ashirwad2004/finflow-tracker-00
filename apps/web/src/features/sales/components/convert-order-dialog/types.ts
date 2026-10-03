import { SaleOrder } from "../../types/orders";

export interface ConvertOrderToInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleOrder: SaleOrder | null;
  products?: any[];
  userId: string;
}

export interface DeliveryRow {
  item_id?: string;
  product_id?: string;
  name: string;
  ordered_qty: number;
  already_delivered: number;
  remaining_qty: number;
  deliver_qty: number;
  price: number;
  tax_rate: number;
  unit: string;
  hsn_code?: string;
  selected: boolean;
}
