class WhatsAppException(Exception):
    """Base exception for all WhatsApp integration errors."""
    def __init__(self, message: str, status_code: int = 400, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class WhatsAppNotConnectedException(WhatsAppException):
    """Raised when an operation requires an active WhatsApp connection."""
    def __init__(self, message: str = "WhatsApp is not connected for this business. Please connect in Settings -> WhatsApp."):
        super().__init__(message, status_code=400)


class WhatsAppGatewayUnavailableException(WhatsAppException):
    """Raised when the OpenWA server is unreachable or timing out."""
    def __init__(self, message: str = "WhatsApp gateway service is temporarily unavailable. Please verify the OpenWA server is running."):
        super().__init__(message, status_code=503)


class WhatsAppRateLimitException(WhatsAppException):
    """Raised when rate limits or cooldown windows are breached."""
    def __init__(self, message: str = "Too many WhatsApp messages requested. Please wait a moment before sending another message."):
        super().__init__(message, status_code=429)


class WhatsAppInvalidPhoneException(WhatsAppException):
    """Raised when a phone number is malformed or invalid."""
    def __init__(self, message: str = "Invalid phone number. Please provide a valid 10-digit Indian mobile number or international phone number."):
        super().__init__(message, status_code=400)
