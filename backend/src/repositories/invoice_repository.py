import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from postgrest import CountMethod

from src.core.supabase import supabase_client

logger = logging.getLogger(__name__)


class InvoiceRepository:
    @staticmethod
    def _ensure_client():
        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is unavailable",
            )

    @classmethod
    def create_authoritative_invoice(
        cls,
        store_id: str,
        user_id: str,
        party_id: Optional[str],
        customer_name: str,
        customer_phone: Optional[str],
        customer_email: Optional[str],
        customer_gstin: Optional[str],
        place_of_supply: Optional[str],
        date: Optional[str],
        due_date: Optional[str],
        items: List[Dict[str, Any]],
        overall_discount: float,
        tax_rate: float,
        is_item_wise_tax: bool,
        round_off: bool,
        status_val: str,
        amount_paid: float,
        payment_method: Optional[str],
        notes: Optional[str],
        document_type: str,
        invoice_number_prefix: Optional[str],
        custom_invoice_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        cls._ensure_client()
        try:
            params = {
                "p_store_id": store_id,
                "p_user_id": user_id,
                "p_party_id": party_id,
                "p_customer_name": customer_name,
                "p_customer_phone": customer_phone,
                "p_customer_email": customer_email,
                "p_customer_gstin": customer_gstin,
                "p_place_of_supply": place_of_supply,
                "p_date": date,
                "p_due_date": due_date,
                "p_items": items,
                "p_overall_discount_percent": overall_discount,
                "p_tax_rate": tax_rate,
                "p_is_item_wise_tax": is_item_wise_tax,
                "p_round_off": round_off,
                "p_status": status_val,
                "p_amount_paid": amount_paid,
                "p_payment_method": payment_method,
                "p_notes": notes,
                "p_document_type": document_type,
                "p_invoice_number_prefix": invoice_number_prefix or "INV-",
                "p_custom_invoice_number": custom_invoice_number,
            }
            res = supabase_client.rpc("create_store_invoice", params).execute()
            data = getattr(res, "data", None)
            if not data or not isinstance(data, dict):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to record authoritative invoice",
                )
            return dict(data)
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Error executing create_store_invoice RPC")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during invoice creation: {str(exc)}",
            ) from exc

    @classmethod
    def list_invoices(
        cls,
        store_id: str,
        limit: int = 50,
        offset: int = 0,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        cls._ensure_client()
        query = (
            supabase_client.table("sales")
            .select("*")
            .eq("user_id", store_id)
            .order("date", desc=True)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if status_filter:
            query = query.eq("status", status_filter)
        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)
        if search:
            query = query.ilike("customer_name", f"%{search}%")

        res = query.execute()
        return getattr(res, "data", []) or []

    @classmethod
    def get_invoice_by_id(cls, store_id: str, invoice_id: str) -> Optional[Dict[str, Any]]:
        cls._ensure_client()
        res = (
            supabase_client.table("sales")
            .select("*")
            .eq("id", invoice_id)
            .eq("user_id", store_id)
            .maybe_single()
            .execute()
        )
        return getattr(res, "data", None)

    @classmethod
    def get_next_invoice_number(cls, store_id: str, prefix: str = "INV-") -> str:
        cls._ensure_client()
        res = (
            supabase_client.table("sales")
            .select("invoice_number")
            .eq("user_id", store_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        data = getattr(res, "data", [])
        if data and isinstance(data, list) and len(data) > 0:
            last_num_str = str(data[0].get("invoice_number", ""))
            stripped = last_num_str[len(prefix):] if last_num_str.startswith(prefix) else last_num_str
            digits = "".join(filter(str.isdigit, stripped))
            if digits:
                next_val = int(digits) + 1
                return f"{prefix}{str(next_val).zfill(4)}"

        # Default starting invoice number
        count_res = (
            supabase_client.table("sales")
            .select("id", count=CountMethod.exact)
            .eq("user_id", store_id)
            .execute()
        )
        count = getattr(count_res, "count", 0) or 0
        return f"{prefix}{str(count + 1).zfill(4)}"

    @classmethod
    def update_invoice(
        cls,
        store_id: str,
        invoice_id: str,
        payload: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        cls._ensure_client()
        # Verify ownership
        existing = cls.get_invoice_by_id(store_id, invoice_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found or unauthorized",
            )

        res = (
            supabase_client.table("sales")
            .update(payload)
            .eq("id", invoice_id)
            .eq("user_id", store_id)
            .execute()
        )
        data = getattr(res, "data", [])
        return data[0] if isinstance(data, list) and len(data) > 0 else None
