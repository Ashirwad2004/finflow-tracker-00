import re
from typing import Tuple
from src.services.whatsapp.exceptions import WhatsAppInvalidPhoneException


def normalize_indian_phone(raw_phone: str) -> Tuple[str, str]:
    """
    Normalizes an Indian or international phone number for WhatsApp delivery.
    
    Returns:
        (canonical_digits, formatted_display)
        e.g. ("919876543210", "+91 98765 43210")
        
    Raises:
        WhatsAppInvalidPhoneException if the number is empty or malformed.
    """
    if not raw_phone or not isinstance(raw_phone, str):
        raise WhatsAppInvalidPhoneException("Recipient phone number is required.")

    # Strip any non-digit characters
    digits = re.sub(r"[^\d]", "", raw_phone.strip())

    if not digits:
        raise WhatsAppInvalidPhoneException("Phone number does not contain any digits.")

    # Case 1: 11 digits starting with 0 (e.g., 09876543210 -> 9876543210)
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    # Case 2: 10 digits standard Indian mobile number (should start with 6, 7, 8, or 9)
    if len(digits) == 10:
        if digits[0] not in ("6", "7", "8", "9"):
            raise WhatsAppInvalidPhoneException(
                f"Invalid Indian mobile number '{digits}'. Indian mobile numbers must start with 6, 7, 8, or 9."
            )
        canonical = f"91{digits}"
        display = f"+91 {digits[:5]} {digits[5:]}"
        return canonical, display

    # Case 3: 12 digits starting with 91 (standard Indian format)
    if len(digits) == 12 and digits.startswith("91"):
        local_part = digits[2:]
        if local_part[0] not in ("6", "7", "8", "9"):
            raise WhatsAppInvalidPhoneException(
                f"Invalid Indian mobile number '{digits}'. Local number must start with 6, 7, 8, or 9."
            )
        canonical = digits
        display = f"+91 {local_part[:5]} {local_part[5:]}"
        return canonical, display

    # Case 4: International format with country code (between 11 and 15 digits according to E.164)
    if 10 <= len(digits) <= 15:
        canonical = digits
        display = f"+{digits}"
        return canonical, display

    raise WhatsAppInvalidPhoneException(
        f"Malformed phone number '{raw_phone}'. Expected a valid 10-digit Indian mobile or 11-15 digit international number."
    )


def format_whatsapp_chat_id(phone_digits: str) -> str:
    """
    Formats canonical digits into WhatsApp chat ID format.
    Individual contacts use {phone}@c.us.
    """
    cleaned = re.sub(r"[^\d]", "", phone_digits)
    return f"{cleaned}@c.us"
