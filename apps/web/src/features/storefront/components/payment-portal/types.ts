export interface PaymentPortalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  currency: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  storeUpiId?: string;
  onPaymentSuccess: (paymentId: string, invoiceNumber: string) => void;
}

export type SimulationStep = "idle" | "opening" | "approving" | "verifying";
export type PaymentTab = "card" | "upi" | "upi_qr" | "netbanking" | "wallet";
