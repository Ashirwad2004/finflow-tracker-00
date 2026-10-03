import { SaleOrder } from "../../types/orders";

export interface ProcureItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleOrder: SaleOrder | null;
  parties?: any[];
  products?: any[];
  userId: string;
}

export interface ProcureRow {
  item_id?: string;
  product_id?: string;
  name: string;
  ordered_qty: number;
  already_procured: number;
  remaining_qty: number;
  procure_qty: number;
  price: number;
  tax_rate: number;
  unit: string;
  hsn_code?: string;
  selected: boolean;
}
