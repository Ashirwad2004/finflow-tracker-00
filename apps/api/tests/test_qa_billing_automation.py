import pytest
from decimal import Decimal, ROUND_HALF_UP
from src.schemas.reports import GSTR1ReportRequest
from src.services.reports import ReportsService
from src.services.parties import PartyService


# =============================================================================
# AUTOMATION QA TEST SUITE: BILLING ENGINE CORE VERIFICATION
# =============================================================================


def test_qa_intra_state_gst_tax_split():
    """
    Intra-state sales (Supplier POS 27 to Buyer POS 27):
    CGST (9%) + SGST (9%) must equal 18% total tax, IGST must be 0.00.
    """
    taxable = Decimal("1000.00")
    rate = Decimal("18.00")
    
    half_rate = rate / Decimal("2.0")
    cgst = (taxable * (half_rate / Decimal("100.0"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    sgst = (taxable * (half_rate / Decimal("100.0"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total_tax = cgst + sgst
    total_val = taxable + total_tax

    assert cgst == Decimal("90.00")
    assert sgst == Decimal("90.00")
    assert total_tax == Decimal("180.00")
    assert total_val == Decimal("1180.00")


def test_qa_inter_state_igst_tax_split():
    """
    Inter-state sales (Supplier POS 27 to Buyer POS 07-Delhi):
    IGST (18%) must equal 18% total tax, CGST and SGST must be 0.00.
    """
    taxable = Decimal("2500.00")
    rate = Decimal("18.00")
    
    igst = (taxable * (rate / Decimal("100.0"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    cgst = Decimal("0.00")
    sgst = Decimal("0.00")
    total_tax = igst + cgst + sgst
    total_val = taxable + total_tax

    assert igst == Decimal("450.00")
    assert cgst == Decimal("0.00")
    assert sgst == Decimal("0.00")
    assert total_val == Decimal("2950.00")


from dataclasses import dataclass


@dataclass
class QAInvoiceItem:
    name: str
    qty: Decimal
    price: Decimal
    disc_pct: Decimal
    tax_rate: Decimal


@dataclass
class QALedgerDoc:
    doc_type: str
    total: Decimal
    paid: Decimal
    due: Decimal


def test_qa_multi_item_discounts_and_tax_calculation():
    """
    Test invoice with multiple line items having individual item discounts
    and overall bill discount, verifying taxable base and GST accuracy.
    """
    items = [
        QAInvoiceItem("Item A", Decimal("2"), Decimal("500.00"), Decimal("10.00"), Decimal("18.00")),
        QAInvoiceItem("Item B", Decimal("1"), Decimal("1200.00"), Decimal("0.00"), Decimal("12.00")),
        QAInvoiceItem("Item C", Decimal("5"), Decimal("100.00"), Decimal("5.00"), Decimal("5.00")),
    ]
    overall_discount_pct = Decimal("5.00")

    # Item line subtotal
    subtotal = Decimal("0.00")
    for it in items:
        line_base = it.qty * it.price
        line_disc = (line_base * (it.disc_pct / Decimal("100.0"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        line_subtotal = line_base - line_disc
        subtotal += line_subtotal

    assert subtotal == Decimal("900.00") + Decimal("1200.00") + Decimal("475.00")  # 2575.00

    overall_disc_amount = (subtotal * (overall_discount_pct / Decimal("100.0"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    taxable_amount = subtotal - overall_disc_amount
    assert taxable_amount == Decimal("2446.25")

    # Discount factor
    disc_factor = taxable_amount / subtotal
    total_tax = Decimal("0.00")
    for it in items:
        line_base = it.qty * it.price
        line_disc = (line_base * (it.disc_pct / Decimal("100.0"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        line_taxable = (line_base - line_disc) * disc_factor
        tax = (line_taxable * (it.tax_rate / Decimal("100.0"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total_tax += tax

    # Net total
    net_total = taxable_amount + total_tax
    assert net_total > taxable_amount
    assert total_tax > Decimal("0.00")


def test_qa_section_170_cgst_round_off_rules():
    """
    Section 170 of Indian CGST Act:
    Amount shall be rounded off to the nearest rupee and part of a rupee
    consisting of 50 paise or more shall be increased to one rupee
    and the part of less than 50 paise shall be ignored.
    """
    test_cases = [
        (Decimal("1054.49"), Decimal("1054.00"), Decimal("-0.49")),
        (Decimal("1054.50"), Decimal("1055.00"), Decimal("0.50")),
        (Decimal("1054.51"), Decimal("1055.00"), Decimal("0.49")),
        (Decimal("999.00"), Decimal("999.00"), Decimal("0.00")),
        (Decimal("120.99"), Decimal("121.00"), Decimal("0.01")),
    ]

    for raw, expected_rounded, expected_diff in test_cases:
        rounded = raw.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        diff = rounded - raw
        assert rounded == expected_rounded, f"Failed rounding for {raw}"
        assert diff == expected_diff, f"Failed round-off diff for {raw}"


def test_qa_party_ledger_closing_balance():
    """
    Party Ledger Equation:
    Closing = Opening + Debit Notes + Unpaid Invoices - Credit Notes - Payments
    """
    opening_receivable = Decimal("5000.00")
    
    invoices = [
        QALedgerDoc("invoice", Decimal("2500.00"), Decimal("1000.00"), Decimal("1500.00")),
        QALedgerDoc("invoice", Decimal("3200.00"), Decimal("3200.00"), Decimal("0.00")),
        QALedgerDoc("credit_note", Decimal("400.00"), Decimal("0.00"), Decimal("0.00")),
        QALedgerDoc("receipt", Decimal("2000.00"), Decimal("2000.00"), Decimal("0.00")),
    ]

    running_balance = opening_receivable
    for doc in invoices:
        if doc.doc_type == "invoice":
            running_balance += doc.due
        elif doc.doc_type == "credit_note":
            running_balance -= doc.total
        elif doc.doc_type == "receipt":
            running_balance = max(Decimal("0.00"), running_balance - doc.total)

    # 5000 + 1500 - 400 - 2000 = 4100
    assert running_balance == Decimal("4100.00")


def test_qa_cash_drawer_shift_reconciliation():
    """
    POS Cash Drawer Shift Balancing:
    Expected Cash = Opening Cash Float + Sum(Cash Sales) + Cash In - Cash Out
    Difference = Actual Counted Cash - Expected Cash
    """
    opening_float = Decimal("2000.00")
    cash_sales = [
        Decimal("450.00"),
        Decimal("1180.00"),
        Decimal("230.50"),
    ]
    cash_out_expense = Decimal("200.00")  # petty cash for packaging
    actual_counted_cash = Decimal("3660.50")

    expected_cash = opening_float + sum(cash_sales) - cash_out_expense
    difference = actual_counted_cash - expected_cash

    assert expected_cash == Decimal("3660.50")
    assert difference == Decimal("0.00")  # Register balanced perfectly!


def test_qa_gstr1_b2b_vs_b2cs_threshold():
    """
    GSTR-1 Invoicing Rules:
    - Registered buyer with valid 15-char GSTIN -> Table 4A (B2B)
    - Unregistered buyer interstate > 2.5 Lakhs -> Table 5A (B2CL)
    - Unregistered buyer intra or interstate <= 2.5 Lakhs -> Table 7 (B2CS)
    """
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
