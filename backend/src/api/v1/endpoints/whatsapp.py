import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request

from src.api.deps import get_current_user
from src.core.supabase import supabase_client
from src.services.whatsapp.service import WhatsAppService
from src.services.whatsapp.exceptions import (
    WhatsAppException,
    WhatsAppNotConnectedException,
    WhatsAppGatewayUnavailableException,
    WhatsAppRateLimitException,
    WhatsAppInvalidPhoneException,
)
from src.schemas.whatsapp import (
    WhatsAppConnectionResponse,
    WhatsAppConnectRequest,
    WhatsAppQRCodeResponse,
    WhatsAppDisconnectResponse,
    WhatsAppSendInvoiceRequest,
    WhatsAppSendReceiptRequest,
    WhatsAppSendReminderRequest,
    WhatsAppSendMessageRequest,
    WhatsAppTestMessageRequest,
    WhatsAppSendResponse,
    WhatsAppMessageLogItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Integration (OpenWA)"])
whatsapp_service = WhatsAppService()


def _resolve_tenant_context(user_info: dict) -> tuple[str, str]:
    """
    Enforces strict tenant isolation.
    Resolves store_id (business owner) and user_id (caller).
    If user is an assigned store salesman, store_id points to their store.
    """
    user_id = user_info.get("user_id")
    email = user_info.get("email")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    store_id = user_id
    if supabase_client and email:
        try:
            sm_res = (
                supabase_client.table("store_salesmen")
                .select("store_id, is_active")
                .eq("salesman_email", email.lower())
                .maybe_single()
                .execute()
            )
            sm_data = getattr(sm_res, "data", None)
            if isinstance(sm_data, dict):
                if sm_data.get("is_active") is not False and sm_data.get("store_id"):
                    store_id = str(sm_data["store_id"])
        except Exception as exc:
            logger.debug("Error checking salesman status: %s", exc)

    return store_id, user_id


def _handle_whatsapp_exceptions(exc: Exception):
    """Translates domain WhatsApp exceptions to standard HTTPExceptions."""
    if isinstance(exc, HTTPException):
        raise exc
    if isinstance(exc, WhatsAppNotConnectedException):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    if isinstance(exc, WhatsAppInvalidPhoneException):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    if isinstance(exc, WhatsAppRateLimitException):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=exc.message)
    if isinstance(exc, WhatsAppGatewayUnavailableException):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.message)
    if isinstance(exc, WhatsAppException):
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    logger.exception("Unexpected error during WhatsApp operation")
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get("/status", response_model=WhatsAppConnectionResponse)
async def get_whatsapp_status(
    user_info: dict = Depends(get_current_user),
):
    """
    Retrieves the current WhatsApp connection state for the authenticated business.
    """
    store_id, _ = _resolve_tenant_context(user_info)
    try:
        return await whatsapp_service.get_status(store_id)
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.post("/connect")
async def connect_whatsapp(
    request: WhatsAppConnectRequest = WhatsAppConnectRequest(),
    user_info: dict = Depends(get_current_user),
):
    """
    Initiates WhatsApp session with OpenWA gateway and returns QR code / connection status.
    """
    store_id, user_id = _resolve_tenant_context(user_info)
    try:
        return await whatsapp_service.connect(
            store_id=store_id,
            user_id=user_id,
            webhook_url=request.webhook_url,
        )
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.get("/qr", response_model=WhatsAppQRCodeResponse)
async def get_whatsapp_qr(
    user_info: dict = Depends(get_current_user),
):
    """
    Fetches the latest QR code for scanning.
    """
    store_id, _ = _resolve_tenant_context(user_info)
    try:
        conn = await whatsapp_service.get_status(store_id)
        if conn.status == "connected":
            return WhatsAppQRCodeResponse(
                status="connected",
                message="WhatsApp is already connected for this store.",
            )

        qr = await whatsapp_service.get_qr(store_id)
        if not qr:
            qr = conn.qr_code_data

        return WhatsAppQRCodeResponse(
            status=conn.status,
            qr_code=qr,
            message="Scan this QR code using WhatsApp -> Linked Devices -> Link a Device." if qr else "QR code is being generated by the gateway. Please wait...",
        )
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.post("/disconnect", response_model=WhatsAppDisconnectResponse)
async def disconnect_whatsapp(
    user_info: dict = Depends(get_current_user),
):
    """
    Terminates the WhatsApp session and unlinks device.
    """
    store_id, _ = _resolve_tenant_context(user_info)
    try:
        success = await whatsapp_service.disconnect(store_id)
        return WhatsAppDisconnectResponse(
            success=success,
            status="disconnected",
            message="WhatsApp has been disconnected successfully.",
        )
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.post("/test-message", response_model=WhatsAppSendResponse)
async def send_test_message(
    request: WhatsAppTestMessageRequest,
    user_info: dict = Depends(get_current_user),
):
    """
    Sends a test verification message to the merchant's specified phone number.
    """
    store_id, user_id = _resolve_tenant_context(user_info)
    try:
        msg_req = WhatsAppSendMessageRequest(
            phone_number=request.phone_number,
            message=request.message or "Hello from FinFlow! WhatsApp connection verified. 🚀",
            message_type="custom",
            force_resend=True,
        )
        return await whatsapp_service.send_custom_message(
            store_id=store_id,
            user_id=user_id,
            req=msg_req,
        )
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.post("/send-invoice", response_model=WhatsAppSendResponse)
async def send_invoice_endpoint(
    request: WhatsAppSendInvoiceRequest,
    user_info: dict = Depends(get_current_user),
):
    """
    Sends an invoice summary and optional PDF document via WhatsApp.
    """
    store_id, user_id = _resolve_tenant_context(user_info)
    try:
        return await whatsapp_service.send_invoice(
            store_id=store_id,
            user_id=user_id,
            req=request,
        )
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.post("/send-receipt", response_model=WhatsAppSendResponse)
async def send_receipt_endpoint(
    request: WhatsAppSendReceiptRequest,
    user_info: dict = Depends(get_current_user),
):
    """
    Sends a payment receipt confirmation via WhatsApp.
    """
    store_id, user_id = _resolve_tenant_context(user_info)
    try:
        return await whatsapp_service.send_receipt(
            store_id=store_id,
            user_id=user_id,
            req=request,
        )
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.post("/send-reminder", response_model=WhatsAppSendResponse)
async def send_reminder_endpoint(
    request: WhatsAppSendReminderRequest,
    user_info: dict = Depends(get_current_user),
):
    """
    Sends an outstanding payment reminder via WhatsApp.
    """
    store_id, user_id = _resolve_tenant_context(user_info)
    try:
        return await whatsapp_service.send_reminder(
            store_id=store_id,
            user_id=user_id,
            req=request,
        )
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.post("/send-message", response_model=WhatsAppSendResponse)
async def send_message_endpoint(
    request: WhatsAppSendMessageRequest,
    user_info: dict = Depends(get_current_user),
):
    """
    Sends a general message with optional PDF attachment.
    """
    store_id, user_id = _resolve_tenant_context(user_info)
    try:
        return await whatsapp_service.send_custom_message(
            store_id=store_id,
            user_id=user_id,
            req=request,
        )
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.get("/messages")
async def get_message_logs(
    limit: int = Query(50, ge=1, le=100),
    user_info: dict = Depends(get_current_user),
):
    """
    Retrieves recent message audit logs for the store.
    """
    store_id, _ = _resolve_tenant_context(user_info)
    try:
        return await whatsapp_service.list_messages(store_id=store_id, limit=limit)
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.post("/webhook")
async def openwa_webhook(request: Request):
    """
    Event-driven webhook for OpenWA session and message state synchronization.
    Supports events like session:ready, session:disconnected, etc.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    event = body.get("event") or body.get("type") or "unknown"
    session_id = body.get("session") or body.get("sessionId")
    logger.info("Received OpenWA webhook event '%s' for session '%s'", event, session_id)

    # If session matches finflow_store_<clean_store_id>
    if session_id and session_id.startswith("finflow_store_") and supabase_client:
        try:
            if event in ("session:ready", "session:authenticated", "session.ready"):
                supabase_client.table("whatsapp_connections").update({
                    "status": "connected",
                    "qr_code_data": None,
                    "last_connected_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("provider_session_id", session_id).execute()
            elif event in ("session:disconnected", "session.disconnected"):
                supabase_client.table("whatsapp_connections").update({
                    "status": "disconnected",
                    "qr_code_data": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("provider_session_id", session_id).execute()
        except Exception as exc:
            logger.warning("Could not persist webhook event state to database: %s", exc)

    return {"received": True, "event": event}
