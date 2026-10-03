export interface WhatsAppConnection {
  id?: string;
  store_id: string;
  provider: string;
  provider_session_id: string;
  phone_number?: string | null;
  display_name?: string | null;
  status: 'disconnected' | 'connecting' | 'qr_required' | 'connected' | 'error';
  qr_code_data?: string | null;
  error_message?: string | null;
  last_connected_at?: string | null;
  last_seen_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WhatsAppMessageLog {
  id: string;
  store_id: string;
  phone_number: string;
  message_type: 'invoice' | 'receipt' | 'reminder' | 'order_confirmation' | 'custom';
  status: 'queued' | 'sent' | 'failed' | 'already_sent';
  message_content?: string | null;
  has_attachment: boolean;
  attachment_filename?: string | null;
  provider_message_id?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface SendInvoiceWhatsAppPayload {
  invoice_id?: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  amount_paid?: number;
  balance_due?: number;
  due_date?: string;
  currency_symbol?: string;
  document_base64?: string;
  document_filename?: string;
  custom_notes?: string;
  force_resend?: boolean;
  idempotency_key?: string;
}

export interface SendReceiptWhatsAppPayload {
  payment_id?: string;
  receipt_number: string;
  customer_name: string;
  customer_phone: string;
  amount_received: number;
  invoice_number?: string;
  remaining_balance?: number;
  payment_method?: string;
  currency_symbol?: string;
  document_base64?: string;
  document_filename?: string;
  custom_notes?: string;
  force_resend?: boolean;
  idempotency_key?: string;
}

export interface SendReminderWhatsAppPayload {
  party_id?: string;
  customer_name: string;
  customer_phone: string;
  outstanding_amount: number;
  invoice_number?: string;
  due_date?: string;
  currency_symbol?: string;
  custom_notes?: string;
  force_resend?: boolean;
  idempotency_key?: string;
}

export interface SendCustomMessageWhatsAppPayload {
  phone_number: string;
  message: string;
  customer_name?: string;
  document_base64?: string;
  document_filename?: string;
  message_type?: string;
  force_resend?: boolean;
  idempotency_key?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  status: string;
  message_id?: string;
  phone_number: string;
  is_duplicate?: boolean;
  detail?: string;
}
