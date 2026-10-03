import pytest
from src.services.barcode import BarcodeService


def test_pos_health(client):
    response = client.get("/api/v1/pos/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "FinFlow Retail POS" in data["service"]


def test_barcode_service_code128():
    # Valid Code 128
    is_valid, err = BarcodeService.validate_barcode("FF-A1B2C3-0001", "code128")
    assert is_valid is True
    assert err == ""

    # Invalid: non-ASCII characters
    is_valid, err = BarcodeService.validate_barcode("FF-SALT-₹100", "code128")
    assert is_valid is False
    assert "invalid characters" in err


def test_barcode_service_ean13():
    # Valid EAN-13 check digit: 8901030383434
    # First 12 digits: 890103038343
    check_digit = BarcodeService.calculate_ean13_check_digit("890103038343")
    assert check_digit == 4

    is_valid, err = BarcodeService.validate_barcode("8901030383434", "ean13")
    assert is_valid is True
    assert err == ""

    # Invalid check digit
    is_valid, err = BarcodeService.validate_barcode("8901030383435", "ean13")
    assert is_valid is False
    assert "Invalid EAN-13 check digit" in err

    # Invalid length
    is_valid, err = BarcodeService.validate_barcode("89010303834", "ean13")
    assert is_valid is False
    assert "must be exactly 13" in err


def test_barcode_service_upca():
    # Standard UPC-A: 036000291452
    check_digit = BarcodeService.calculate_upca_check_digit("03600029145")
    assert check_digit == 2

    is_valid, err = BarcodeService.validate_barcode("036000291452", "upca")
    assert is_valid is True
    assert err == ""

    is_valid, err = BarcodeService.validate_barcode("036000291459", "upca")
    assert is_valid is False
    assert "Invalid UPC-A check digit" in err


def test_internal_barcode_generation():
    store_id = "e70b86e7-c9c4-4a8d-b1a1-68c76d7b8513"

    # 1. Code 128 generator
    code128 = BarcodeService.generate_internal_barcode(store_id, "code128", prefix="FF", sequence_num=42)
    assert code128.startswith("FF-")
    is_valid, _ = BarcodeService.validate_barcode(code128, "code128")
    assert is_valid is True

    # 2. EAN-13 generator (internal 20-29 prefix with valid check digit)
    ean13 = BarcodeService.generate_internal_barcode(store_id, "ean13", sequence_num=7)
    assert len(ean13) == 13
    assert ean13.startswith("20")
    is_valid, err = BarcodeService.validate_barcode(ean13, "ean13")
    assert is_valid is True, f"Generated EAN-13 check digit failed: {err}"


def test_pos_unauthorized_access(client):
    # Endpoints must require authentication
    response = client.post("/api/v1/pos/sales", json={"items": []})
    assert response.status_code in (401, 403)

    response = client.post("/api/v1/pos/shifts/open", json={"opening_cash": 1000})
    assert response.status_code in (401, 403)

    response = client.get("/api/v1/pos/shifts/current")
    assert response.status_code in (401, 403)
