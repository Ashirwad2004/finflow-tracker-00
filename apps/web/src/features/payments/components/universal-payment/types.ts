import { BillPaymentTarget } from "../RecordBillPaymentDialog";

export interface UniversalPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "payment_in" | "payment_out"; // 'payment_in' = Sales Receipt, 'payment_out' = Purchase Payment
  initialType?: "in" | "out"; // Convenience alias: 'in' => 'payment_in', 'out' => 'payment_out'
  initialBill?: BillPaymentTarget | null;
  initialBillId?: string | null;
  initialPartyId?: string | null;
  initialPartyName?: string | null;
  onSuccess?: (result?: any) => void;
}
