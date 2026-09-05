from typing import Literal, Optional
from pydantic import BaseModel, Field

class OrderCreate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    currency: Literal["INR"] = "INR"
    receipt: Optional[str] = Field(default=None, max_length=100)
    customerName: Optional[str] = Field(default="Valued Customer", max_length=200)
    customerPhone: Optional[str] = Field(default="9999999999", max_length=30)
    orderId: Optional[str] = Field(default=None, max_length=100)
    idempotencyKey: Optional[str] = Field(default=None, max_length=100)

class OrderCancel(BaseModel):
    orderId: str = Field(min_length=1, max_length=100)
    customerPhone: Optional[str] = Field(default=None, max_length=30)

class SubscriptionOrderCreate(BaseModel):
    planId: Literal["starter", "pro", "business", "premium"]
    billingCycle: Literal["monthly", "annual"]
    couponCode: Optional[str] = Field(default=None, max_length=40)
    idempotencyKey: Optional[str] = Field(default=None, max_length=100)
    customerName: Optional[str] = Field(default="FinFlow User", max_length=200)
    customerPhone: Optional[str] = Field(default="9999999999", max_length=30)

class PaymentVerify(BaseModel):
    razorpay_order_id: Optional[str] = None
    gatewayOrderId: Optional[str] = None
    order_id: Optional[str] = None
    
    razorpay_payment_id: Optional[str] = None
    gatewayPaymentId: Optional[str] = None
    payment_id: Optional[str] = None
    
    razorpay_signature: Optional[str] = None
    gatewaySignature: Optional[str] = None
    signature: Optional[str] = None
    
    planId: Optional[str] = None
    billingCycle: Optional[str] = None

class PaymentRefund(BaseModel):
    paymentId: str = Field(min_length=1, max_length=100)
    amount: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    reason: Optional[str] = Field(default=None, max_length=500)