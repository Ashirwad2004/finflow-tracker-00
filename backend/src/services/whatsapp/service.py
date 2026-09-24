import logging
from datetime import datetime, timezone
import time
from typing import Dict, Any, Optional, List
from uuid import uuid4

from src.core.config import settings
from src.core.supabase import supabase_client
from src.services.whatsapp.provider import WhatsAppProvider
from src.services.whatsapp.openwa_provider import OpenWAProvider
from src.services.whatsapp.phone_utils import normalize_indian_phone
from src.services.whatsapp.exceptions import (
    WhatsAppException,
    WhatsAppNotConnectedException,
    WhatsAppRateLimitException,
)
from src.schemas.whatsapp import (
    WhatsAppConnectionResponse,
    WhatsAppSendInvoiceRequest,
    WhatsAppSendReceiptRequest,
    WhatsAppSendReminderRequest,
    WhatsAppSendMessageRequest,
    WhatsAppSendResponse,
)

logger = logging.getLogger(__name__)

# In-memory cooldown tracker to avoid database thrashing: {f"{store_id}:{phone}": last_sent_timestamp}
_SEND_COOLDOWN_CACHE: Dict[str, float] = {}
# In-memory rate limiter per store: {store_id: [timestamps]}
_STORE_RATE_CACHE: Dict[str, List[float]] = {}


