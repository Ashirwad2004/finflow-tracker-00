from src.core.config import settings
from src.services.payments.drivers import MockGateway, StripeGateway, RazorpayGateway

def get_gateway_driver(provider: str = None):
    if not provider:
        provider = settings.PAYMENT_GATEWAY_PROVIDER or "mock"
        
    p = provider.lower()
    if p == "stripe":
        return StripeGateway()
    elif p == "razorpay":
        return RazorpayGateway()
    else:
        return MockGateway()