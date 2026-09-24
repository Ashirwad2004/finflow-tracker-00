import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

from src.main import app
from src.services.whatsapp.phone_utils import normalize_indian_phone, format_whatsapp_chat_id
from src.services.whatsapp.exceptions import (
    WhatsAppException,
    WhatsAppNotConnectedException,
    WhatsAppGatewayUnavailableException,
    WhatsAppRateLimitException,
    WhatsAppInvalidPhoneException,
)
from src.services.whatsapp.openwa_client import OpenWAClient
from src.services.whatsapp.openwa_provider import OpenWAProvider
from src.services.whatsapp.service import WhatsAppService
from src.schemas.whatsapp import (
    WhatsAppSendInvoiceRequest,
    WhatsAppSendReceiptRequest,
    WhatsAppSendReminderRequest,
    WhatsAppSendMessageRequest,
)


# -----------------------------------------------------------------------------
# Phone Number Normalization Tests
# -----------------------------------------------------------------------------

def test_indian_phone_normalization_valid_10_digits():
    canonical, display = normalize_indian_phone("9876543210")
    assert canonical == "919876543210"
    assert display == "+91 98765 43210"


def test_indian_phone_normalization_with_spaces_dashes():
    canonical, display = normalize_indian_phone("+91 98765-43210")
    assert canonical == "919876543210"
    assert display == "+91 98765 43210"


def test_indian_phone_normalization_leading_zero():
    canonical, display = normalize_indian_phone("09876543210")
    assert canonical == "919876543210"


def test_indian_phone_normalization_invalid_starting_digit():
    with pytest.raises(WhatsAppInvalidPhoneException):
        normalize_indian_phone("2876543210")  # Indian numbers do not start with 2


def test_indian_phone_normalization_too_short():
    with pytest.raises(WhatsAppInvalidPhoneException):
        normalize_indian_phone("12345")


def test_whatsapp_chat_id_formatting():
    chat_id = format_whatsapp_chat_id("919876543210")
    assert chat_id == "919876543210@c.us"


# -----------------------------------------------------------------------------
# OpenWA Provider & Client Unit Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_openwa_provider_status_mapping():
    provider = OpenWAProvider(client=MagicMock())
    assert provider._normalize_openwa_status("CONNECTED") == "connected"
    assert provider._normalize_openwa_status("READY") == "connected"
    assert provider._normalize_openwa_status("SCAN_QR_CODE") == "qr_required"
    assert provider._normalize_openwa_status("STARTING") == "connecting"
    assert provider._normalize_openwa_status("STOPPED") == "disconnected"
    assert provider._normalize_openwa_status("UNKNOWN_FAILURE") == "error"


@pytest.mark.asyncio
async def test_openwa_client_unavailable():
    client = OpenWAClient(base_url="http://localhost:9999", timeout=1)
    with pytest.raises(WhatsAppGatewayUnavailableException):
        await client.start_session("test_session")


# -----------------------------------------------------------------------------
# Tenant Isolation & Deterministic Session ID Tests
# -----------------------------------------------------------------------------

def test_tenant_session_id_isolation():
    store_a = "11111111-1111-1111-1111-111111111111"
    store_b = "22222222-2222-2222-2222-222222222222"

    session_a = WhatsAppService.get_session_id_for_store(store_a)
    session_b = WhatsAppService.get_session_id_for_store(store_b)

    assert session_a != session_b
    assert "11111111111111111111111111111111" in session_a
    assert "22222222222222222222222222222222" in session_b


# -----------------------------------------------------------------------------
# WhatsApp Service In-Memory / Mock Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_invoice_not_connected():
    mock_provider = MagicMock()
    service = WhatsAppService(provider=mock_provider)

    # Mock get_status to return disconnected
    with patch.object(service, "get_status", new_callable=AsyncMock) as mock_get_status:
        mock_get_status.return_value = MagicMock(status="disconnected")

        req = WhatsAppSendInvoiceRequest(
            invoice_number="INV-1024",
            customer_name="Rahul Kumar",
            customer_phone="9876543210",
            total_amount=4500.0,
            amount_paid=2000.0,
            balance_due=2500.0,
        )

        with pytest.raises(WhatsAppNotConnectedException):
            await service.send_invoice("store_123", "user_123", req)


@pytest.mark.asyncio
async def test_send_invoice_success_and_message_content():
    mock_provider = MagicMock()
    mock_provider.name = "openwa"
    mock_provider.send_text = AsyncMock(return_value={"message_id": "wa_msg_999", "status": "sent"})
    mock_provider.send_document = AsyncMock(return_value={"message_id": "wa_doc_888", "status": "sent"})

    service = WhatsAppService(provider=mock_provider)

    with patch.object(service, "get_status", new_callable=AsyncMock) as mock_status, \
         patch.object(service, "_fetch_business_name", new_callable=AsyncMock) as mock_biz, \
         patch.object(service, "_log_message", new_callable=AsyncMock) as mock_log, \
         patch.object(service, "_check_idempotency", new_callable=AsyncMock) as mock_idem:

        mock_status.return_value = MagicMock(status="connected")
        mock_biz.return_value = "ABC Traders"
        mock_idem.return_value = None
        mock_log.return_value = "log_uuid_1"

        req = WhatsAppSendInvoiceRequest(
            invoice_id="inv_abc_1",
            invoice_number="INV-1024",
            customer_name="Rahul Kumar",
            customer_phone="9876543210",
            total_amount=4500.0,
            amount_paid=2000.0,
            balance_due=2500.0,
            currency_symbol="₹",
            force_resend=True,
        )

        resp = await service.send_invoice("store_123", "user_123", req)
        assert resp.success is True
        assert resp.status == "sent"
        assert resp.message_id == "wa_msg_999"
        assert resp.phone_number == "919876543210"

        # Verify sent text content
        call_args = mock_provider.send_text.call_args
        assert "INV-1024" in call_args.kwargs["text"]
        assert "ABC Traders" in call_args.kwargs["text"]
        assert "₹4,500.00" in call_args.kwargs["text"]
        assert "₹2,500.00" in call_args.kwargs["text"]


