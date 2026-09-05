import pytest
from src.services.reports import ReportsService
from src.schemas.reports import (
    FinancialSummaryRequest,
    GSTR1ReportRequest,
)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_backup_health(client):
    response = client.get("/api/v1/backup/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_payments_health(client):
    response = client.get("/api/v1/payments")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "endpoints" in data


def test_gstr1_report_calculation():
    payload = GSTR1ReportRequest(
        merchant_gstin="27AABCU9603R1ZM",
        month="08",
        year=2026,
        sales=[
            {
                "id": "SALE-001",
                "invoice_number": "INV-2026-001",
                "total_amount": 1180.0,
                "place_of_supply": "27-Maharashtra",
                "customer_gstin": "27AAPFU0939F1ZV",
                "customer_name": "ABC Enterprises",
                "items": [
                    {
                        "rate": 18.0,
                        "taxable_value": 1000.0,
                        "cgst_amount": 90.0,
                        "sgst_amount": 90.0,
                        "igst_amount": 0.0,
                        "total_amount": 1180.0,
                        "hsn_code": "8471",
                        "description": "Computer Parts",
                        "quantity": 1.0,
                    }
                ],
            },
            {
                "id": "SALE-002",
                "invoice_number": "INV-2026-002",
                "total_amount": 590.0,
                "place_of_supply": "27-Maharashtra",
                "customer_name": "Walk-in Retail Customer",
                "items": [
                    {
                        "rate": 18.0,
                        "taxable_value": 500.0,
                        "cgst_amount": 45.0,
                        "sgst_amount": 45.0,
                        "igst_amount": 0.0,
                        "total_amount": 590.0,
                        "hsn_code": "8471",
                        "description": "Computer Accessories",
                        "quantity": 2.0,
                    }
                ],
            },
        ],
        parties=[],
    )

    report = ReportsService.generate_gstr1_report(payload)
    assert report.total_invoices == 2
    assert report.total_taxable_value == 1500.0
    assert report.total_cgst == 135.0
    assert report.total_sgst == 135.0
    assert report.total_tax_liability == 270.0
    assert len(report.b2b) == 1
    assert report.b2b[0].customer_gstin == "27AAPFU0939F1ZV"
    assert len(report.b2cs) == 1
    assert len(report.hsn_summary) == 1
    assert report.hsn_summary[0].hsn_code == "8471"


def test_financial_summary_calculation():
    payload = FinancialSummaryRequest(
        sales=[{"total_amount": 10000}],
        purchases=[{"total_amount": 6000}],
        expenses=[{"amount": 1500}],
        lent=[{"amount": 2000, "status": "pending"}],
        borrowed=[{"amount": 1000, "status": "pending"}],
        currency="INR",
    )

    summary = ReportsService.generate_financial_summary(payload)
    assert summary.total_sales_revenue == 10000.0
    assert summary.total_cost_of_goods == 6000.0
    assert summary.gross_profit == 4000.0
    assert summary.gross_margin_pct == 40.0
    assert summary.total_operating_expenses == 1500.0
    assert summary.net_profit == 2500.0
    assert summary.net_profit_margin_pct == 25.0
    assert summary.total_receivables == 2000.0
    assert summary.total_payables == 1000.0
    assert summary.net_debt_position == -1000.0


def test_ai_validation_errors(client):
    # Missing required text field
    response = client.post("/api/v1/ai/parse-expense", json={})
    assert response.status_code in (401, 422)

    # Missing required imageBase64 field
    response = client.post("/api/v1/ai/scan-bill", json={})
    assert response.status_code in (401, 422)


def test_feature_requests_unauthorized(client):
    response = client.post(
        "/api/v1/feature-requests",
        json={"title": "New Export Format", "description": "Support PDF exports"},
    )
    # Should require authorization
    assert response.status_code in (401, 403)