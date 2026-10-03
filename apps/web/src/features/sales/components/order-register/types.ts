import { SaleOrder } from "../../types/orders";

export interface SalesOrderRegisterProps {
  userId: string;
  parties?: any[];
  products?: any[];
  onOpenCreate?: () => void;
}

export interface SalesOrderMetrics {
  totalCount: number;
  totalValue: number;
  confirmedCount: number;
  confirmedValue: number;
  partialCount: number;
  deliveredCount: number;
  totalReservedUnits: number;
}
