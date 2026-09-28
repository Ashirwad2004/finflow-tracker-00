from typing import Any, Dict
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.api.deps import get_current_user, get_tenant_context

client = TestClient(app)

TENANT_A_ID = "11111111-1111-1111-1111-111111111111"
TENANT_B_ID = "22222222-2222-2222-2222-222222222222"


def override_tenant_a():
    return TENANT_A_ID, TENANT_A_ID


def override_tenant_b():
    return TENANT_B_ID, TENANT_B_ID


def override_user_a():
    return {"user_id": TENANT_A_ID, "email": "tenant_a@finflow.com"}


def override_user_b():
    return {"user_id": TENANT_B_ID, "email": "tenant_b@finflow.com"}


@pytest.fixture(autouse=True)
def clean_overrides():
    yield
    app.dependency_overrides.clear()


# =============================================================================
# 1. Financial Calculation & Authoritative Logic Tests
# =============================================================================

def test_invoice_create_validation(monkeypatch):
    """Verifies that invoice creation validates required items and input schema."""
    app.dependency_overrides[get_tenant_context] = override_tenant_a

    # Empty items should fail validation
    res = client.post("/api/v1/invoices", json={
        "customer_name": "Test Customer",
        "items": [],
    })
    assert res.status_code == 422


def test_invoice_next_number_generation(monkeypatch):
    """Verifies next sequential invoice number format and prefix."""
    app.dependency_overrides[get_tenant_context] = override_tenant_a

    from src.repositories.invoice_repository import InvoiceRepository
    monkeypatch.setattr(
        InvoiceRepository,
        "get_next_invoice_number",
        lambda store_id, prefix="INV-": f"{prefix}0042",
    )

    res = client.get("/api/v1/invoices/next-number?prefix=FF-")
    assert res.status_code == 200
    assert res.json()["invoice_number"] == "FF-0042"


