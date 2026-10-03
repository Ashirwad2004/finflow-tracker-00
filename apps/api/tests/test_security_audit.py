import uuid
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.core.config import settings
from src.api.deps import get_current_user, get_tenant_context

client = TestClient(app)

TENANT_A_ID = "11111111-1111-1111-1111-111111111111"
TENANT_B_ID = "22222222-2222-2222-2222-222222222222"


def override_tenant_a():
    return TENANT_A_ID, TENANT_A_ID


def override_user_a():
    return {"user_id": TENANT_A_ID, "email": "tenant_a@finflow.com"}


@pytest.fixture(autouse=True)
def clean_overrides():
    yield
    app.dependency_overrides.clear()


# =============================================================================
# 1. Authentication Security Tests
# =============================================================================

def test_unauthenticated_requests_rejected():
    """Verify that all protected endpoints strictly reject unauthenticated requests with 401."""
    protected_endpoints = [
        ("GET", "/api/v1/invoices"),
        ("POST", "/api/v1/invoices"),
        ("GET", "/api/v1/purchases"),
        ("POST", "/api/v1/purchases"),
        ("POST", "/api/v1/inventory/adjust"),
        ("GET", "/api/v1/inventory/movements"),
        ("GET", "/api/v1/inventory/valuation"),
        ("GET", "/api/v1/parties"),
        ("POST", "/api/v1/parties"),
        ("POST", "/api/v1/pos/shifts/open"),
        ("POST", "/api/v1/pos/cash-movements"),
        ("GET", "/api/v1/whatsapp/status"),
        ("POST", "/api/v1/whatsapp/connect"),
        ("POST", "/api/v1/payments/refund"),
        ("GET", "/api/v1/payments/admin/stats?storeId=some-id"),
        ("GET", "/api/v1/payments/admin/history?storeId=some-id"),
        ("GET", "/api/v1/reports/profit-loss"),
        ("GET", "/api/v1/reports/trial-balance"),
        ("GET", "/api/v1/reports/balance-sheet"),
        ("GET", "/api/v1/reports/receivables-aging"),
    ]

    for method, path in protected_endpoints:
        if method == "GET":
            response = client.get(path)
        else:
            response = client.post(path, json={})
        assert response.status_code == 401, f"Expected 401 for {method} {path}, got {response.status_code}"


def test_invalid_bearer_token_rejected():
    """Verify that forged/malformed Bearer tokens are rejected when JWT secret is configured."""
    with patch.object(settings, "SUPABASE_JWT_SECRET", "super-secret-jwt-key"):
        headers = {"Authorization": "Bearer invalid.fake.token"}
        response = client.get("/api/v1/invoices", headers=headers)
        assert response.status_code == 401


# =============================================================================
# 2. Tenant Isolation & IDOR Tests
# =============================================================================

def test_idor_pos_shift_summary_rejected_for_different_tenant(monkeypatch):
    """
    IDOR Protection: Verify that Merchant A cannot access Merchant B's POS shift summary.
    """
    app.dependency_overrides[get_current_user] = override_user_a
    victim_store_id = TENANT_B_ID
    victim_shift_id = str(uuid.uuid4())

    mock_shift_row = {
        "id": victim_shift_id,
        "store_id": victim_store_id,  # Belongs to Tenant B
        "opening_cash": 10000.0,
        "expected_cash": 15000.0,
    }

    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.maybe_single.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=mock_shift_row)

    mock_supabase = MagicMock()
    mock_supabase.table.return_value = mock_table
    monkeypatch.setattr("src.services.pos.supabase_client", mock_supabase)

    # Attacker A attempts to request Victim's shift summary
    response = client.get(
        f"/api/v1/pos/shifts/{victim_shift_id}/summary",
        headers={"Authorization": "Bearer valid_token_a"}
    )
    # Must be 404 access denied
    assert response.status_code == 404
    assert "access denied" in response.json()["detail"].lower() or "not found" in response.json()["detail"].lower()


def test_tenant_cannot_access_other_store_payment_admin_endpoints():
    """
    Verify horizontal privilege escalation prevention in payment admin statistics.
    """
    app.dependency_overrides[get_current_user] = override_user_a
    victim_store_id = TENANT_B_ID

    # Tenant A tries to inspect Victim's payment stats
    response = client.get(
        f"/api/v1/payments/admin/stats?storeId={victim_store_id}",
        headers={"Authorization": "Bearer valid_token_a"}
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]

    # Tenant A tries to inspect Victim's payment history
    response = client.get(
        f"/api/v1/payments/admin/history?storeId={victim_store_id}",
        headers={"Authorization": "Bearer valid_token_a"}
    )
    assert response.status_code == 403


