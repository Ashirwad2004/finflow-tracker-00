from typing import Optional
from pydantic import BaseModel, Field


class PartyCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    type: str = Field(pattern="^(customer|vendor|both)$", default="customer")
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    opening_balance: float = Field(default=0.0)
    opening_balance_type: str = Field(pattern="^(to_receive|to_pay)$", default="to_receive")
    notes: Optional[str] = None


class PartyUpdateRequest(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    opening_balance: Optional[float] = None
    opening_balance_type: Optional[str] = None
    notes: Optional[str] = None


class PartyResponse(BaseModel):
    id: str
    user_id: str
    name: str
    type: str
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    opening_balance: float = 0.0
    opening_balance_type: Optional[str] = "to_receive"
    current_balance: Optional[float] = 0.0
    total_sales: Optional[float] = 0.0
    total_purchases: Optional[float] = 0.0
