from src.core.config import settings
from src.services.payments.drivers import MockGateway, StripeGateway, RazorpayGateway

def get_gateway_driver(provider: str = None):
    if not provider:
        provider = settings.PAYMENT_GATEWAY_PROVIDER or "razorpay"
        
    p = provider.lower()
    if p == "mock" and settings.ENVIRONMENT.lower() == "production":
        raise RuntimeError("Mock payment gateway is disabled in production")
    if p == "stripe":
        return StripeGateway()
    elif p == "razorpay":
        return RazorpayGateway()
    else:
        return MockGateway()