from datetime import datetime
import hashlib
import hmac
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.api.deps import get_current_user
from src.core.config import settings
from src.main import app
from src.modules.payments.drivers import RazorpayGateway
from src.modules.payments import router as payments


@pytest.fixture
def razorpay(monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "test-secret")
    gateway_client = MagicMock()
    gateway_client.order.fetch.return_value = {"currency": "INR"}
    gateway_client.payment.fetch.return_value = {
        "id": "pay-1", "order_id": "order-1", "status": "authorized",
        "amount": 10000, "currency": "INR", "method": "upi",
    }
    gateway_client.payment.capture.return_value = {
        **gateway_client.payment.fetch.return_value, "status": "captured",
    }
    driver = RazorpayGateway.__new__(RazorpayGateway)
    driver.ensure_client = MagicMock(return_value=gateway_client)
    signature = hmac.new(b"test-secret", b"order-1|pay-1", hashlib.sha256).hexdigest()
    return driver, gateway_client, signature


@pytest.mark.asyncio
async def test_razorpay_requires_successful_capture(razorpay):
    driver, gateway_client, signature = razorpay
    gateway_client.payment.capture.side_effect = RuntimeError("Capture unavailable")
    with pytest.raises(RuntimeError, match="Capture unavailable"):
        await driver.verify_payment("order-1", "pay-1", signature, 100, "INR")


@pytest.mark.asyncio
async def test_razorpay_rejects_capture_that_remains_authorized(razorpay):
    driver, gateway_client, signature = razorpay
    gateway_client.payment.capture.return_value["status"] = "authorized"
    with pytest.raises(ValueError, match="not been captured"):
        await driver.verify_payment("order-1", "pay-1", signature, 100, "INR")


@pytest.mark.asyncio
@pytest.mark.parametrize("field,value", [("order_id", "another-order"), ("amount", 1), ("currency", "USD")])
async def test_razorpay_checks_payment_before_capture(razorpay, field, value):
    driver, gateway_client, signature = razorpay
    gateway_client.payment.fetch.return_value[field] = value
    with pytest.raises(ValueError):
        await driver.verify_payment("order-1", "pay-1", signature, 100, "INR")
    gateway_client.payment.capture.assert_not_called()


@pytest.mark.asyncio
async def test_razorpay_captured_payment_succeeds(razorpay):
    driver, gateway_client, signature = razorpay
    result = await driver.verify_payment("order-1", "pay-1", signature, 100, "INR")
    assert result["success"] is True
    gateway_client.payment.capture.assert_called_once_with("pay-1", 10000)


def _query(data=None):
    query = MagicMock()
    for name in ("select", "eq", "update", "insert", "upsert"):
        getattr(query, name).return_value = query
    query.execute.return_value = SimpleNamespace(data=data)
    return query


@pytest.fixture
def payment_database(monkeypatch):
    payment = {
        "id": "payment-1", "user_id": "merchant-1", "amount": 100,
        "gateway": "razorpay", "gateway_payment_id": "pay-1", "status": "success",
    }
    tables = {"payments": _query([payment]), "refunds": _query([]), "payment_audit_logs": _query([])}
    database = MagicMock()
    database.table.side_effect = lambda name: tables.setdefault(name, _query([]))
    driver = SimpleNamespace(name="razorpay", refund=AsyncMock(return_value={"success": True, "refundId": "refund-1"}))
    select_driver = MagicMock(return_value=driver)
    monkeypatch.setattr(payments, "supabase_client", database)
    monkeypatch.setattr(payments, "get_gateway_driver", select_driver)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "merchant-1"}
    yield payment, tables, driver, select_driver
    app.dependency_overrides.pop(get_current_user, None)


def test_partial_refund_uses_recorded_gateway_and_preserves_balance(client, payment_database):
    _, tables, driver, select_driver = payment_database
    response = client.post("/api/v1/payments/refund", json={"paymentId": "payment-1", "amount": 25})
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert tables["payments"].update.call_args.args[0]["status"] == "success"
    select_driver.assert_called_once_with("razorpay")
    assert driver.refund.call_args.kwargs["amount"] == 25


