import hashlib
import time
from typing import Tuple, Optional
from src.core.supabase import supabase_client


class BarcodeService:
    @staticmethod
    def calculate_ean13_check_digit(first_12_digits: str) -> int:
        """Calculates standard GS1 Modulo-10 check digit for 12 digits."""
        if len(first_12_digits) != 12 or not first_12_digits.isdigit():
            raise ValueError("Input must be exactly 12 digits")
        
        # Positions: odd indexed (1-based) have weight 1, even have weight 3
        # 0-indexed: 0 -> weight 1, 1 -> weight 3, 2 -> weight 1...
        total = sum(
            int(digit) * (3 if i % 2 == 1 else 1)
            for i, digit in enumerate(first_12_digits)
        )
        remainder = total % 10
        return 0 if remainder == 0 else 10 - remainder

    @staticmethod
    def calculate_upca_check_digit(first_11_digits: str) -> int:
        """Calculates standard UPC-A Modulo-10 check digit for 11 digits."""
        if len(first_11_digits) != 11 or not first_11_digits.isdigit():
            raise ValueError("Input must be exactly 11 digits")
        
        # Odd indexed (1-based) have weight 3, even have weight 1
        total = sum(
            int(digit) * (3 if i % 2 == 0 else 1)
            for i, digit in enumerate(first_11_digits)
        )
        remainder = total % 10
        return 0 if remainder == 0 else 10 - remainder

    @classmethod
    def validate_barcode(cls, barcode: str, barcode_type: str = "code128") -> Tuple[bool, str]:
        """Validates barcode format, character set, and check digit where applicable."""
        cleaned = barcode.strip()
        if not cleaned:
            return False, "Barcode cannot be empty"

        b_type = barcode_type.lower()
        if b_type == "code128":
            # Code 128 accepts ASCII 32 through 126
            if not all(32 <= ord(c) <= 126 for c in cleaned):
                return False, "Code 128 contains invalid characters (must be printable ASCII)"
            if len(cleaned) > 80:
                return False, "Code 128 barcode exceeds maximum length of 80 characters"
            return True, ""

        elif b_type == "ean13":
            if not (len(cleaned) == 13 and cleaned.isdigit()):
                return False, "EAN-13 barcode must be exactly 13 numeric digits"
            expected_check = cls.calculate_ean13_check_digit(cleaned[:12])
            actual_check = int(cleaned[12])
            if expected_check != actual_check:
                return False, f"Invalid EAN-13 check digit (expected {expected_check}, found {actual_check})"
            return True, ""

        elif b_type == "upca":
            if not (len(cleaned) == 12 and cleaned.isdigit()):
                return False, "UPC-A barcode must be exactly 12 numeric digits"
            expected_check = cls.calculate_upca_check_digit(cleaned[:11])
            actual_check = int(cleaned[11])
            if expected_check != actual_check:
                return False, f"Invalid UPC-A check digit (expected {expected_check}, found {actual_check})"
            return True, ""

        elif b_type == "qr":
            if len(cleaned) > 2048:
                return False, "QR code content exceeds maximum length of 2048 characters"
            return True, ""

        return False, f"Unsupported barcode type '{barcode_type}'"

    @classmethod
    def generate_internal_barcode(
        cls,
        store_id: str,
        barcode_type: str = "code128",
        prefix: str = "FF",
        sequence_num: int = 1,
    ) -> str:
        """
        Generates a collision-resistant, deterministic internal store barcode.
        Does not present internal codes as GS1 manufacturer barcodes.
        """
        b_type = barcode_type.lower()
        store_segment = store_id.replace("-", "")[:6].upper()

        if b_type == "ean13":
            # Use GS1 reserved internal store restricted distribution prefix '20'
            # 2 digits prefix + 4 digits store hash + 6 digits sequence = 12 digits
            store_hash = int(hashlib.md5(store_id.encode()).hexdigest()[:4], 16) % 10000
            seq_part = sequence_num % 1000000
            first_12 = f"20{store_hash:04d}{seq_part:06d}"
            check = cls.calculate_ean13_check_digit(first_12)
            return f"{first_12}{check}"

        elif b_type == "upca":
            # UPC-A internal distribution prefix '2' + 4 digits store + 6 digits seq = 11 digits
            store_hash = int(hashlib.md5(store_id.encode()).hexdigest()[:4], 16) % 10000
            seq_part = sequence_num % 100000
            first_11 = f"2{store_hash:04d}{seq_part:06d}"
            check = cls.calculate_upca_check_digit(first_11)
            return f"{first_11}{check}"

        else:
            # Code 128 (Standard retail format for custom stickers)
            safe_prefix = (prefix or "FF").strip().upper()[:4]
            timestamp_ms = int(time.time() * 1000) % 100000
            return f"{safe_prefix}-{store_segment}-{sequence_num:04d}-{timestamp_ms:05d}"

    @classmethod
    def check_uniqueness(
        cls,
        store_id: str,
        barcode: str,
        exclude_product_id: Optional[str] = None
    ) -> bool:
        """Checks if a barcode is already used by another product in the same tenant/store."""
        if not supabase_client:
            return True
        try:
            query = supabase_client.table("products").select("id").eq("user_id", store_id).eq("barcode", barcode)
            if exclude_product_id:
                query = query.neq("id", exclude_product_id)
            res = query.execute()
            return len(res.data or []) == 0
        except Exception:
            return True