@pytest.mark.asyncio
async def test_idempotency_duplicate_protection():
    mock_provider = MagicMock()
    mock_provider.name = "openwa"
    mock_provider.send_text = AsyncMock()

    service = WhatsAppService(provider=mock_provider)

    with patch.object(service, "_check_idempotency", new_callable=AsyncMock) as mock_idem:
        # Simulate previously delivered message found in DB
        mock_idem.return_value = {
            "id": "existing_log_1",
            "status": "sent",
            "provider_message_id": "wa_msg_already_sent",
            "phone_number": "919876543210",
        }

        req = WhatsAppSendInvoiceRequest(
            invoice_id="inv_abc_1",
            invoice_number="INV-1024",
            customer_name="Rahul",
            customer_phone="9876543210",
            total_amount=1000.0,
            force_resend=False,  # Regular automatic send
        )

        resp = await service.send_invoice("store_123", "user_123", req)
        assert resp.success is True
        assert resp.is_duplicate is True
        assert resp.status == "already_sent"
        assert resp.message_id == "wa_msg_already_sent"

        # Provider send_text should NOT have been invoked
        mock_provider.send_text.assert_not_called()


@pytest.mark.asyncio
async def test_send_payment_receipt_success():
    mock_provider = MagicMock()
    mock_provider.name = "openwa"
    mock_provider.send_text = AsyncMock(return_value={"message_id": "wa_rec_111", "status": "sent"})

    service = WhatsAppService(provider=mock_provider)

    with patch.object(service, "get_status", new_callable=AsyncMock) as mock_status, \
         patch.object(service, "_fetch_business_name", new_callable=AsyncMock) as mock_biz, \
         patch.object(service, "_log_message", new_callable=AsyncMock) as mock_log, \
         patch.object(service, "_check_idempotency", new_callable=AsyncMock) as mock_idem:

        mock_status.return_value = MagicMock(status="connected")
        mock_biz.return_value = "ABC Traders"
        mock_idem.return_value = None

        req = WhatsAppSendReceiptRequest(
            receipt_number="REC-2026-0001",
            customer_name="Rahul Kumar",
            customer_phone="9876543210",
            amount_received=2000.0,
            invoice_number="INV-1024",
            remaining_balance=2500.0,
            payment_method="UPI",
            force_resend=True,
        )

        resp = await service.send_receipt("store_123", "user_123", req)
        assert resp.success is True
        assert resp.status == "sent"
        assert resp.message_id == "wa_rec_111"

        sent_text = mock_provider.send_text.call_args.kwargs["text"]
        assert "Payment Receipt" in sent_text
        assert "REC-2026-0001" in sent_text
        assert "₹2,000.00" in sent_text
        assert "INV-1024" in sent_text


@pytest.mark.asyncio
async def test_send_outstanding_reminder():
    mock_provider = MagicMock()
    mock_provider.name = "openwa"
    mock_provider.send_text = AsyncMock(return_value={"message_id": "wa_rem_222", "status": "sent"})

    service = WhatsAppService(provider=mock_provider)

    with patch.object(service, "get_status", new_callable=AsyncMock) as mock_status, \
         patch.object(service, "_fetch_business_name", new_callable=AsyncMock) as mock_biz, \
         patch.object(service, "_log_message", new_callable=AsyncMock) as mock_log, \
         patch.object(service, "_check_idempotency", new_callable=AsyncMock) as mock_idem:

        mock_status.return_value = MagicMock(status="connected")
        mock_biz.return_value = "ABC Traders"
        mock_idem.return_value = None

        req = WhatsAppSendReminderRequest(
            customer_name="Rahul Kumar",
            customer_phone="9876543210",
            outstanding_amount=2500.0,
            invoice_number="INV-1024",
            force_resend=True,
        )

        resp = await service.send_reminder("store_123", "user_123", req)
        assert resp.success is True
        assert resp.status == "sent"
        assert resp.message_id == "wa_rem_222"

        sent_text = mock_provider.send_text.call_args.kwargs["text"]
        assert "payment reminder" in sent_text
        assert "₹2,500.00" in sent_text


# -----------------------------------------------------------------------------
# API Endpoints & Auth Verification
# -----------------------------------------------------------------------------

def test_api_status_unauthorized(client):
    response = client.get("/api/v1/whatsapp/status")
    # Must reject without token
    assert response.status_code == 401


def test_api_connect_unauthorized(client):
    response = client.post("/api/v1/whatsapp/connect", json={})
    assert response.status_code == 401


def test_api_webhook_openwa(client):
    response = client.post(
        "/api/v1/whatsapp/webhook",
        json={"event": "session:ready", "session": "finflow_store_123"},
    )
    assert response.status_code == 200
    assert response.json()["received"] is True
