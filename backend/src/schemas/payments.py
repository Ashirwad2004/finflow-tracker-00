from typing import Optional
from pydantic import BaseModel

class OrderCreate(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = "INR"
    receipt: Optional[str] = None
    customerName: Optional[str] = "Valued Customer"
    customerPhone: Optional[str] = "9999999999"
    orderId: Optional[str] = None
    idempotencyKey: Optional[str] = None

class OrderCancel(BaseModel):
    orderId: str

class SubscriptionOrderCreate(BaseModel):
    planId: str
    billingCycle: str
    userId: str
    couponCode: Optional[str] = None
    idempotencyKey: Optional[str] = None
    customerName: Optional[str] = "FinFlow User"
    customerPhone: Optional[str] = "9999999999"

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
    paymentId: str
    amount: Optional[float] = None
    reason: Optional[str] = None