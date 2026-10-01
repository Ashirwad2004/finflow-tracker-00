from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class POSSaleItemSchema(BaseModel):
    id: Optional[str] = None
    product_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    quantity: float = Field(gt=0, description="Quantity sold, supports decimals")
    price: float = Field(ge=0, description="Selling unit price")
    discount: float = Field(default=0.0, ge=0, le=100, description="Line discount percentage")
    tax_rate: float = Field(default=0.0, ge=0, description="GST / Tax percentage")
    unit: Optional[str] = "pc"
    hsn_code: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class POSSaleCreateRequest(BaseModel):
    terminal_id: Optional[str] = None
    shift_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    customer_name: Optional[str] = "Walk-in Customer"
    customer_phone: Optional[str] = None
    party_id: Optional[str] = None
    items: List[POSSaleItemSchema] = Field(min_length=1)
    discount_amount: float = Field(default=0.0, ge=0.0)
    payment_method: str = Field(default="cash")
    amount_paid: float = Field(default=0.0, ge=0.0)
    notes: Optional[str] = None
    offline_invoice_number: Optional[str] = None
    is_offline_sync: bool = False

    model_config = ConfigDict(extra="ignore")


class POSReturnItemSchema(BaseModel):
    original_sale_item_id: Optional[str] = None
    product_id: Optional[str] = None
    product_name: str
    quantity: float = Field(gt=0, description="Quantity returned")
    unit_price: float = Field(ge=0, description="Original unit selling price")
    tax_rate: float = Field(default=0.0, ge=0)
    restock_inventory: bool = True

    model_config = ConfigDict(extra="ignore")


class POSReturnRequest(BaseModel):
    sale_id: str
    shift_id: Optional[str] = None
    return_items: List[POSReturnItemSchema] = Field(min_length=1)
    refund_method: str = Field(default="cash")
    reason: str = Field(min_length=1)

    model_config = ConfigDict(extra="ignore")


class POSShiftOpenRequest(BaseModel):
    terminal_id: Optional[str] = None
    opening_cash: float = Field(default=0.0, ge=0.0)
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class POSShiftCloseRequest(BaseModel):
    actual_cash: float = Field(ge=0.0)
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class POSCashMovementRequest(BaseModel):
    shift_id: str
    type: str = Field(pattern="^(cash_in|cash_out)$")
    amount: float = Field(gt=0.0)
    reason: str = Field(min_length=1)

    model_config = ConfigDict(extra="ignore")


class BarcodeGenerateRequest(BaseModel):
    product_id: Optional[str] = None
    barcode_type: str = Field(default="code128", pattern="^(code128|ean13|upca|qr)$")
    prefix: Optional[str] = "FF"

    model_config = ConfigDict(extra="ignore")


class BarcodeBulkGenerateRequest(BaseModel):
    product_ids: Optional[List[str]] = None
    barcode_type: str = Field(default="code128", pattern="^(code128|ean13|upca)$")
    prefix: Optional[str] = "FF"

    model_config = ConfigDict(extra="ignore")


class BarcodeValidateRequest(BaseModel):
    barcode: str
    barcode_type: str = Field(default="code128", pattern="^(code128|ean13|upca|qr)$")
    product_id: Optional[str] = None

    model_config = ConfigDict(extra="ignore")
