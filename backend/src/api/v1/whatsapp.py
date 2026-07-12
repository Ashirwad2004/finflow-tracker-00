# routes.py - improved version

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, field_validator
from src.whatsapp.models import BillingEvent
from src.whatsapp.notification import process_billing_event
from src.whatsapp.client import WhatsAppPlaywrightClient

router = APIRouter(tags=["whatsapp"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class CustomMessage(BaseModel):
    phone: str
    text: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = v.strip().lstrip("+")
        if not digits.isdigit() or not (7 <= len(digits) <= 15):
            raise ValueError("phone must be 7–15 digits, optionally prefixed with '+'")
        return v.strip()

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("text must not be empty")
        if len(v) > 4096:
            raise ValueError("text exceeds WhatsApp's 4096-character limit")
        return v


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_client() -> WhatsAppPlaywrightClient:
    """Centralise client access so every route doesn't repeat the same call."""
    return WhatsAppPlaywrightClient.get_instance()


async def _require_authenticated_client() -> WhatsAppPlaywrightClient:
    """Return client or raise 503 if WhatsApp Web isn't authenticated."""
    client = _get_client()
    if not await client.is_authenticated():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WhatsApp Web is not authenticated. Please scan the QR code in Settings.",
        )
    return client


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/webhook/billing-event", status_code=status.HTTP_200_OK)
async def billing_event_webhook(event: BillingEvent):
    """Receive a billing event and dispatch the appropriate WhatsApp notification."""
    try:
        result = await process_billing_event(event)
        return {"success": True, "result": result}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.get("/status", status_code=status.HTTP_200_OK)
async def get_whatsapp_status():
    """Return whether WhatsApp Web is currently authenticated."""
    try:
        authenticated = await _get_client().is_authenticated()
        return {"authenticated": authenticated}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check WhatsApp status: {exc}",
        ) from exc


@router.get("/qr")
async def get_whatsapp_qr():
    """
    Return a PNG screenshot of the WhatsApp Web QR code.
    Responds with 200 + image/png when not yet authenticated,
    or 200 + JSON when already authenticated.
    """
    try:
        client = _get_client()

        if await client.is_authenticated():
            return {"authenticated": True, "message": "Already authenticated"}

        qr_bytes = await client.get_qr_screenshot()
        if not qr_bytes:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="QR code is not ready yet. Please retry in a few seconds.",
            )

        return Response(content=qr_bytes, media_type="image/png")

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get WhatsApp QR code: {exc}",
        ) from exc


@router.post("/send-message", status_code=status.HTTP_200_OK)
async def send_custom_message(message: CustomMessage):
    """Send a free-form text message to any WhatsApp number."""
    client = await _require_authenticated_client()

    try:
        success = await client.send_message(message.phone, message.text)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message via automated browser.",
        )

    return {"success": True}