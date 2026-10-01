export type BackupFormat = "json" | "csv";

export interface BusinessStoreSettings {
  storeName?: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  gstin?: string;
  panNumber?: string;
  showPartyPendingBalance?: boolean;
  showPartyPreviousBalance?: boolean;
  enableHsnCode?: boolean;
  enableItemWiseTax?: boolean;
  showItemTaxRateOnBill?: boolean;
  gstMode?: "cgst_sgst" | "igst" | "exempt";
  roundOffTotal?: boolean;
  autoSendWhatsAppOnInvoice?: boolean;
}

export interface NotificationSettingsData {
  lowStockAlerts: boolean;
  overduePaymentAlerts: boolean;
  dailySummaryEmails: boolean;
  whatsAppNotifications: boolean;
}