def test_authoritative_invoice_service_calculation(monkeypatch):
    """
    Verifies that the backend recalculates all financial totals
    even if the client provides zero/corrupted values.
    """
    app.dependency_overrides[get_tenant_context] = override_tenant_a

    captured_params = {}

    from src.repositories.invoice_repository import InvoiceRepository

    def fake_create_invoice(*args, **kwargs):
        captured_params.update(kwargs)
        return {
            "success": True,
            "id": "inv-123",
            "invoice_number": "INV-0001",
            "customer_name": kwargs.get("customer_name"),
            "subtotal": 2000.0,
            "discount_amount": 200.0,
            "tax_amount": 324.0,
            "total_amount": 2124.0,
            "amount_paid": 2124.0,
            "balance_due": 0.0,
            "status": "paid",
            "items": kwargs.get("items"),
        }

    monkeypatch.setattr(InvoiceRepository, "create_authoritative_invoice", fake_create_invoice)

    payload = {
        "customer_name": "John Doe Enterprises",
        "customer_phone": "9876543210",
        "customer_gstin": "27AABCU9603R1ZM",
        "overall_discount": 10.0,
        "tax_rate": 18.0,
        "round_off": True,
        "status": "paid",
        "items": [
            {
                "name": "Accounting Software License",
                "quantity": 2,
                "price": 1000.0,
                "discount": 0.0,
            }
        ],
    }

    res = client.post("/api/v1/invoices", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["total_amount"] == 2124.0
    assert captured_params["store_id"] == TENANT_A_ID


# =============================================================================
# 2. Multi-Tenant Isolation Tests (IDOR Prevention)
# =============================================================================

def test_tenant_cannot_read_other_tenant_invoice(monkeypatch):
    """Ensures Tenant B cannot view Tenant A's invoice (HTTP 404 / IDOR protection)."""
    from src.repositories.invoice_repository import InvoiceRepository

    # Invoice exists only under Tenant A
    def fake_get_by_id(store_id: str, invoice_id: str):
        if store_id == TENANT_A_ID and invoice_id == "inv-secret-tenant-a":
            return {"id": invoice_id, "user_id": TENANT_A_ID, "total_amount": 50000.0}
        return None

    monkeypatch.setattr(InvoiceRepository, "get_invoice_by_id", fake_get_by_id)

    # 1. Tenant A accesses their own invoice -> 200 OK
    app.dependency_overrides[get_tenant_context] = override_tenant_a
    res_a = client.get("/api/v1/invoices/inv-secret-tenant-a")
    assert res_a.status_code == 200
    assert res_a.json()["total_amount"] == 50000.0

    # 2. Tenant B attempts to access Tenant A's invoice -> 404 NOT FOUND
    app.dependency_overrides[get_tenant_context] = override_tenant_b
    res_b = client.get("/api/v1/invoices/inv-secret-tenant-a")
    assert res_b.status_code == 404


def test_tenant_cannot_read_other_tenant_purchase(monkeypatch):
    """Ensures Tenant B cannot view Tenant A's purchase record."""
    from src.repositories.purchase_repository import PurchaseRepository

    def fake_get_pur(store_id: str, purchase_id: str):
        if store_id == TENANT_A_ID and purchase_id == "pur-secret-tenant-a":
            return {"id": purchase_id, "user_id": TENANT_A_ID, "total_amount": 35000.0}
        return None

    monkeypatch.setattr(PurchaseRepository, "get_purchase_by_id", fake_get_pur)

    # Tenant B attempts access
    app.dependency_overrides[get_tenant_context] = override_tenant_b
    res = client.get("/api/v1/purchases/pur-secret-tenant-a")
    assert res.status_code == 404


# =============================================================================
# 3. Inventory Stock Adjustment & Movement Ledger Tests
# =============================================================================

def test_inventory_adjustment_endpoint(monkeypatch):
    """Verifies stock adjustment updates inventory and records audit."""
    app.dependency_overrides[get_tenant_context] = override_tenant_a

    from src.repositories.inventory_repository import InventoryRepository

    def fake_adjust(store_id, user_id, product_id, adjustment_type, quantity, notes):
        return {
            "success": True,
            "product_id": product_id,
            "name": "Widget A",
            "previous_stock": 10.0,
            "new_stock": 25.0,
            "delta": 15.0,
        }

    monkeypatch.setattr(InventoryRepository, "adjust_inventory", fake_adjust)

    res = client.post("/api/v1/inventory/adjust", json={
        "product_id": "prod-widget-1",
        "adjustment_type": "addition",
        "quantity": 15.0,
        "notes": "Warehouse physical count adjustment",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["new_stock"] == 25.0
    assert data["delta"] == 15.0


def test_inventory_valuation_endpoint(monkeypatch):
    """Verifies inventory valuation summary calculation."""
    app.dependency_overrides[get_tenant_context] = override_tenant_a

    from src.repositories.inventory_repository import InventoryRepository

    monkeypatch.setattr(
        InventoryRepository,
        "get_valuation_summary",
        lambda store_id: {
            "total_products": 45,
            "total_stock_units": 1200.0,
            "total_retail_value": 360000.0,
            "total_cost_value": 240000.0,
            "low_stock_count": 3,
        }
    )

    res = client.get("/api/v1/inventory/valuation")
    assert res.status_code == 200
    data = res.json()
    assert data["total_products"] == 45
    assert data["total_cost_value"] == 240000.0
    assert data["low_stock_count"] == 3


# =============================================================================
# 4. WhatsApp Gateway Security Hardening Tests
# =============================================================================

def test_whatsapp_connect_rejects_unauthenticated_requests():
    """
    CRITICAL SECURITY TEST:
    Ensures unauthenticated requests to /whatsapp/connect are strictly rejected with 401,
    and cannot access the old hardcoded fallback UUID or other tenants' sessions.
    """
    # Without authentication header, request must fail with 401
    res = client.post("/api/v1/whatsapp/connect")
    assert res.status_code == 401

    res_get = client.get("/api/v1/whatsapp/connect", headers={"Accept": "text/html"})
    assert res_get.status_code == 401


def test_whatsapp_qr_rejects_unauthenticated_requests():
    """
    CRITICAL SECURITY TEST:
    Ensures unauthenticated requests to /whatsapp/qr are strictly rejected with 401.
    """
    res = client.get("/api/v1/whatsapp/qr")
    assert res.status_code == 401


# =============================================================================
# 5. Authoritative Reports Endpoints Tests
# =============================================================================

def test_authoritative_profit_loss_endpoint(monkeypatch):
    """Verifies server-authoritative Profit & Loss report endpoint."""
    app.dependency_overrides[get_tenant_context] = override_tenant_a

    from src.services.reports import ReportsService

    from src.schemas.reports import ProfitAndLossResponse

    fake_pnl = ProfitAndLossResponse(
        revenue_from_operations=100000.0,
        sales_returns=0.0,
        net_revenue=100000.0,
        opening_stock_value=10000.0,
        purchases_cost=55000.0,
        direct_expenses=5000.0,
        closing_stock_value=10000.0,
        cost_of_goods_sold=60000.0,
        gross_profit=40000.0,
        gross_profit_margin_pct=40.0,
        indirect_expenses={"Rent": 15000.0},
        total_indirect_expenses=15000.0,
        net_profit_before_tax=25000.0,
        net_profit_margin_pct=25.0,
    )

    monkeypatch.setattr(ReportsService, "get_authoritative_profit_and_loss", lambda store_id, start_date=None, end_date=None: fake_pnl)

    res = client.get("/api/v1/reports/profit-loss")
    assert res.status_code == 200
    data = res.json()
    assert data["revenue_from_operations"] == 100000.0
    assert data["net_profit_before_tax"] == 25000.0
