from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, Field


class WhatsAppConnectionResponse(BaseModel):
    id: Optional[str] = None
    store_id: str
    provider: str = "openwa"
    provider_session_id: str
    phone_number: Optional[str] = None
    display_name: Optional[str] = None
    status: str = "disconnected"  # disconnected, connecting, qr_required, connected, error
    qr_code_data: Optional[str] = None
    error_message: Optional[str] = None
    last_connected_at: Optional[str] = None
    last_seen_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class WhatsAppConnectRequest(BaseModel):
    phone_number: Optional[str] = None
    webhook_url: Optional[str] = None


class WhatsAppQRCodeResponse(BaseModel):
    status: str
    qr_code: Optional[str] = None
    message: Optional[str] = None


class WhatsAppDisconnectResponse(BaseModel):
    success: bool
    status: str
    message: str


class WhatsAppSendInvoiceRequest(BaseModel):
    invoice_id: Optional[str] = None
    invoice_number: str
    customer_name: str
    customer_phone: str
    total_amount: float
    amount_paid: float = 0.0
    balance_due: float = 0.0
    due_date: Optional[str] = None
    currency_symbol: str = "₹"
    document_base64: Optional[str] = None
    document_filename: Optional[str] = None
    custom_notes: Optional[str] = None
    force_resend: bool = False
    idempotency_key: Optional[str] = None


class WhatsAppSendReceiptRequest(BaseModel):
    payment_id: Optional[str] = None
    receipt_number: str
    customer_name: str
    customer_phone: str
    amount_received: float
    invoice_number: Optional[str] = None
    remaining_balance: float = 0.0
    payment_method: str = "Cash"
    currency_symbol: str = "₹"
    document_base64: Optional[str] = None
    document_filename: Optional[str] = None
    custom_notes: Optional[str] = None
    force_resend: bool = False
    idempotency_key: Optional[str] = None


class WhatsAppSendReminderRequest(BaseModel):
    party_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    outstanding_amount: float
    invoice_number: Optional[str] = None
    due_date: Optional[str] = None
    currency_symbol: str = "₹"
    custom_notes: Optional[str] = None
    force_resend: bool = False
    idempotency_key: Optional[str] = None


class WhatsAppSendMessageRequest(BaseModel):
    phone_number: str
    message: str
    customer_name: Optional[str] = None
    document_base64: Optional[str] = None
    document_filename: Optional[str] = None
    message_type: str = "custom"
    force_resend: bool = False
    idempotency_key: Optional[str] = None


class WhatsAppTestMessageRequest(BaseModel):
    phone_number: str
    message: Optional[str] = "Hello from FinFlow! Your business WhatsApp connection is working perfectly. 🚀"


class WhatsAppMessageLogItem(BaseModel):
    id: str
    store_id: str
    phone_number: str
    message_type: str
    status: str
    message_content: Optional[str] = None
    has_attachment: bool = False
    attachment_filename: Optional[str] = None
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    sent_at: Optional[str] = None
    created_at: str


class WhatsAppSendResponse(BaseModel):
    success: bool
    status: str  # sent, queued, failed, already_sent
    message_id: Optional[str] = None
    phone_number: str
    is_duplicate: bool = False
    detail: Optional[str] = None
