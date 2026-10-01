import { UniversalPaymentDialog } from "./UniversalPaymentDialog";

export interface BillPaymentTarget {
  id: string;
  billNumber: string;
  partyName: string;
  partyGstin?: string | null;
  partyPhone?: string | null;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  date?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  paymentMethod?: string | null;
  type: "sale" | "purchase"; // 'sale' = Payment In (Receipt), 'purchase' = Payment Out (Payment Voucher)
  rawRecord: any;
}

export interface RecordBillPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillPaymentTarget | null;
  onSuccess?: (updatedRecord: any) => void;
}

export function RecordBillPaymentDialog({
  open,
  onOpenChange,
  bill,
  onSuccess,
}: RecordBillPaymentDialogProps) {
  if (!bill && !open) return null;

  return (
    <UniversalPaymentDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={bill?.type === "sale" ? "payment_in" : "payment_out"}
      initialBill={bill}
      onSuccess={onSuccess}
    />
  );
}

export { UniversalPaymentDialog };
