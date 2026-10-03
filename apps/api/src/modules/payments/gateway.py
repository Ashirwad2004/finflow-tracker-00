from src.core.config import settings
from .drivers import MockGateway, StripeGateway, RazorpayGateway

def get_gateway_driver(provider: str | None = None):
    if not provider:
        provider = settings.PAYMENT_GATEWAY_PROVIDER or "razorpay"
        
    p = provider.lower()
    if p in ("mock", "test") and settings.ENVIRONMENT.lower() == "production":
        raise RuntimeError("Mock payment gateway is disabled in production")
    if p == "stripe":
        return StripeGateway()
    elif p == "razorpay":
        return RazorpayGateway()
    elif p in ("mock", "test") or settings.ENVIRONMENT.lower() in ("development", "test", "local"):
        return MockGateway()
    else:
        raise RuntimeError(f"Unknown or unsupported payment gateway in production: {provider}")