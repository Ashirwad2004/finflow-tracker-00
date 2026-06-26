from pydantic import BaseModel
from typing import Optional

class BillingEvent(BaseModel):
    event_type: str         # e.g. "invoice_created"
    customer_id: str
    customer_name: str
    customer_phone: str
    customer_timezone: str  # e.g. "Asia/Kolkata"
    invoice_number: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    payment_link: Optional[str] = None
    transaction_id: Optional[str] = None
    failure_reason: Optional[str] = None
    plan_name: Optional[str] = None
    expiry_date: Optional[str] = None
    refund_amount: Optional[float] = None
    days_remaining: Optional[int] = None
    overdue_days: Optional[int] = None
