from src.modules.reports.service import ReportsService
from src.modules.reports.schemas import GSTR1ReportRequest

def test_gstr1_report_generation():
    sales = [
        {
            "id": "inv-001",
            "invoice_number": "INV-001",
            "date": "2025-05-10",
            "total_amount": 1180.0,
            "taxable_amount": 1000.0,
            "customer_gstin": "27AAPFU0939F1ZV",
            "customer_name": "Acme Corp",
            "status": "paid",
            "items": [
                {
                    "name": "Widget A",
                    "quantity": 10,
                    "price": 100.0,
                    "tax_rate": 18.0,
                    "hsn_code": "8471",
                }
            ],
        },
        {
            "id": "inv-002",
            "invoice_number": "INV-002",
            "date": "2025-05-12",
            "total_amount": 590.0,
            "taxable_amount": 500.0,
            "customer_name": "Retail Consumer",
            "status": "paid",
            "items": [
                {
                    "name": "Widget B",
                    "quantity": 5,
                    "price": 100.0,
                    "tax_rate": 18.0,
                    "hsn_code": "8471",
                }
            ],
        },
    ]

    payload = GSTR1ReportRequest(sales=sales, merchant_gstin="27ABCDE1234F1Z5", month="05", year=2025)
    resp = ReportsService.generate_gstr1_report(payload)

    assert resp.total_invoices == 2
    assert resp.total_taxable_value > 0
    assert len(resp.b2b) == 1
    assert len(resp.b2cs) == 1
    assert len(resp.hsn_summary) >= 1


def test_profit_and_loss_generation():
    sales = [
        {"total_amount": 10000.0, "amount_paid": 10000.0, "status": "paid"},
        {"total_amount": 5000.0, "amount_paid": 5000.0, "status": "paid"},
    ]
    purchases = [
        {"total_amount": 8000.0, "amount_paid": 8000.0},
    ]
    expenses = [
        {"amount": 1000.0, "category": "Packaging"}, # Direct
        {"amount": 2000.0, "category": "Office Rent"}, # Indirect
    ]

    resp = ReportsService.generate_profit_and_loss(
        sales=sales,
        purchases=purchases,
        expenses=expenses,
        products=[],
    )

    assert resp.net_revenue == 15000.0
    assert resp.purchases_cost == 8000.0
    assert resp.cost_of_goods_sold == 9000.0  # 8000 + 1000 packaging
    assert resp.gross_profit == 6000.0        # 15000 - 9000
    assert resp.total_indirect_expenses == 2000.0
    assert resp.net_profit_before_tax == 4000.0 # 6000 - 2000


def test_trial_balance_self_balancing():
    sales = [{"total_amount": 20000.0, "amount_paid": 15000.0, "balance_due": 5000.0}]
    purchases = [{"total_amount": 12000.0, "amount_paid": 10000.0, "balance_due": 2000.0}]
    expenses = [{"amount": 3000.0}]
    products = [{"current_stock": 10, "cost_price": 500.0}] # 5000 stock

    resp = ReportsService.generate_trial_balance(
        sales=sales,
        purchases=purchases,
        expenses=expenses,
        products=products,
        parties=[],
        lent=[],
        borrowed=[],
    )

    assert resp.is_balanced is True
    assert resp.total_debit == resp.total_credit


def test_receivables_aging_buckets():
    sales = [
        {"id": "1", "customer_name": "ABC Ltd", "balance_due": 1000.0, "date": "2026-09-20"},
        {"id": "2", "customer_name": "XYZ Ltd", "balance_due": 3000.0, "date": "2026-07-01"}, # >60 days
    ]

    resp = ReportsService.generate_receivables_aging(sales=sales, ref_date="2026-09-25T00:00:00Z")
    assert resp.total_outstanding == 4000.0
    assert resp.total_0_30 == 1000.0
    assert resp.total_61_90 == 3000.0


def test_gstr1_classifies_registered_and_unregistered_buyers():
    """Registered and unregistered buyers appear in their respective report groups."""
    req = GSTR1ReportRequest(
        merchant_gstin="27AAAAA0000A1Z5",
        month="09",
        year=2026,
        sales=[
            # Registered customer -> B2B
            {
                "id": "INV-B2B",
                "invoice_number": "INV-001",
                "total_amount": 5900.0,
                "place_of_supply": "27-Maharashtra",
                "customer_gstin": "27BBBBB1111B1Z2",
                "customer_name": "Acme Retailers",
                "items": [{"rate": 18.0, "taxable_value": 5000.0, "cgst_amount": 450.0, "sgst_amount": 450.0, "hsn_code": "8471"}],
            },
            # Unregistered customer intra-state -> B2CS
            {
                "id": "INV-B2CS",
                "invoice_number": "INV-002",
                "total_amount": 1180.0,
                "place_of_supply": "27-Maharashtra",
                "customer_name": "Walk-in Buyer",
                "customer_gstin": "",
                "items": [{"rate": 18.0, "taxable_value": 1000.0, "cgst_amount": 90.0, "sgst_amount": 90.0, "hsn_code": "8471"}],
            }
        ]
    )

    report = ReportsService.generate_gstr1_report(req)
    assert len(report.b2b) == 1
    assert report.b2b[0].invoice_number == "INV-001"
    assert report.b2b[0].customer_gstin == "27BBBBB1111B1Z2"

    assert len(report.b2cs) >= 1
    assert any(b.place_of_supply == "27-Maharashtra" for b in report.b2cs)

    # HSN summary verification
    assert len(report.hsn_summary) >= 1
    hsn_8471 = next((h for h in report.hsn_summary if h.hsn_code == "8471"), None)
    assert hsn_8471 is not None
    assert hsn_8471.taxable_value == 6000.0


def test_gstr1_preserves_zero_tax_rate():
    report = ReportsService.generate_gstr1_report(GSTR1ReportRequest(sales=[{
        "total_amount": 2000,
        "items": [{"tax_rate": 0, "price": 1000, "quantity": 2}],
    }]))
    assert report.total_taxable_value == 2000
    assert report.total_tax_liability == 0
    assert report.b2cs[0].rate == 0


def test_gstr1_reads_stored_pos_line_fields_and_discount():
    report = ReportsService.generate_gstr1_report(GSTR1ReportRequest(sales=[{
        "total_amount": 212.4,
        "items": [{
            "product_name": "Product", "unit_price": 100, "quantity": 2,
            "discount": 10, "tax_rate": 18, "tax_amount": 32.4, "line_total": 212.4,
        }],
    }]))
    assert report.total_taxable_value == 180
    assert report.total_tax_liability == 32.4
    assert report.hsn_summary[0].total_value == 212.4
    assert report.hsn_summary[0].total_quantity == 2


def test_gstr1_preserves_explicit_zero_line_amounts():
    report = ReportsService.generate_gstr1_report(GSTR1ReportRequest(sales=[{
        "total_amount": 0,
        "items": [{"tax_rate": 0, "taxable_value": 0, "total_amount": 0, "price": 100, "quantity": 1}],
    }]))
    assert report.total_taxable_value == 0
    assert report.total_tax_liability == 0
    assert report.hsn_summary[0].total_value == 0


def test_gstr1_preserves_zero_rate_without_line_items():
    report = ReportsService.generate_gstr1_report(GSTR1ReportRequest(sales=[{
        "total_amount": 100, "subtotal": 100, "tax_rate": 0,
    }]))
    assert report.total_taxable_value == 100
    assert report.total_tax_liability == 0
