import logging
from typing import Dict, Any, Optional
import httpx

from src.core.config import settings
from src.services.whatsapp.exceptions import (
    WhatsAppException,
    WhatsAppGatewayUnavailableException,
)

logger = logging.getLogger(__name__)


class OpenWAClient:
    """
    Direct asynchronous HTTP client for the self-hosted OpenWA gateway.
    Handles admin authentication, request timeouts, error normalization,
    and safe logging without secret leakage.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[int] = None,
    ):
        self.base_url = (base_url or settings.OPENWA_BASE_URL or "http://localhost:2785").rstrip("/")
        self.api_key = api_key or settings.OPENWA_ADMIN_API_KEY or ""
        self.timeout = timeout or settings.OPENWA_TIMEOUT_SECONDS or 30

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers = self._get_headers()

        safe_path = path
        logger.debug("OpenWA Request: %s %s", method, safe_path)

        try:
            async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=json_data,
                    params=params,
                )

                if response.status_code in (401, 403):
                    logger.error("OpenWA Authentication rejected (status %d)", response.status_code)
                    raise WhatsAppException(
                        "WhatsApp gateway authentication failed. Please verify OPENWA_ADMIN_API_KEY.",
                        status_code=502,
                    )

                if response.status_code >= 500:
                    logger.error("OpenWA Server Error %d on %s: %s", response.status_code, safe_path, response.text[:200])
                    raise WhatsAppGatewayUnavailableException(
                        f"WhatsApp gateway returned internal error ({response.status_code})."
                    )

                if response.status_code >= 400:
                    logger.warning("OpenWA Client Error %d on %s: %s", response.status_code, safe_path, response.text[:200])
                    try:
                        err_json = response.json()
                        err_msg = err_json.get("message") or err_json.get("error") or response.text
                        if isinstance(err_msg, list):
                            err_msg = ", ".join(str(m) for m in err_msg)
                    except Exception:
                        err_msg = response.text
                    raise WhatsAppException(f"OpenWA request failed: {err_msg}", status_code=response.status_code)

                try:
                    return response.json()
                except Exception:
                    # Some endpoints return plain text (e.g. QR ascii/base64)
                    return {"data": response.text}

        except httpx.ConnectError as exc:
            logger.error("Cannot connect to OpenWA gateway at %s: %s", self.base_url, exc)
            raise WhatsAppGatewayUnavailableException(
                f"Cannot connect to WhatsApp gateway at {self.base_url}. Please ensure OpenWA is running."
            ) from exc
        except httpx.TimeoutException as exc:
            logger.error("Timeout connecting to OpenWA at %s after %ds", self.base_url, self.timeout)
            raise WhatsAppGatewayUnavailableException(
                f"WhatsApp gateway timed out after {self.timeout} seconds."
            ) from exc
        except WhatsAppException:
            raise
        except Exception as exc:
            logger.exception("Unexpected error in OpenWA client: %s", exc)
            raise WhatsAppException(f"Unexpected WhatsApp gateway error: {str(exc)}", status_code=500) from exc

    async def health_check(self) -> Dict[str, Any]:
        """Checks gateway reachability."""
        for path in ("/api/sessions", "/health", "/api/health", "/"):
            try:
                return await self._request("GET", path)
            except Exception:
                continue
        return {"status": "ok"}

    def _is_uuid(self, val: str) -> bool:
        if not val or len(val) != 36:
            return False
        parts = val.split("-")
        return len(parts) == 5 and [len(p) for p in parts] == [8, 4, 4, 4, 12]

    async def _resolve_or_create_session(self, session_id: str, create: bool = True) -> str:
        """
        Finds or registers the session in modern OpenWA Dashboard.
        OpenWA names must contain only letters, numbers, and hyphens.
        Returns the resolved gateway session UUID (or clean_name if legacy).
        """
        if self._is_uuid(session_id):
            return session_id

        clean_name = session_id.replace("_", "-")
        try:
            sessions = await self._request("GET", "/api/sessions")
            if isinstance(sessions, list):
                for s in sessions:
                    if s.get("name") in (clean_name, session_id) or s.get("id") == session_id:
                        return str(s.get("id"))

            if create:
                # Not found: create new session
                create_resp = await self._request("POST", "/api/sessions", json_data={"name": clean_name})
                if create_resp and create_resp.get("id"):
                    return str(create_resp["id"])
        except WhatsAppException as exc:
            if exc.status_code == 404:
                return clean_name
            logger.debug("Session resolution check returned %s; continuing with %s", exc, clean_name)
        except Exception as exc:
            logger.debug("Could not resolve session via /api/sessions: %s", exc)

        return clean_name

    async def start_session(
        self, session_id: str, webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Starts or retrieves a WhatsApp session.
        Supports both modern OpenWA Dashboard (/api/sessions/{uuid}/start)
        and legacy gateways (/api/sessions/start or /session/start).
        """
        clean_name = session_id.replace("_", "-")
        target_id = await self._resolve_or_create_session(session_id, create=True)

        # 1. Try modern OpenWA dashboard pattern: POST /api/sessions/{uuid}/start
        if self._is_uuid(target_id):
            try:
                return await self._request("POST", f"/api/sessions/{target_id}/start")
            except WhatsAppException as exc:
                if exc.status_code != 404:
                    raise

        # 2. Try legacy OpenWA endpoints
        payload: Dict[str, Any] = {
            "sessionId": clean_name,
            "session": clean_name,
        }
        if webhook_url:
            payload["webhookUrl"] = webhook_url

        try:
            return await self._request("POST", "/api/sessions/start", json_data=payload)
        except WhatsAppException as exc:
            if exc.status_code == 404:
                return await self._request("POST", "/session/start", json_data=payload)
            raise

    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Retrieves session status from OpenWA."""
        clean_name = session_id.replace("_", "-")

        # 1. Look up in modern OpenWA dashboard /api/sessions
        try:
            sessions = await self._request("GET", "/api/sessions")
            if isinstance(sessions, list):
                for s in sessions:
                    if s.get("name") in (clean_name, session_id) or s.get("id") == session_id:
                        return s
        except Exception:
            pass

        # 2. Try GET /api/sessions/{uuid} if valid UUID
        target_id = await self._resolve_or_create_session(session_id, create=False)
        if self._is_uuid(target_id):
            try:
                return await self._request("GET", f"/api/sessions/{target_id}")
            except WhatsAppException as exc:
                if exc.status_code != 404:
                    raise

        # 3. Legacy fallbacks
        try:
            return await self._request("GET", f"/api/sessions/{session_id}/status")
        except WhatsAppException as exc:
            if exc.status_code == 404:
                return await self._request("GET", f"/session/{session_id}/status")
            raise

    async def get_qr(self, session_id: str) -> Dict[str, Any]:
        """Retrieves current QR code for scanning."""
        target_id = await self._resolve_or_create_session(session_id, create=False)

        # 1. Try modern OpenWA dashboard: GET /api/sessions/{uuid}/qr
        if self._is_uuid(target_id):
            try:
                res = await self._request("GET", f"/api/sessions/{target_id}/qr")
                if isinstance(res, dict):
                    qr = res.get("qrCode") or res.get("qr") or res.get("data")
                    if qr:
                        return {"qrCode": qr, "status": res.get("status", "qr_ready")}
                return res
            except WhatsAppException as exc:
                if exc.status_code != 404:
                    raise

        # 2. Legacy fallbacks
        try:
            return await self._request("GET", f"/api/sessions/{session_id}/qr")
        except WhatsAppException as exc:
            if exc.status_code == 404:
                return await self._request("GET", f"/session/{session_id}/qr")
            raise

    async def stop_session(self, session_id: str) -> Dict[str, Any]:
        """Disconnects / logs out session."""
        target_id = await self._resolve_or_create_session(session_id, create=False)

        if self._is_uuid(target_id):
            try:
                return await self._request("POST", f"/api/sessions/{target_id}/logout")
            except WhatsAppException as exc:
                if exc.status_code == 404:
                    try:
                        return await self._request("POST", f"/api/sessions/{target_id}/stop")
                    except WhatsAppException:
                        pass
                else:
                    raise

        # Legacy fallback
        return await self._request("POST", f"/session/{session_id}/logout")

    async def send_text(
        self, session_id: str, chat_id: str, content: str
    ) -> Dict[str, Any]:
        """
        Sends text message via OpenWA session.
        chat_id: e.g. 919876543210@c.us
        """
        target_id = await self._resolve_or_create_session(session_id, create=False)
        # OpenWA NestJS SendTextMessageDto accepts strictly: chatId, text, mentions, linkPreview, quotedMessageId.
        # Any extra properties like 'content' or 'message' trigger 400 Bad Request.
        payload = {
            "chatId": chat_id,
            "text": content,
        }

        # 1. Try modern OpenWA dashboard: POST /api/sessions/{uuid}/messages/send-text
        if self._is_uuid(target_id):
            try:
                return await self._request(
                    "POST", f"/api/sessions/{target_id}/messages/send-text", json_data=payload
                )
            except WhatsAppException as exc:
                if exc.status_code != 404:
                    raise

        # 2. Legacy fallbacks
        try:
            return await self._request(
                "POST", f"/api/{session_id}/sendText", json_data={"chatId": chat_id, "content": content, "text": content}
            )
        except WhatsAppException as exc:
            if exc.status_code == 404:
                return await self._request(
                    "POST", f"/session/{session_id}/send-text", json_data={"chatId": chat_id, "content": content, "text": content}
                )
            raise

    async def send_file(
        self,
        session_id: str,
        chat_id: str,
        file_base64: str,
        filename: str,
        caption: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends a file/document via OpenWA session.
        SendMediaMessageDto accepts strictly: chatId, base64 (or url), mimetype, filename, caption, mentions.
        """
        target_id = await self._resolve_or_create_session(session_id, create=False)

        clean_b64 = file_base64
        mimetype = "application/pdf"
        if "data:" in clean_b64 and ";base64," in clean_b64:
            parts = clean_b64.split(";base64,", 1)
            header = parts[0]
            clean_b64 = parts[1]
            if header.startswith("data:"):
                mimetype = header[5:]
        elif filename:
            lower = filename.lower()
            if lower.endswith(".pdf"):
                mimetype = "application/pdf"
            elif lower.endswith(".png"):
                mimetype = "image/png"
            elif lower.endswith((".jpg", ".jpeg")):
                mimetype = "image/jpeg"

        payload: Dict[str, Any] = {
            "chatId": chat_id,
            "base64": clean_b64,
            "mimetype": mimetype,
            "filename": filename or "document.pdf",
        }
        if caption:
            payload["caption"] = caption

        # 1. Try modern OpenWA dashboard: POST /api/sessions/{uuid}/messages/send-document
        if self._is_uuid(target_id):
            try:
                return await self._request(
                    "POST", f"/api/sessions/{target_id}/messages/send-document", json_data=payload
                )
            except WhatsAppException as exc:
                if exc.status_code != 404:
                    raise

        # 2. Legacy fallbacks
        legacy_payload = {
            "chatId": chat_id,
            "file": file_base64,
            "filename": filename,
            "caption": caption or "",
        }
        try:
            return await self._request(
                "POST", f"/api/{session_id}/sendFile", json_data=legacy_payload
            )
        except WhatsAppException as exc:
            if exc.status_code == 404:
                return await self._request(
                    "POST", f"/session/{session_id}/send-file", json_data=legacy_payload
                )
            raise


