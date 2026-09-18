import logging
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

from postgrest import CountMethod

from src.core.supabase import supabase_client
from src.schemas.pos import (
    POSSaleCreateRequest,
    POSReturnRequest,
    POSShiftOpenRequest,
    POSShiftCloseRequest,
    POSCashMovementRequest,
    BarcodeGenerateRequest,
    BarcodeBulkGenerateRequest,
    BarcodeValidateRequest,
)
from src.services.barcode import BarcodeService

logger = logging.getLogger(__name__)


class POSService:
    @staticmethod
    def _ensure_supabase():
        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is temporarily unavailable",
            )

    @classmethod
    def complete_sale(cls, store_id: str, cashier_id: str, request: POSSaleCreateRequest) -> Dict[str, Any]:
        """
        Executes single server-controlled atomic POS sale transaction.
        Performs authoritative server-side recalculations of prices, taxes, and totals.
        """
        cls._ensure_supabase()

        # 1. Authoritative server-side recalculation of lines, discounts, taxes, and totals
        calculated_subtotal = 0.0
        calculated_tax = 0.0
        validated_items = []

        for item in request.items:
            qty = max(item.quantity, 0.001)
            unit_price = max(item.price, 0.0)
            disc_pct = min(max(item.discount, 0.0), 100.0)
            tax_pct = max(item.tax_rate, 0.0)

            line_taxable = qty * unit_price * (1.0 - (disc_pct / 100.0))
            line_tax = round((line_taxable * tax_pct) / 100.0, 2)
            line_total = round(line_taxable + line_tax, 2)

            calculated_subtotal += (qty * unit_price)
            calculated_tax += line_tax

            validated_items.append({
                "id": item.id,
                "product_id": item.product_id,
                "name": item.name,
                "description": item.description or item.name,
                "quantity": qty,
                "price": unit_price,
                "discount": disc_pct,
                "tax_rate": tax_pct,
                "tax_amount": line_tax,
                "total": line_total,
                "unit": item.unit or "pc",
                "hsn_code": item.hsn_code or "",
            })

        calculated_total = round(max(0.0, calculated_subtotal - request.discount_amount + calculated_tax), 2)
        paid_amount = max(0.0, request.amount_paid)

        # 2. Invoke atomic PostgreSQL RPC
        try:
            params = {
                "p_store_id": store_id,
                "p_cashier_id": cashier_id,
                "p_terminal_id": request.terminal_id,
                "p_shift_id": request.shift_id,
                "p_idempotency_key": request.idempotency_key,
                "p_customer_name": request.customer_name or "Walk-in Customer",
                "p_customer_phone": request.customer_phone,
                "p_party_id": request.party_id,
                "p_items": validated_items,
                "p_discount_amount": request.discount_amount,
                "p_payment_method": request.payment_method,
                "p_amount_paid": paid_amount,
                "p_notes": request.notes or "",
                "p_offline_invoice_number": request.offline_invoice_number,
                "p_is_offline_sync": request.is_offline_sync,
            }

            res: Any = supabase_client.rpc("pos_complete_sale", params).execute()
            data = getattr(res, "data", None)
            if not data or not isinstance(data, dict):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to record POS sale in database",
                )
            return dict(data)
        except HTTPException:
            raise
        except Exception as exc:
            err_msg = str(exc)
            logger.exception("Error executing pos_complete_sale RPC: %s", err_msg)
            if "stock" in err_msg.lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg) from exc
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Sale processing failed: {err_msg}",
            ) from exc

    @classmethod
    def process_return(cls, store_id: str, cashier_id: str, request: POSReturnRequest) -> Dict[str, Any]:
        """
        Executes atomic POS sale return with inventory restoration and formal Credit Note creation.
        """
        cls._ensure_supabase()

        validated_return_items = []
        for item in request.return_items:
            qty = max(item.quantity, 0.001)
            unit_price = max(item.unit_price, 0.0)
            tax_rate = max(item.tax_rate, 0.0)

            validated_return_items.append({
                "original_sale_item_id": item.original_sale_item_id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": qty,
                "unit_price": unit_price,
                "tax_rate": tax_rate,
                "restock_inventory": item.restock_inventory,
            })

        try:
            params = {
                "p_store_id": store_id,
                "p_cashier_id": cashier_id,
                "p_sale_id": request.sale_id,
                "p_shift_id": request.shift_id,
                "p_return_items": validated_return_items,
                "p_refund_method": request.refund_method,
                "p_reason": request.reason,
            }

            res: Any = supabase_client.rpc("pos_process_return", params).execute()
            data = getattr(res, "data", None)
            if not data or not isinstance(data, dict):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to process return in database",
                )
            return dict(data)
        except HTTPException:
            raise
        except Exception as exc:
            err_msg = str(exc)
            logger.exception("Error executing pos_process_return RPC: %s", err_msg)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Return processing failed: {err_msg}",
            ) from exc

    @classmethod
    def open_shift(cls, store_id: str, cashier_id: str, request: POSShiftOpenRequest) -> Dict[str, Any]:
        """Opens a cashier shift with opening cash float."""
        cls._ensure_supabase()

        try:
            # Check if there is already an open shift for this cashier
            existing = (
                supabase_client.table("pos_shifts")
                .select("id")
                .eq("store_id", store_id)
                .eq("cashier_id", cashier_id)
                .eq("status", "open")
                .execute()
            )
            if existing.data and len(existing.data) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cashier already has an active open shift. Please close it first.",
                )

            # Resolve cashier display name
            cashier_name = "Cashier"
            try:
                prof_res: Any = (
                    supabase_client.table("profiles")
                    .select("display_name, business_name")
                    .eq("user_id", cashier_id)
                    .maybe_single()
                    .execute()
                )
                prof_data = getattr(prof_res, "data", None)
                if isinstance(prof_data, dict):
                    cashier_name = str(prof_data.get("display_name") or prof_data.get("business_name") or "Cashier")
            except Exception:
                pass

            new_shift = {
                "store_id": store_id,
                "terminal_id": request.terminal_id,
                "cashier_id": cashier_id,
                "cashier_snapshot_name": cashier_name,
                "opening_cash": request.opening_cash,
                "expected_cash": request.opening_cash,
                "status": "open",
                "notes": request.notes,
            }

            res: Any = supabase_client.table("pos_shifts").insert(new_shift).execute()
            res_data = getattr(res, "data", None)
            if not isinstance(res_data, list) or len(res_data) == 0 or not isinstance(res_data[0], dict):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create shift record",
                )
            return dict(res_data[0])
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Error opening shift: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to open shift",
            ) from exc

    @classmethod
    def close_shift(cls, store_id: str, shift_id: str, request: POSShiftCloseRequest) -> Dict[str, Any]:
        """Closes a shift, recording actual cash count and discrepancy."""
        cls._ensure_supabase()

        try:
            # Fetch derived summary from immutable transactions
            summary = cls.get_shift_summary(shift_id)
            expected = summary.get("expected_cash", 0.0)
            actual = request.actual_cash
            diff = round(actual - expected, 2)

            update_data = {
                "closed_at": "now()",
                "actual_cash": actual,
                "difference": diff,
                "status": "closed",
                "notes": request.notes or summary.get("notes"),
            }

            res: Any = (
                supabase_client.table("pos_shifts")
                .update(update_data)
                .eq("id", shift_id)
                .eq("store_id", store_id)
                .execute()
            )
            res_data = getattr(res, "data", None)
            if not isinstance(res_data, list) or len(res_data) == 0 or not isinstance(res_data[0], dict):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Shift not found or access denied",
                )

            return {**res_data[0], "summary": summary}
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Error closing shift: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to close shift",
            ) from exc

    @classmethod
    def get_shift_summary(cls, shift_id: str) -> Dict[str, Any]:
        """Dynamically computes shift totals and expected cash from immutable records."""
        cls._ensure_supabase()
        try:
            res: Any = supabase_client.rpc("pos_get_shift_summary", {"p_shift_id": shift_id}).execute()
            data = getattr(res, "data", None)
            if not data or not isinstance(data, dict):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
            return dict(data)
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Error getting shift summary: %s", exc)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch shift summary") from exc

    @classmethod
    def record_cash_movement(cls, store_id: str, cashier_id: str, request: POSCashMovementRequest) -> Dict[str, Any]:
        """Records cash in / cash out movement during an active shift."""
        cls._ensure_supabase()
        try:
            movement_data = {
                "store_id": store_id,
                "shift_id": request.shift_id,
                "cashier_id": cashier_id,
                "type": request.type,
                "amount": request.amount,
                "reason": request.reason,
            }
            res: Any = supabase_client.table("pos_cash_movements").insert(movement_data).execute()
            res_data = getattr(res, "data", None)
            if not isinstance(res_data, list) or len(res_data) == 0 or not isinstance(res_data[0], dict):
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to record cash movement")
            return dict(res_data[0])
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Error recording cash movement: %s", exc)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to record cash movement") from exc

    @classmethod
    def generate_barcode(cls, store_id: str, request: BarcodeGenerateRequest) -> Dict[str, Any]:
        """Generates a valid, collision-free internal barcode for a product."""
        cls._ensure_supabase()

        # Determine sequence index from total products
        try:
            count_res: Any = supabase_client.table("products").select("id", count=CountMethod.exact).eq("user_id", store_id).execute()
            seq = (getattr(count_res, "count", 0) or 0) + 1
        except Exception:
            seq = 1

        for attempt in range(10):
            candidate = BarcodeService.generate_internal_barcode(
                store_id=store_id,
                barcode_type=request.barcode_type,
                prefix=request.prefix or "FF",
                sequence_num=seq + attempt,
            )
            is_valid, err_msg = BarcodeService.validate_barcode(candidate, request.barcode_type)
            if is_valid and BarcodeService.check_uniqueness(store_id, candidate, request.product_id):
                return {
                    "barcode": candidate,
                    "barcode_type": request.barcode_type,
                    "barcode_source": "internal",
                    "valid": True,
                }

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate unique barcode after multiple attempts",
        )

    @classmethod
    def bulk_generate_barcodes(cls, store_id: str, request: BarcodeBulkGenerateRequest) -> Dict[str, Any]:
        """Bulk generates and assigns internal barcodes to products lacking them."""
        cls._ensure_supabase()

        try:
            query = supabase_client.table("products").select("id, name, barcode").eq("user_id", store_id)
            if request.product_ids and len(request.product_ids) > 0:
                query = query.in_("id", request.product_ids)
            else:
                query = query.is_("barcode", "null")

            query_res: Any = query.execute()
            raw_products = getattr(query_res, "data", None)
            products = raw_products if isinstance(raw_products, list) else []
            updated = []

            for idx, item in enumerate(products):
                if not isinstance(item, dict):
                    continue
                p: dict[str, Any] = item
                if not p.get("barcode"):
                    gen_barcode = BarcodeService.generate_internal_barcode(
                        store_id=store_id,
                        barcode_type=request.barcode_type,
                        prefix=request.prefix or "FF",
                        sequence_num=idx + 1,
                    )
                    prod_id = str(p.get("id", ""))
                    upd_res: Any = (
                        supabase_client.table("products")
                        .update({
                            "barcode": gen_barcode,
                            "barcode_type": request.barcode_type,
                            "barcode_source": "internal",
                        })
                        .eq("id", prod_id)
                        .execute()
                    )
                    upd_data = getattr(upd_res, "data", None)
                    if upd_data:
                        updated.append({"id": prod_id, "name": str(p.get("name", "")), "barcode": gen_barcode})

            return {"total_updated": len(updated), "updated_products": updated}
        except Exception as exc:
            logger.exception("Bulk barcode generation failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Bulk barcode generation failed",
            ) from exc

    @classmethod
    def validate_barcode(cls, store_id: str, request: BarcodeValidateRequest) -> Dict[str, Any]:
        """Validates format, check digits, and tenant collision."""
        is_valid, err = BarcodeService.validate_barcode(request.barcode, request.barcode_type)
        if not is_valid:
            return {"valid": False, "error": err, "is_unique": False}

        is_unique = BarcodeService.check_uniqueness(store_id, request.barcode, request.product_id)
        if not is_unique:
            return {
                "valid": False,
                "error": f"Barcode '{request.barcode}' is already assigned to another product in your catalog",
                "is_unique": False,
            }

        return {"valid": True, "error": None, "is_unique": True}