class WhatsAppService:
    """
    High-level business service orchestrating multi-tenant WhatsApp operations,
    audit logging, tenant isolation, idempotency, rate limiting, and template rendering.
    """

    def __init__(self, provider: Optional[WhatsAppProvider] = None):
        self.provider = provider or self._resolve_provider()

    @staticmethod
    def _resolve_provider(provider_name: Optional[str] = None) -> WhatsAppProvider:
        p_name = (provider_name or settings.WHATSAPP_PROVIDER or "openwa").lower()
        if p_name == "openwa":
            return OpenWAProvider()
        # Clean extension point for future Meta Cloud API or other providers
        raise WhatsAppException(f"Unsupported WhatsApp provider '{p_name}'.")

    @staticmethod
    def get_session_id_for_store(store_id: str) -> str:
        """
        Generates a deterministic, tenant-isolated session identifier.
        Guarantees that Business A never touches Business B's WhatsApp session.
        Uses hyphens for full compatibility with OpenWA name regex validation.
        """
        clean_store = store_id.replace("-", "")
        return f"finflow-store-{clean_store}"

    def _check_rate_limit(self, store_id: str, phone: str, force: bool = False):
        """Enforces rate limits and cooldown protections."""
        if force:
            return

        now = time.time()
        cooldown_key = f"{store_id}:{phone}"

        # 1. Cooldown protection (prevent sending identical/immediate messages within cooldown window)
        last_sent = _SEND_COOLDOWN_CACHE.get(cooldown_key, 0.0)
        cooldown_window = settings.WHATSAPP_COOLDOWN_SECONDS
        if now - last_sent < cooldown_window:
            remaining = int(cooldown_window - (now - last_sent))
            raise WhatsAppRateLimitException(
                f"Please wait {remaining} seconds before sending another message to this phone number."
            )

        # 2. Per-store burst rate limit (e.g. 30 msgs / min)
        history = _STORE_RATE_CACHE.get(store_id, [])
        one_min_ago = now - 60.0
        active_history = [t for t in history if t > one_min_ago]
        if len(active_history) >= settings.WHATSAPP_RATE_LIMIT_PER_MINUTE:
            raise WhatsAppRateLimitException(
                f"Store message rate limit exceeded ({settings.WHATSAPP_RATE_LIMIT_PER_MINUTE} messages/minute). Please slow down."
            )

        active_history.append(now)
        _STORE_RATE_CACHE[store_id] = active_history
        _SEND_COOLDOWN_CACHE[cooldown_key] = now

    # =========================================================================
    # Connection Management
    # =========================================================================

    async def get_connection(self, store_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves connection record from Supabase."""
        if not supabase_client:
            return None

        try:
            res = (
                supabase_client.table("whatsapp_connections")
                .select("*")
                .eq("store_id", store_id)
                .maybe_single()
                .execute()
            )
            return getattr(res, "data", None)
        except Exception as exc:
            logger.warning("Could not fetch whatsapp_connections for store %s: %s", store_id, exc)
            return None

    async def get_status(self, store_id: str) -> WhatsAppConnectionResponse:
        """
        Retrieves current WhatsApp connection status.
        If connecting or qr_required, asks the provider for latest state.
        """
        conn = await self.get_connection(store_id)
        session_id = self.get_session_id_for_store(store_id)

        if not conn:
            return WhatsAppConnectionResponse(
                store_id=store_id,
                provider=self.provider.name,
                provider_session_id=session_id,
                status="disconnected",
            )

        current_status = conn.get("status", "disconnected")

        # If session is in transient state, sync status from provider
        if current_status in ("connecting", "qr_required", "connected"):
            try:
                live_status = await self.provider.get_session_status(session_id)
                new_status = live_status.get("status")

                update_fields: Dict[str, Any] = {}
                if new_status and new_status != current_status:
                    update_fields["status"] = new_status
                    current_status = new_status

                if live_status.get("phone_number") and not conn.get("phone_number"):
                    update_fields["phone_number"] = live_status["phone_number"]
                    conn["phone_number"] = live_status["phone_number"]

                if live_status.get("display_name") and not conn.get("display_name"):
                    update_fields["display_name"] = live_status["display_name"]
                    conn["display_name"] = live_status["display_name"]

                if new_status == "connected" and conn.get("status") != "connected":
                    update_fields["last_connected_at"] = datetime.now(timezone.utc).isoformat()
                    update_fields["qr_code_data"] = None

                if update_fields and supabase_client:
                    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
                    supabase_client.table("whatsapp_connections").update(update_fields).eq("store_id", store_id).execute()

            except Exception as exc:
                logger.debug("Provider status sync skipped for %s: %s", session_id, exc)

        return WhatsAppConnectionResponse(
            id=conn.get("id"),
            store_id=store_id,
            provider=conn.get("provider", self.provider.name),
            provider_session_id=session_id,
            phone_number=conn.get("phone_number"),
            display_name=conn.get("display_name"),
            status=current_status,
            qr_code_data=conn.get("qr_code_data"),
            error_message=conn.get("error_message"),
            last_connected_at=conn.get("last_connected_at"),
            last_seen_at=conn.get("last_seen_at"),
            created_at=conn.get("created_at"),
            updated_at=conn.get("updated_at"),
        )

    async def connect(
        self, store_id: str, user_id: str, webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initializes OpenWA session, requests QR, and persists connection record.
        """
        session_id = self.get_session_id_for_store(store_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Call provider to start session
        res = await self.provider.create_session(session_id, webhook_url=webhook_url)
        initial_status = res.get("status", "connecting")
        qr_code = res.get("qr_code")

        # If QR was not in start response, attempt to fetch it directly
        if initial_status == "qr_required" or not qr_code:
            try:
                fetched_qr = await self.provider.get_qr(session_id)
                if fetched_qr:
                    qr_code = fetched_qr
                    initial_status = "qr_required"
            except Exception:
                pass

        # Upsert connection record into Supabase
        if supabase_client:
            payload = {
                "store_id": store_id,
                "user_id": user_id,
                "provider": self.provider.name,
                "provider_session_id": session_id,
                "status": initial_status,
                "qr_code_data": qr_code,
                "error_message": res.get("error_message"),
                "updated_at": now_iso,
            }
            try:
                supabase_client.table("whatsapp_connections").upsert(
                    payload, on_conflict="store_id,provider"
                ).execute()
            except Exception as exc:
                logger.error("Failed to upsert whatsapp_connections for store %s: %s", store_id, exc)

        return {
            "status": initial_status,
            "qr_code": qr_code,
            "session_id": session_id,
        }

    async def get_qr(self, store_id: str) -> Optional[str]:
        """Fetches fresh QR code from provider."""
        session_id = self.get_session_id_for_store(store_id)
        qr = await self.provider.get_qr(session_id)

        if qr and supabase_client:
            try:
                supabase_client.table("whatsapp_connections").update({
                    "qr_code_data": qr,
                    "status": "qr_required",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("store_id", store_id).execute()
            except Exception:
                pass

        return qr

    async def disconnect(self, store_id: str) -> bool:
        """Disconnects WhatsApp session and updates DB."""
        session_id = self.get_session_id_for_store(store_id)
        await self.provider.disconnect_session(session_id)

        if supabase_client:
            try:
                supabase_client.table("whatsapp_connections").update({
                    "status": "disconnected",
                    "qr_code_data": None,
                    "error_message": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("store_id", store_id).execute()
            except Exception as exc:
                logger.warning("Could not update status to disconnected for store %s: %s", store_id, exc)

        return True

    # =========================================================================
    # Message Dispatching & Audit Logging
    # =========================================================================

    async def _log_message(
        self,
        store_id: str,
        user_id: str,
        phone_number: str,
        message_type: str,
        status: str,
        message_content: Optional[str] = None,
        has_attachment: bool = False,
        attachment_filename: Optional[str] = None,
        provider_message_id: Optional[str] = None,
        error_message: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        party_id: Optional[str] = None,
        invoice_id: Optional[str] = None,
        payment_id: Optional[str] = None,
    ) -> Optional[str]:
        """Records message to the immutable audit log table."""
        if not supabase_client:
            return None

        record_id = str(uuid4())
        payload = {
            "id": record_id,
            "store_id": store_id,
            "user_id": user_id,
            "phone_number": phone_number,
            "message_type": message_type,
            "status": status,
            "message_content": message_content,
            "has_attachment": has_attachment,
            "attachment_filename": attachment_filename,
            "provider_message_id": provider_message_id,
            "error_message": error_message,
            "idempotency_key": idempotency_key,
            "party_id": party_id,
            "invoice_id": invoice_id,
            "payment_id": payment_id,
            "sent_at": datetime.now(timezone.utc).isoformat() if status == "sent" else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            supabase_client.table("whatsapp_messages").insert(payload).execute()
            return record_id
        except Exception as exc:
            logger.warning("Could not insert whatsapp_messages record: %s", exc)
            return record_id

    async def _check_idempotency(
        self, store_id: str, idempotency_key: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Checks if a message with this idempotency key was already delivered."""
        if not idempotency_key or not supabase_client:
            return None

        try:
            res = (
                supabase_client.table("whatsapp_messages")
                .select("id, status, provider_message_id, phone_number, sent_at")
                .eq("store_id", store_id)
                .eq("idempotency_key", idempotency_key)
                .eq("status", "sent")
                .maybe_single()
                .execute()
            )
            data = getattr(res, "data", None)
            if data:
                return data
        except Exception:
            pass

        return None

    async def _fetch_business_name(self, store_id: str) -> str:
        """Fetches business name from profiles table."""
        if not supabase_client:
            return "Our Store"
        try:
            res = (
                supabase_client.table("profiles")
                .select("business_name, display_name")
                .eq("user_id", store_id)
                .maybe_single()
                .execute()
            )
            data = getattr(res, "data", None)
            if data and isinstance(data, dict):
                return data.get("business_name") or data.get("display_name") or "FinFlow Store"
        except Exception:
            pass
        return "FinFlow Store"

    # =========================================================================
    # High-Level FinFlow Operations
    # =========================================================================

    async def send_invoice(
        self,
        store_id: str,
        user_id: str,
        req: WhatsAppSendInvoiceRequest,
    ) -> WhatsAppSendResponse:
        """
        Sends an invoice notification (and optional PDF document) via WhatsApp.
        """
        canonical_phone, _ = normalize_indian_phone(req.customer_phone)

        # Idempotency check
        idem_key = req.idempotency_key or (f"inv_{req.invoice_id or req.invoice_number}_{canonical_phone}" if req.invoice_id or req.invoice_number else None)
        if not req.force_resend and idem_key:
            existing = await self._check_idempotency(store_id, idem_key)
            if existing:
                return WhatsAppSendResponse(
                    success=True,
                    status="already_sent",
                    message_id=existing.get("provider_message_id"),
                    phone_number=canonical_phone,
                    is_duplicate=True,
                    detail=f"Invoice {req.invoice_number} was already sent to {canonical_phone}.",
                )

        self._check_rate_limit(store_id, canonical_phone, force=req.force_resend)

        conn_status = await self.get_status(store_id)
        if conn_status.status != "connected":
            raise WhatsAppNotConnectedException()

        session_id = self.get_session_id_for_store(store_id)
        biz_name = await self._fetch_business_name(store_id)

        # Build message template
        sym = req.currency_symbol or "₹"
        due_text = f"Due Date: {req.due_date}\n" if req.due_date else ""
        notes_text = f"\nNote: {req.custom_notes}" if req.custom_notes else ""

        message_body = (
            f"Hello {req.customer_name},\n\n"
            f"Your invoice *{req.invoice_number}* from *{biz_name}* is ready.\n\n"
            f"• Total: {sym}{req.total_amount:,.2f}\n"
            f"• Paid: {sym}{req.amount_paid:,.2f}\n"
            f"• Balance Due: *{sym}{req.balance_due:,.2f}*\n"
            f"{due_text}"
            f"{notes_text}\n"
            f"Thank you for your business!\n"
            f"*{biz_name}*"
        )

        has_doc = bool(req.document_base64)
        filename = req.document_filename or f"Invoice_{req.invoice_number}.pdf"

        try:
            if has_doc:
                res = await self.provider.send_document(
                    session_id=session_id,
                    phone=canonical_phone,
                    document_base64=req.document_base64 or "",
                    filename=filename,
                    caption=message_body,
                )
            else:
                res = await self.provider.send_text(
                    session_id=session_id,
                    phone=canonical_phone,
                    text=message_body,
                )

            msg_id = res.get("message_id")
            await self._log_message(
                store_id=store_id,
                user_id=user_id,
                phone_number=canonical_phone,
                message_type="invoice",
                status="sent",
                message_content=message_body,
                has_attachment=has_doc,
                attachment_filename=filename if has_doc else None,
                provider_message_id=msg_id,
                idempotency_key=idem_key,
                invoice_id=req.invoice_id,
            )

            return WhatsAppSendResponse(
                success=True,
                status="sent",
                message_id=msg_id,
                phone_number=canonical_phone,
                detail=f"Invoice {req.invoice_number} sent successfully to {canonical_phone}.",
            )

        except Exception as exc:
            logger.error("Failed to send WhatsApp invoice: %s", exc)
            await self._log_message(
                store_id=store_id,
                user_id=user_id,
                phone_number=canonical_phone,
                message_type="invoice",
                status="failed",
                message_content=message_body,
                has_attachment=has_doc,
                attachment_filename=filename if has_doc else None,
                error_message=str(exc),
                idempotency_key=idem_key,
                invoice_id=req.invoice_id,
            )
            raise WhatsAppException(f"Failed to deliver WhatsApp message: {str(exc)}") from exc

    async def send_receipt(
        self,
        store_id: str,
        user_id: str,
        req: WhatsAppSendReceiptRequest,
    ) -> WhatsAppSendResponse:
        """
        Sends a payment receipt notification via WhatsApp.
        """
        canonical_phone, _ = normalize_indian_phone(req.customer_phone)

        idem_key = req.idempotency_key or (f"rec_{req.receipt_number}_{canonical_phone}")
        if not req.force_resend and idem_key:
            existing = await self._check_idempotency(store_id, idem_key)
            if existing:
                return WhatsAppSendResponse(
                    success=True,
                    status="already_sent",
                    message_id=existing.get("provider_message_id"),
                    phone_number=canonical_phone,
                    is_duplicate=True,
                    detail=f"Receipt {req.receipt_number} was already sent to {canonical_phone}.",
                )

        self._check_rate_limit(store_id, canonical_phone, force=req.force_resend)

        conn_status = await self.get_status(store_id)
        if conn_status.status != "connected":
            raise WhatsAppNotConnectedException()

        session_id = self.get_session_id_for_store(store_id)
        biz_name = await self._fetch_business_name(store_id)
        sym = req.currency_symbol or "₹"

        inv_text = f"• Against Invoice: {req.invoice_number}\n" if req.invoice_number else ""
        bal_text = f"• Remaining Balance: {sym}{req.remaining_balance:,.2f}\n" if req.remaining_balance > 0 else "• Remaining Balance: *Settled (₹0.00)*\n"
        notes_text = f"\nNote: {req.custom_notes}" if req.custom_notes else ""

        message_body = (
            f"🧾 *Payment Receipt*\n\n"
            f"Receipt No: *{req.receipt_number}*\n"
            f"Customer: {req.customer_name}\n\n"
            f"• Amount Received: *{sym}{req.amount_received:,.2f}*\n"
            f"• Mode: {req.payment_method}\n"
            f"{inv_text}"
            f"{bal_text}"
            f"{notes_text}\n"
            f"Thank you for your payment!\n"
            f"*{biz_name}*"
        )

        has_doc = bool(req.document_base64)
        filename = req.document_filename or f"Receipt_{req.receipt_number}.pdf"

        try:
            if has_doc:
                res = await self.provider.send_document(
                    session_id=session_id,
                    phone=canonical_phone,
                    document_base64=req.document_base64 or "",
                    filename=filename,
                    caption=message_body,
                )
            else:
                res = await self.provider.send_text(
                    session_id=session_id,
                    phone=canonical_phone,
                    text=message_body,
                )

            msg_id = res.get("message_id")
            await self._log_message(
                store_id=store_id,
                user_id=user_id,
                phone_number=canonical_phone,
                message_type="receipt",
                status="sent",
                message_content=message_body,
                has_attachment=has_doc,
                attachment_filename=filename if has_doc else None,
                provider_message_id=msg_id,
                idempotency_key=idem_key,
                payment_id=req.payment_id,
            )

            return WhatsAppSendResponse(
                success=True,
                status="sent",
                message_id=msg_id,
                phone_number=canonical_phone,
                detail=f"Receipt {req.receipt_number} sent successfully to {canonical_phone}.",
            )
        except Exception as exc:
            logger.error("Failed to send WhatsApp receipt: %s", exc)
            await self._log_message(
                store_id=store_id,
                user_id=user_id,
                phone_number=canonical_phone,
                message_type="receipt",
                status="failed",
                message_content=message_body,
                has_attachment=has_doc,
                attachment_filename=filename if has_doc else None,
                error_message=str(exc),
                idempotency_key=idem_key,
                payment_id=req.payment_id,
            )
            raise WhatsAppException(f"Failed to deliver WhatsApp message: {str(exc)}") from exc

    async def send_reminder(
        self,
        store_id: str,
        user_id: str,
        req: WhatsAppSendReminderRequest,
    ) -> WhatsAppSendResponse:
        """
        Sends an outstanding balance reminder.
        """
        canonical_phone, _ = normalize_indian_phone(req.customer_phone)

        idem_key = req.idempotency_key or f"rem_{req.party_id or req.invoice_number}_{canonical_phone}"
        if not req.force_resend and idem_key:
            existing = await self._check_idempotency(store_id, idem_key)
            if existing:
                return WhatsAppSendResponse(
                    success=True,
                    status="already_sent",
                    message_id=existing.get("provider_message_id"),
                    phone_number=canonical_phone,
                    is_duplicate=True,
                    detail=f"Payment reminder was already sent to {canonical_phone}.",
                )

        self._check_rate_limit(store_id, canonical_phone, force=req.force_resend)

        conn_status = await self.get_status(store_id)
        if conn_status.status != "connected":
            raise WhatsAppNotConnectedException()

        session_id = self.get_session_id_for_store(store_id)
        biz_name = await self._fetch_business_name(store_id)
        sym = req.currency_symbol or "₹"

        inv_text = f"regarding invoice *{req.invoice_number}*" if req.invoice_number else "regarding your pending balance"
        due_text = f"\n• Due Date: {req.due_date}" if req.due_date else ""
        notes_text = f"\n\nNote: {req.custom_notes}" if req.custom_notes else ""

        message_body = (
            f"Hello {req.customer_name},\n\n"
            f"This is a gentle payment reminder from *{biz_name}* {inv_text}.\n\n"
            f"• Outstanding Amount: *{sym}{req.outstanding_amount:,.2f}*"
            f"{due_text}"
            f"{notes_text}\n\n"
            f"Please arrange the payment at your earliest convenience.\n\n"
            f"Thank you,\n"
            f"*{biz_name}*"
        )

        try:
            res = await self.provider.send_text(
                session_id=session_id,
                phone=canonical_phone,
                text=message_body,
            )

            msg_id = res.get("message_id")
            await self._log_message(
                store_id=store_id,
                user_id=user_id,
                phone_number=canonical_phone,
                message_type="reminder",
                status="sent",
                message_content=message_body,
                provider_message_id=msg_id,
                idempotency_key=idem_key,
                party_id=req.party_id,
            )

            return WhatsAppSendResponse(
                success=True,
                status="sent",
                message_id=msg_id,
                phone_number=canonical_phone,
                detail=f"Reminder sent successfully to {canonical_phone}.",
            )
        except Exception as exc:
            logger.error("Failed to send WhatsApp reminder: %s", exc)
            await self._log_message(
                store_id=store_id,
                user_id=user_id,
                phone_number=canonical_phone,
                message_type="reminder",
                status="failed",
                message_content=message_body,
                error_message=str(exc),
                idempotency_key=idem_key,
                party_id=req.party_id,
            )
            raise WhatsAppException(f"Failed to deliver WhatsApp message: {str(exc)}") from exc

    async def send_custom_message(
        self,
        store_id: str,
        user_id: str,
        req: WhatsAppSendMessageRequest,
    ) -> WhatsAppSendResponse:
        """
        Sends a custom message or notification with optional attachment.
        """
        canonical_phone, _ = normalize_indian_phone(req.phone_number)

        if not req.force_resend and req.idempotency_key:
            existing = await self._check_idempotency(store_id, req.idempotency_key)
            if existing:
                return WhatsAppSendResponse(
                    success=True,
                    status="already_sent",
                    message_id=existing.get("provider_message_id"),
                    phone_number=canonical_phone,
                    is_duplicate=True,
                    detail=f"Message was already delivered to {canonical_phone}.",
                )

        self._check_rate_limit(store_id, canonical_phone, force=req.force_resend)

        conn_status = await self.get_status(store_id)
        if conn_status.status != "connected":
            raise WhatsAppNotConnectedException()

        session_id = self.get_session_id_for_store(store_id)
        has_doc = bool(req.document_base64)
        filename = req.document_filename or "document.pdf"

        try:
            if has_doc:
                res = await self.provider.send_document(
                    session_id=session_id,
                    phone=canonical_phone,
                    document_base64=req.document_base64 or "",
                    filename=filename,
                    caption=req.message,
                )
            else:
                res = await self.provider.send_text(
                    session_id=session_id,
                    phone=canonical_phone,
                    text=req.message,
                )

            msg_id = res.get("message_id")
            await self._log_message(
                store_id=store_id,
                user_id=user_id,
                phone_number=canonical_phone,
                message_type=req.message_type or "custom",
                status="sent",
                message_content=req.message,
                has_attachment=has_doc,
                attachment_filename=filename if has_doc else None,
                provider_message_id=msg_id,
                idempotency_key=req.idempotency_key,
            )

            return WhatsAppSendResponse(
                success=True,
                status="sent",
                message_id=msg_id,
                phone_number=canonical_phone,
                detail=f"Message sent successfully to {canonical_phone}.",
            )
        except Exception as exc:
            logger.error("Failed to send custom WhatsApp message: %s", exc)
            await self._log_message(
                store_id=store_id,
                user_id=user_id,
                phone_number=canonical_phone,
                message_type=req.message_type or "custom",
                status="failed",
                message_content=req.message,
                has_attachment=has_doc,
                attachment_filename=filename if has_doc else None,
                error_message=str(exc),
                idempotency_key=req.idempotency_key,
            )
            raise WhatsAppException(f"Failed to deliver WhatsApp message: {str(exc)}") from exc

    async def list_messages(
        self, store_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Retrieves recent message logs for audit history."""
        if not supabase_client:
            return []

        try:
            res = (
                supabase_client.table("whatsapp_messages")
                .select("*")
                .eq("store_id", store_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            data = getattr(res, "data", None)
            return data if isinstance(data, list) else []
        except Exception as exc:
            logger.warning("Could not fetch messages for store %s: %s", store_id, exc)
            return []
