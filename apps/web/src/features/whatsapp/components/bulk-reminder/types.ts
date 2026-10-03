export interface OverdueInvoiceItem {
  id?: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string | null;
  total_amount: number;
  amount_paid?: number;
  balance_due?: number;
  due_date?: string | null;
  party_id?: string | null;
}

export interface BulkWhatsAppReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: OverdueInvoiceItem[];
  currencySymbol?: string;
  onSuccess?: () => void;
  onOpenSettings?: () => void;
}

export type SendItemStatus = "idle" | "sending" | "success" | "failed";

export interface OverdueRowState {
  invoice: OverdueInvoiceItem;
  selected: boolean;
  status: SendItemStatus;
  error?: string;
  resultMessageId?: string;
}
