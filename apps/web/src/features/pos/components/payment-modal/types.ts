import { POSPaymentMethodType, POSSplitPaymentBreakdown } from "../../types";

export interface POSPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  customerName: string;
  upiId?: string;
  businessName?: string;
  onCompleteSale: (params: {
    paymentMethod: POSPaymentMethodType;
    amountPaid: number;
    splitBreakdown?: POSSplitPaymentBreakdown;
    notes?: string;
    idempotencyKey: string;
  }) => Promise<void>;
}
