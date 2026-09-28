from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InvoiceItemInput(BaseModel):
    id: Optional[str] = None
    product_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: float = Field(gt=0, default=1.0)
    price: float = Field(ge=0, default=0.0)
    discount: float = Field(ge=0, le=100, default=0.0)
    tax_rate: Optional[float] = Field(ge=0, default=None)
    unit: Optional[str] = "pc"
    hsn_code: Optional[str] = ""


class InvoiceCreateRequest(BaseModel):
    party_id: Optional[str] = None
    customer_name: Optional[str] = "Cash Customer"
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    items: List[InvoiceItemInput] = Field(min_length=1)
    overall_discount: float = Field(ge=0, le=100, default=0.0)
    tax_rate: float = Field(ge=0, default=0.0)
    is_item_wise_tax: bool = False
    round_off: bool = True
    status: str = Field(pattern="^(paid|partial|pending|overdue)$", default="paid")
    amount_paid: float = Field(ge=0, default=0.0)
    payment_method: Optional[str] = "cash"
    notes: Optional[str] = None
    document_type: str = "invoice"
    invoice_number_prefix: Optional[str] = "INV-"
    custom_invoice_number: Optional[str] = None


class InvoiceUpdateRequest(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = Field(pattern="^(paid|partial|pending|cancelled|overdue)$", default=None)
    amount_paid: Optional[float] = Field(ge=0, default=None)
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    success: bool = True
    id: str
    invoice_number: str
    party_id: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    subtotal: float
    discount_amount: float
    tax_rate: Optional[float] = 0.0
    tax_amount: float
    total_amount: float
    amount_paid: float
    balance_due: float
    status: str
    payment_method: Optional[str] = None
    document_type: Optional[str] = "invoice"
    items: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None
