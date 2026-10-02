import { SaleOrder, SaleOrderItem } from "../../types/orders";

export interface CreateSaleOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleOrderToEdit?: SaleOrder | null;
    parties?: any[];
    products?: any[];
    userId: string;
}

export type { SaleOrder, SaleOrderItem };
