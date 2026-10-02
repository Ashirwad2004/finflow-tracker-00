import { SalesSettings } from "@/core/hooks/use-sales-settings";

export interface InvoicePreviewProps {
  invoice: any;
  profile?: any;
  salesSettings?: SalesSettings;
  onEdit?: () => void;
  onClose: () => void;
  isDraft?: boolean;
  onSave?: () => Promise<void> | void;
}
