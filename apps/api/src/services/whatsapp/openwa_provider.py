import logging
import time
from typing import Dict, Any, Optional

from src.services.whatsapp.provider import WhatsAppProvider
from src.services.whatsapp.openwa_client import OpenWAClient
from src.services.whatsapp.phone_utils import format_whatsapp_chat_id

logger = logging.getLogger(__name__)


class OpenWAProvider(WhatsAppProvider):
    """
    Concrete OpenWA implementation of the WhatsAppProvider interface.
    Translates FinFlow domain requests to OpenWA gateway operations and
    normalizes statuses.
    """

    def __init__(self, client: Optional[OpenWAClient] = None):
        self.client = client or OpenWAClient()

    @property
    def name(self) -> str:
        return "openwa"

    def _normalize_openwa_status(self, raw_status: str) -> str:
        """
        Translates OpenWA raw session status to FinFlow canonical status:
        'connected', 'qr_required', 'connecting', 'disconnected', 'error'
        """
        s = (raw_status or "").upper()
        if s in ("CONNECTED", "READY", "AUTHENTICATED", "ONLINE", "OPEN"):
            return "connected"
        if s in ("SCAN_QR_CODE", "QR", "QR_CODE", "QR_READY", "QR_REQUIRED", "WAITING_FOR_QR", "UNPAIRED"):
            return "qr_required"
        if s in ("STARTING", "INITIALIZING", "CONNECTING", "LAUNCHING", "LOGGING_IN", "CREATED"):
            return "connecting"
        if s in ("DISCONNECTED", "STOPPED", "LOGGED_OUT", "CLOSED", "NOT_FOUND"):
            return "disconnected"
        return "error"

    async def create_session(
        self, session_id: str, webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        res = await self.client.start_session(session_id, webhook_url=webhook_url)

        raw_status = (
            res.get("status")
            or res.get("state")
            or res.get("sessionState")
            or "connecting"
        )
        status = self._normalize_openwa_status(str(raw_status))
        qr_code = res.get("qr") or res.get("qrcode") or res.get("qrCode") or res.get("data")

        # If OpenWA returns QR code immediately, update status to qr_required
        if qr_code and status != "connected":
            status = "qr_required"
        elif status == "qr_required" and not qr_code:
            try:
                fetched_qr = await self.get_qr(session_id)
                if fetched_qr:
                    qr_code = fetched_qr
            except Exception as e:
                logger.debug("Proactive QR fetch in create_session skipped: %s", e)

        return {
            "status": status,
            "qr_code": str(qr_code) if qr_code else None,
            "phone_number": res.get("phone") or res.get("me", {}).get("id") if isinstance(res.get("me"), dict) else None,
            "error_message": res.get("error") if status == "error" else None,
        }

    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        try:
            res = await self.client.get_session_status(session_id)
        except Exception as exc:
            logger.warning("Could not fetch status for session %s: %s", session_id, exc)
            return {
                "status": "disconnected",
                "phone_number": None,
                "display_name": None,
                "error_message": str(exc),
            }

        raw_status = (
            res.get("status")
            or res.get("state")
            or res.get("sessionState")
            or "disconnected"
        )
        status = self._normalize_openwa_status(str(raw_status))

        # Extract phone and display name if available in response
        phone = res.get("phone") or res.get("phoneNumber")
        display_name = res.get("name") or res.get("pushname")

        if isinstance(res.get("me"), dict):
            me = res["me"]
            phone = phone or me.get("id") or me.get("user")
            display_name = display_name or me.get("name") or me.get("pushname")

        return {
            "status": status,
            "phone_number": str(phone) if phone else None,
            "display_name": str(display_name) if display_name else None,
            "error_message": res.get("error") if status == "error" else None,
        }

    async def get_qr(self, session_id: str) -> Optional[str]:
        try:
            res = await self.client.get_qr(session_id)
            if isinstance(res, dict):
                qr = res.get("qr") or res.get("qrcode") or res.get("qrCode") or res.get("data")
                return str(qr) if qr else None
            elif isinstance(res, str):
                return res
            return None
        except Exception as exc:
            logger.warning("Failed to retrieve QR code for session %s: %s", session_id, exc)
            return None

    async def disconnect_session(self, session_id: str) -> bool:
        try:
            await self.client.stop_session(session_id)
            return True
        except Exception as exc:
            logger.warning("Failed to cleanly disconnect session %s: %s", session_id, exc)
            return False

    async def send_text(
        self, session_id: str, phone: str, text: str
    ) -> Dict[str, Any]:
        chat_id = format_whatsapp_chat_id(phone)
        res = await self.client.send_text(session_id, chat_id, text)

        message_id = (
            res.get("messageId")
            or res.get("id")
            or (res.get("data", {}).get("id") if isinstance(res.get("data"), dict) else None)
            or f"wa_{session_id}_{int(time.time())}"
        )

        return {
            "message_id": str(message_id),
            "status": "sent",
            "provider_response": res,
        }

    async def send_document(
        self,
        session_id: str,
        phone: str,
        document_base64: str,
        filename: str,
        caption: Optional[str] = None,
    ) -> Dict[str, Any]:
        chat_id = format_whatsapp_chat_id(phone)
        res = await self.client.send_file(
            session_id=session_id,
            chat_id=chat_id,
            file_base64=document_base64,
            filename=filename,
            caption=caption,
        )

        message_id = (
            res.get("messageId")
            or res.get("id")
            or (res.get("data", {}).get("id") if isinstance(res.get("data"), dict) else None)
            or f"wa_doc_{session_id}_{int(time.time())}"
        )

        return {
            "message_id": str(message_id),
            "status": "sent",
            "provider_response": res,
        }
