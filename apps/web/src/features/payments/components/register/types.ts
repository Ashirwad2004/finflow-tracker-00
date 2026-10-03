import { PaymentReceiptDetails } from "@/utils/generatePaymentReceiptPDF";

export type PaymentRegisterType = "in" | "out";

export interface PaymentRegisterMetrics {
  totalAmount: number;
  cashAmount: number;
  onlineAmount: number;
  count: number;
}

export interface PaymentInRegisterProps {
  sales: any[];
  parties: any[];
  profile?: any;
  onOpenRecordPaymentIn: () => void;
  onOpenTranscript?: (saleRecord: any) => void;
  onPreviewInvoice?: (saleRecord: any) => void;
}

export interface PaymentOutRegisterProps {
  purchases: any[];
  parties: any[];
  profile?: any;
  onOpenRecordPaymentOut: () => void;
  onOpenTranscript?: (purchaseRecord: any) => void;
  onPreviewPurchase?: (purchaseRecord: any) => void;
}

export interface ActiveReceiptModalState {
  data: PaymentReceiptDetails;
  voucherId?: string;
  linkedBillId?: string;
}
