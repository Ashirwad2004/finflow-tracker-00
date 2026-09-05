import hmac
import hashlib
import secrets
import json
from typing import Dict, Any, Optional
from src.core.config import settings

class MockGateway:
    name = "mock"

    async def create_order(self, order_id: str, amount: float, currency: str = "INR", customer: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        mock_order_id = f"mock_order_{secrets.token_hex(8)}"
        return {
            "success": True,
            "gatewayOrderId": mock_order_id,
            "checkoutUrl": f"/payment/checkout?gateway=mock&order_id={order_id}&gateway_order_id={mock_order_id}",
            "details": {
                "amount": amount,
                "currency": currency,
                "merchantName": "FinFlow Storefront",
                "customerName": customer.get("name") if customer else "Valued Customer",
                "customerPhone": customer.get("phone") if customer else "9999999999"
            }
        }

    async def verify_payment(self, gateway_order_id: str, gateway_payment_id: str, gateway_signature: Optional[str] = None, expected_amount: Optional[float] = None, expected_currency: Optional[str] = None) -> Dict[str, Any]:
        if gateway_signature != "mock_signature_hash":
            raise ValueError("Invalid mock payment signature")
        if gateway_payment_id and gateway_payment_id.startswith("mock_pay"):
            parts = gateway_payment_id.split("_")
            payment_method = parts[2] if len(parts) > 2 else "card"
            return {
                "success": True,
                "paymentMethod": payment_method,
                "paymentMethodDetails": {
                    "brand": "Visa" if payment_method == "card" else None,
                    "last4": "4242" if payment_method == "card" else None,
                    "upiId": "customer@upi" if payment_method == "upi" else None,
                    "bank": "State Bank of India" if payment_method == "netbanking" else None,
                    "wallet": "Paytm" if payment_method == "wallet" else None
                }
            }
        raise ValueError("Invalid mock payment verification payload")

    async def refund(self, gateway_payment_id: str, amount: Optional[float] = None, reason: Optional[str] = None) -> Dict[str, Any]:
        return {
            "success": True,
            "refundId": f"mock_ref_{secrets.token_hex(8)}"
        }

    def verify_webhook(self, req_body: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        event = json.loads(req_body.decode('utf-8'))
        return {
            "isValid": True,
            "type": event.get("type"),
            "data": event.get("data")
        }


class StripeGateway:
    name = "stripe"

    def __init__(self):
        self.secret_key = settings.STRIPE_SECRET_KEY
        if self.secret_key:
            import stripe
            stripe.api_key = self.secret_key

    def ensure_client(self):
        import stripe
        if not stripe.api_key:
            stripe.api_key = settings.STRIPE_SECRET_KEY
        if not stripe.api_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable is not defined.")

    async def create_order(self, order_id: str, amount: float, currency: str = "USD", customer: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        import stripe
        self.ensure_client()
        subunit_amount = int(round(amount * 100))
        metadata = {"orderId": order_id}
        
        payment_intent = stripe.PaymentIntent.create(
            amount=subunit_amount,
            currency=currency.lower(),
            description=f"FinFlow Storefront Order #{order_id}",
            metadata=metadata,
            receipt_email=customer.get("email") if customer else None
        )
        return {
            "success": True,
            "gatewayOrderId": payment_intent.id,
            "checkoutUrl": None,
            "details": {
                "clientSecret": payment_intent.client_secret,
                "publishableKey": settings.STRIPE_PUBLISHABLE_KEY or ""
            }
        }

    async def verify_payment(self, gateway_order_id: str, gateway_payment_id: Optional[str] = None, gateway_signature: Optional[str] = None, expected_amount: Optional[float] = None, expected_currency: Optional[str] = None) -> Dict[str, Any]:
        import stripe
        self.ensure_client()
        payment_intent = stripe.PaymentIntent.retrieve(gateway_order_id)
        if expected_amount is not None and payment_intent.amount != int(round(expected_amount * 100)):
            raise ValueError("Payment amount does not match the order")
        if expected_currency and payment_intent.currency.lower() != expected_currency.lower():
            raise ValueError("Payment currency does not match the order")
        if payment_intent.status == "succeeded":
            latest_charge = payment_intent.latest_charge
            charge = None
            if latest_charge:
                charge = stripe.Charge.retrieve(latest_charge)
            
            method = "card"
            details = {}
            if charge and charge.payment_method_details:
                method = charge.payment_method_details.type
                details = charge.payment_method_details.to_dict() if hasattr(charge.payment_method_details, "to_dict") else dict(charge.payment_method_details)
            return {
                "success": True,
                "paymentMethod": method,
                "paymentMethodDetails": details
            }
        raise ValueError(f"Stripe Payment Intent is in status: {payment_intent.status}")

    async def refund(self, gateway_payment_id: str, amount: Optional[float] = None, reason: Optional[str] = None) -> Dict[str, Any]:
        import stripe
        self.ensure_client()
        refund_params = {
            "payment_intent": gateway_payment_id,
            "reason": "requested_by_customer"
        }
        if amount:
            refund_params["amount"] = int(round(amount * 100))
        
        refund_obj = stripe.Refund.create(**refund_params)
        return {
            "success": True,
            "refundId": refund_obj.id
        }

    def verify_webhook(self, req_body: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        import stripe
        self.ensure_client()
        signature = headers.get("stripe-signature")
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        if not signature or not webhook_secret:
            raise ValueError("Missing stripe-signature or STRIPE_WEBHOOK_SECRET")
            
        event = stripe.Webhook.construct_event(
            req_body, signature, webhook_secret
        )
        return {
            "isValid": True,
            "type": event.type,
            "data": event.data.object
        }


class RazorpayGateway:
    name = "razorpay"

    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.client = None
        if self.key_id and self.key_secret:
            import razorpay
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))

    def ensure_client(self):
        import razorpay
        if not self.client:
            self.key_id = settings.RAZORPAY_KEY_ID
            self.key_secret = settings.RAZORPAY_KEY_SECRET
            if not self.key_id or not self.key_secret:
                raise ValueError("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables are not defined.")
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))

    async def create_order(self, order_id: str, amount: float, currency: str = "INR", customer: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        self.ensure_client()
        subunit_amount = int(round(amount * 100))
        
        rzp_order = self.client.order.create({
            "amount": subunit_amount,
            "currency": currency.upper(),
            "receipt": f"receipt_order_{order_id[:16]}",
            "notes": {"orderId": order_id}
        })
        return {
            "success": True,
            "gatewayOrderId": rzp_order["id"],
            "checkoutUrl": None,
            "details": {
                "keyId": settings.RAZORPAY_KEY_ID,
                "amount": rzp_order["amount"],
                "currency": rzp_order["currency"],
                "orderId": rzp_order["id"],
                "customerName": customer.get("name") if customer else "Valued Customer",
                "customerPhone": customer.get("phone") if customer else "9999999999"
            }
        }

    async def verify_payment(self, gateway_order_id: str, gateway_payment_id: str, gateway_signature: Optional[str] = None, expected_amount: Optional[float] = None, expected_currency: Optional[str] = None) -> Dict[str, Any]:
        self.ensure_client()
        if not gateway_signature:
            raise ValueError("Razorpay payment requires gatewaySignature for verification.")
            
        body = f"{gateway_order_id}|{gateway_payment_id}"
        expected_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode('utf-8'),
            body.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, gateway_signature):
            raise ValueError("Razorpay signature verification failed.")
            
        order_details = self.client.order.fetch(gateway_order_id)
        payment_details = self.client.payment.fetch(gateway_payment_id)
        if payment_details.get("order_id") != gateway_order_id:
            raise ValueError("Payment is not linked to the gateway order")
        if payment_details.get("status") != "captured":
            raise ValueError("Payment has not been captured")
        if expected_amount is not None and payment_details.get("amount") != int(round(expected_amount * 100)):
            raise ValueError("Payment amount does not match the order")
        if expected_currency and order_details.get("currency") != expected_currency.upper():
            raise ValueError("Payment currency does not match the order")
        return {
            "success": True,
            "paymentMethod": payment_details.get("method"),
            "paymentMethodDetails": {
                "bank": payment_details.get("bank"),
                "wallet": payment_details.get("wallet"),
                "vpa": payment_details.get("vpa"),
                "cardId": payment_details.get("card_id"),
                "email": payment_details.get("email"),
                "contact": payment_details.get("contact")
            }
        }

    async def refund(self, gateway_payment_id: str, amount: Optional[float] = None, reason: Optional[str] = None) -> Dict[str, Any]:
        self.ensure_client()
        refund_params = {}
        if amount:
            refund_params["amount"] = int(round(amount * 100))
        refund_params["notes"] = {"reason": reason or "Merchant refund"}
        
        refund_obj = self.client.payment.refund(gateway_payment_id, refund_params)
        return {
            "success": True,
            "refundId": refund_obj["id"]
        }

    def verify_webhook(self, req_body: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        signature = headers.get("x-razorpay-signature")
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        if not signature or not webhook_secret:
            raise ValueError("Missing x-razorpay-signature or RAZORPAY_WEBHOOK_SECRET")
            
        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            req_body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, signature):
            raise ValueError("Razorpay webhook signature verification failed.")
            
        event = json.loads(req_body.decode('utf-8'))
        return {
            "isValid": True,
            "type": event.get("event"),
            "data": event.get("payload")
        }
