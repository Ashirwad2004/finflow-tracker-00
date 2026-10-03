import { PurchaseOrder } from "../../types/orders";

export interface PurchaseOrderRegisterProps {
  userId: string;
  parties?: any[];
  products?: any[];
}

export interface PurchaseOrderMetrics {
  totalCount: number;
  totalValue: number;
  sentCount: number;
  sentValue: number;
  partialCount: number;
  receivedCount: number;
  totalExpectedUnits: number;
}
