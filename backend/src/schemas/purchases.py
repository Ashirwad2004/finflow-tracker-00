from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PurchaseItemInput(BaseModel):
    id: Optional[str] = None
    product_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: float = Field(gt=0, default=1.0)
    price: float = Field(ge=0, default=0.0)
    discount: float = Field(ge=0, le=100, default=0.0)
    tax_rate: Optional[float] = Field(ge=0, default=None)
    unit: Optional[str] = "pc"


class PurchaseCreateRequest(BaseModel):
    party_id: Optional[str] = None
    vendor_name: str = Field(min_length=1)
    vendor_phone: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    bill_number: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    items: List[PurchaseItemInput] = Field(min_length=1)
    discount_amount: float = Field(ge=0, default=0.0)
    tax_rate: float = Field(ge=0, default=0.0)
    status: str = Field(pattern="^(paid|partial|pending|overdue)$", default="paid")
    amount_paid: float = Field(ge=0, default=0.0)
    notes: Optional[str] = None
    attachment_url: Optional[str] = None


class PurchaseResponse(BaseModel):
    success: bool = True
    id: str
    party_id: Optional[str] = None
    bill_number: Optional[str] = None
    vendor_name: str
    vendor_phone: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    subtotal: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    tax_rate: Optional[float] = 0.0
    tax_amount: Optional[float] = 0.0
    total_amount: float
    amount_paid: float
    balance_due: float
    status: str
    items: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None
    attachment_url: Optional[str] = None