def test_default_refund_refunds_remaining_balance(client, payment_database):
    _, tables, driver, _ = payment_database
    tables["refunds"].execute.return_value.data = [{"amount": 25}]
    response = client.post("/api/v1/payments/refund", json={"paymentId": "payment-1"})
    assert response.status_code == 200
    assert response.json()["status"] == "refunded"
    assert driver.refund.call_args.kwargs["amount"] == 75


def test_refund_rejects_amount_above_remaining_balance(client, payment_database):
    _, tables, driver, _ = payment_database
    tables["refunds"].execute.return_value.data = [{"amount": 75}]
    response = client.post("/api/v1/payments/refund", json={"paymentId": "payment-1", "amount": 50})
    assert response.status_code == 409
    driver.refund.assert_not_called()


def test_stats_subtract_partial_refunds(client, payment_database):
    payment, _, _, _ = payment_database
    payment["refunds"] = [{"amount": 25, "status": "success"}, {"amount": 10, "status": "failed"}]
    response = client.get("/api/v1/payments/admin/stats?storeId=merchant-1")
    assert response.status_code == 200
    stats = response.json()["stats"]
    assert stats["grossVolume"] == 100
    assert stats["totalRefunded"] == 25
    assert stats["netProfit"] == 75


def test_refunded_payment_cannot_be_verified_again(client, payment_database):
    payment, _, _, select_driver = payment_database
    payment["status"] = "refunded"
    response = client.post("/api/v1/payments/verify-payment", json={
        "gatewayOrderId": "order-1", "gatewayPaymentId": "pay-1", "gatewaySignature": "signature",
    })
    assert response.status_code == 409
    select_driver.assert_not_called()


def test_webhook_database_failure_is_retryable(client, monkeypatch):
    database = MagicMock()
    database.table.return_value.insert.return_value.execute.side_effect = RuntimeError("Database unavailable")
    driver = SimpleNamespace(name="razorpay", verify_webhook=lambda *_: {"isValid": True, "eventId": "event-1"})
    monkeypatch.setattr(payments, "supabase_client", database)
    monkeypatch.setattr(payments, "get_gateway_driver", lambda: driver)
    response = client.post("/api/v1/payments/webhook", json={})
    assert response.status_code == 503


def test_webhook_duplicate_is_acknowledged(client, monkeypatch):
    class DuplicateEvent(Exception):
        code = "23505"

    database = MagicMock()
    database.table.return_value.insert.return_value.execute.side_effect = DuplicateEvent()
    driver = SimpleNamespace(name="razorpay", verify_webhook=lambda *_: {"isValid": True, "eventId": "event-1"})
    monkeypatch.setattr(payments, "supabase_client", database)
    monkeypatch.setattr(payments, "get_gateway_driver", lambda: driver)
    response = client.post("/api/v1/payments/webhook", json={})
    assert response.status_code == 200
    assert response.json()["duplicate"] is True


@pytest.mark.parametrize("billing_cycle", ["monthly", "annual"])
def test_webhook_grants_six_month_license_for_both_legacy_cycles(client, payment_database, monkeypatch, billing_cycle):
    payment, tables, _, _ = payment_database
    payment.update(status="pending", notes={"planId": "business", "billingCycle": billing_cycle})
    driver = SimpleNamespace(name="razorpay", verify_webhook=lambda *_: {
        "isValid": True, "type": "payment.captured", "data": {"id": "order-1"},
    })
    monkeypatch.setattr(payments, "get_gateway_driver", lambda: driver)
    response = client.post("/api/v1/payments/webhook", json={})
    assert response.status_code == 200
    subscription = tables["subscription_status"].upsert.call_args.args[0]
    duration = datetime.fromisoformat(subscription["current_period_end"]) - datetime.fromisoformat(subscription["current_period_start"])
    assert duration.days == 183
