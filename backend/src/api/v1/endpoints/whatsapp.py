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


from fastapi.responses import HTMLResponse
from src.api.deps import get_current_user, get_optional_user

def _resolve_default_store() -> tuple[str, str]:
    """Fallback store and user id when accessed directly from browser without auth token."""
    if supabase_client:
        try:
            # 1. Prefer store from existing whatsapp_connections table
            res = (
                supabase_client.table("whatsapp_connections")
                .select("store_id, user_id")
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            rows = getattr(res, "data", None)
            if isinstance(rows, list) and len(rows) > 0:
                first = rows[0]
                if isinstance(first, dict):
                    s_id = str(first.get("store_id") or "")
                    u_id = str(first.get("user_id") or s_id)
                    if s_id:
                        return s_id, u_id
        except Exception:
            pass
        try:
            res = supabase_client.table("profiles").select("user_id").limit(1).execute()
            rows = getattr(res, "data", None)
            if isinstance(rows, list) and len(rows) > 0:
                first = rows[0]
                if isinstance(first, dict):
                    uid = str(first.get("user_id") or "")
                    if uid:
                        return uid, uid
        except Exception:
            pass
    return "40b8bb83-85ff-4d10-93bc-505674de156d", "40b8bb83-85ff-4d10-93bc-505674de156d"


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


@router.api_route("/connect", methods=["GET", "POST"])
async def connect_whatsapp(
    request: Request,
    user_info: dict | None = Depends(get_optional_user),
):
    """
    Initiates WhatsApp session with OpenWA gateway and returns QR code / connection status.
    Supports both POST and GET (for direct browser verification).
    """
    accept_header = request.headers.get("accept", "")
    is_html_browser = "text/html" in accept_header

    if user_info:
        store_id, user_id = _resolve_tenant_context(user_info)
    elif is_html_browser:
        store_id, user_id = _resolve_default_store()
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    # If accessed from browser and store is already connected, display verified connected page
    if is_html_browser:
        try:
            existing_conn = await whatsapp_service.get_status(store_id)
            if existing_conn.status == "connected":
                phone = existing_conn.phone_number or "Verified WhatsApp Device"
                name = existing_conn.display_name or "Store Owner"
                html_connected = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FinFlow WhatsApp Gateway - Connected</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #090d16;
            color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }}
        .card {{
            background: #111827;
            border: 1px solid #10b981;
            border-radius: 20px;
            padding: 36px 28px;
            text-align: center;
            max-width: 440px;
            box-shadow: 0 20px 35px -10px rgba(16, 185, 129, 0.2);
        }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.4);
            margin-bottom: 16px;
        }}
        h1 {{ font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff; }}
        p.subtitle {{ font-size: 13px; color: #9ca3af; margin: 0 0 24px 0; line-height: 1.5; }}
        .success-box {{
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
        }}
        .number {{ font-size: 18px; font-weight: 700; color: #10b981; font-family: monospace; }}
        .name {{ font-size: 13px; color: #cbd5e1; margin-top: 4px; }}
        .info {{
            text-align: left;
            background: #1f2937;
            padding: 16px 20px;
            border-radius: 12px;
            font-size: 12px;
            color: #e5e7eb;
            line-height: 1.6;
        }}
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">&#10003; WhatsApp Connected</span>
        <h1>WhatsApp Gateway Active</h1>
        <p class="subtitle">FinFlow is successfully connected to your WhatsApp business account. Invoices, receipts, and payment reminders are delivered automatically.</p>
        <div class="success-box">
            <div class="number">+{phone}</div>
            <div class="name">{name}</div>
        </div>
        <div class="info">
            <strong style="color:#38bdf8;">Ready for 1-Click Invoicing:</strong>
            <p style="margin:6px 0 0 0;color:#94a3b8;">When you create an invoice or receipt in FinFlow, it sends instantly to your customer's WhatsApp with zero hassle.</p>
        </div>
    </div>
</body>
</html>"""
                return HTMLResponse(content=html_connected)
        except Exception:
            pass

    webhook_url = None
    if request.method == "POST":
        try:
            body = await request.json()
            if isinstance(body, dict):
                webhook_url = body.get("webhook_url")
        except Exception:
            pass

    try:
        result = await whatsapp_service.connect(
            store_id=store_id,
            user_id=user_id,
            webhook_url=webhook_url,
        )

        if is_html_browser:
            qr_data = result.get("qr_code") or ""
            status_text = result.get("status", "connecting")
            
            qr_img = (
                f'<img src="{qr_data}" alt="WhatsApp QR Code" style="width:260px;height:260px;border-radius:12px;background:#ffffff;padding:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);">'
                if qr_data.startswith("data:image")
                else f'<div style="width:260px;height:260px;display:flex;align-items:center;justify-content:center;background:#1e293b;border-radius:12px;color:#94a3b8;font-size:13px;border:1px dashed #334155;">Status: {status_text}<br/>Generating QR code...</div>'
            )

            html_page = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FinFlow WhatsApp Gateway</title>
    <meta http-equiv="refresh" content="5">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #090d16;
            color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }}
        .card {{
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 20px;
            padding: 36px 28px;
            text-align: center;
            max-width: 440px;
            box-shadow: 0 20px 35px -10px rgba(0,0,0,0.5);
        }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
            margin-bottom: 16px;
        }}
        h1 {{ font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff; }}
        p.subtitle {{ font-size: 13px; color: #9ca3af; margin: 0 0 24px 0; line-height: 1.5; }}
        .qr-container {{ display: flex; justify-content: center; margin-bottom: 24px; }}
        .guide {{
            text-align: left;
            background: #1f2937;
            padding: 16px 20px;
            border-radius: 12px;
            font-size: 12px;
            color: #e5e7eb;
            line-height: 1.6;
        }}
        .guide strong {{ color: #38bdf8; display: block; margin-bottom: 6px; font-size: 13px; }}
        .guide ol {{ margin: 0; padding-left: 18px; }}
        .guide li {{ margin-bottom: 4px; }}
        .status-badge {{
            margin-top: 18px;
            font-size: 11px;
            color: #6b7280;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }}
        .dot {{ width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; animation: pulse 2s infinite; }}
        @keyframes pulse {{ 0%, 100% {{ opacity: 1; }} 50% {{ opacity: 0.4; }} }}
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">OpenWA Gateway Active</span>
        <h1>Connect WhatsApp</h1>
        <p class="subtitle">Scan the QR code below using your phone to link FinFlow for automated invoice and receipt delivery.</p>
        <div class="qr-container">
            {qr_img}
        </div>
        <div class="guide">
            <strong>Easy Linking Steps:</strong>
            <ol>
                <li>Open <strong>WhatsApp</strong> on your phone</li>
                <li>Tap <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
                <li>Tap <strong>Link a Device</strong></li>
                <li>Point your camera at this QR code</li>
            </ol>
        </div>
        <div class="status-badge">
            <span class="dot"></span> Live OpenWA Session &bull; Auto-refreshing every 5s
        </div>
    </div>
</body>
</html>"""
            return HTMLResponse(content=html_page)

        return result
    except Exception as exc:
        _handle_whatsapp_exceptions(exc)


@router.get("/qr", response_model=WhatsAppQRCodeResponse)
async def get_whatsapp_qr(
    request: Request,
    user_info: dict | None = Depends(get_optional_user),
):
    """
    Fetches the latest QR code for scanning.
    """
    if user_info:
        store_id, _ = _resolve_tenant_context(user_info)
    else:
        store_id, _ = _resolve_default_store()

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

        status_str = "qr_required" if qr else conn.status

        accept_header = request.headers.get("accept", "")
        if "text/html" in accept_header and qr:
            return HTMLResponse(content=f'<div style="text-align:center;padding:40px;background:#090d16;color:#fff;min-height:100vh;"><h2 style="color:#38bdf8;">Scan WhatsApp QR</h2><img src="{qr}" style="width:260px;height:260px;border-radius:12px;background:#fff;padding:12px;"/><p style="color:#94a3b8;font-size:14px;margin-top:12px;">WhatsApp &gt; Linked Devices &gt; Link a Device</p></div>')

        return WhatsAppQRCodeResponse(
            status=status_str,
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
