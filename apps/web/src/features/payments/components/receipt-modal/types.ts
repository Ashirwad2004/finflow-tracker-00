import { PaymentReceiptDetails } from "@/utils/generatePaymentReceiptPDF";

export type { PaymentReceiptDetails };
export type PaymentVoucherDetails = PaymentReceiptDetails;

export interface PaymentReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData?: PaymentReceiptDetails | null;
  voucher?: PaymentReceiptDetails | null;
  voucherId?: string;
  linkedBillId?: string;
  onDeleteVoucher?: (
    voucherNumber: string,
    voucherId?: string,
    linkedBillId?: string
  ) => Promise<void>;
}