def test_tenant_cannot_refund_other_merchants_payment(monkeypatch):
    """
    Verify that an attacker cannot trigger refunds on another merchant's payment ID.
    """
    app.dependency_overrides[get_current_user] = override_user_a
    victim_user_id = TENANT_B_ID
    payment_id = str(uuid.uuid4())

    victim_payment = {
        "id": payment_id,
        "user_id": victim_user_id,
        "amount": 500.0,
        "status": "success",
    }

    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[victim_payment])

    mock_supabase = MagicMock()
    mock_supabase.table.return_value = mock_table
    monkeypatch.setattr("src.api.v1.endpoints.payments.supabase_client", mock_supabase)

    response = client.post(
        "/api/v1/payments/refund",
        json={"paymentId": payment_id, "amount": 100.0, "reason": "malicious refund attempt"},
        headers={"Authorization": "Bearer valid_token_a"}
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]


# =============================================================================
# 3. Payment Verification & Privilege Escalation Tests
# =============================================================================

def test_subscription_plan_elevation_tampering_prevented(monkeypatch):
    """
    Verify that an attacker cannot upgrade to a higher tier by supplying a client-side planId
    when the underlying payment notes do NOT authorize that subscription.
    """
    user_id = TENANT_A_ID
    payment_id = str(uuid.uuid4())

    # Payment was for a standard ₹50 item with NO subscription plan notes
    normal_payment = {
        "id": payment_id,
        "user_id": user_id,
        "amount": 50.0,
        "status": "pending",
        "notes": {},  # No planId authorized by server!
    }

    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.upsert.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[normal_payment])

    mock_supabase = MagicMock()
    mock_supabase.table.return_value = mock_table
    monkeypatch.setattr("src.api.v1.endpoints.payments.supabase_client", mock_supabase)

    mock_driver = MagicMock()
    mock_driver.verify_payment = AsyncMock(return_value={
        "isValid": True,
        "paymentId": "pay_fake123",
        "paymentMethod": "card",
    })
    monkeypatch.setattr("src.api.v1.endpoints.payments.get_gateway_driver", lambda *args, **kwargs: mock_driver)

    # Attacker sends forged payload claiming "enterprise" plan
    response = client.post(
        "/api/v1/payments/verify-payment",
        json={
            "gatewayPaymentId": "pay_fake123",
            "gatewayOrderId": "order_fake123",
            "gatewaySignature": "sig_fake123",
            "planId": "enterprise",  # Malicious plan elevation attempt
        }
    )
    assert response.status_code == 200
    # Ensure subscription_status was NOT upserted with unauthorized plan
    for call in mock_supabase.table.call_args_list:
        table_name = call[0][0]
        if table_name == "subscription_status":
            pytest.fail("subscription_status should NOT have been touched for non-subscription payment!")


# =============================================================================
# 4. WhatsApp Webhook Security Tests
# =============================================================================

def test_whatsapp_webhook_secret_verification_enforced():
    """
    Verify that when OPENWA_WEBHOOK_SECRET is set, requests without valid secret are rejected with 401.
    """
    test_secret = "secret_auth_token_987654321"

    with patch.object(settings, "OPENWA_WEBHOOK_SECRET", test_secret):
        # 1. Request with missing secret
        res_missing = client.post(
            "/api/v1/whatsapp/webhook",
            json={"event": "session:disconnected", "sessionId": "finflow_store_12345"}
        )
        assert res_missing.status_code == 401
        assert "Invalid or missing webhook secret" in res_missing.json()["detail"]

        # 2. Request with incorrect secret
        res_wrong = client.post(
            "/api/v1/whatsapp/webhook",
            headers={"X-Webhook-Secret": "wrong_secret"},
            json={"event": "session:disconnected", "sessionId": "finflow_store_12345"}
        )
        assert res_wrong.status_code == 401

        # 3. Request with correct secret via X-Webhook-Secret
        res_correct = client.post(
            "/api/v1/whatsapp/webhook",
            headers={"X-Webhook-Secret": test_secret},
            json={"event": "session:ready", "sessionId": "finflow_store_12345"}
        )
        assert res_correct.status_code == 200
        assert res_correct.json()["received"] is True


def test_whatsapp_webhook_malformed_session_id_sanitized():
    """
    Verify that path traversal or injection strings in sessionId are safely ignored.
    """
    res = client.post(
        "/api/v1/whatsapp/webhook",
        json={"event": "session:disconnected", "sessionId": "finflow_store_../../etc/passwd"}
    )
    assert res.status_code == 200
    assert res.json().get("status") == "ignored_invalid_session"
