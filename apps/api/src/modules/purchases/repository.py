import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from src.core.supabase import supabase_client

logger = logging.getLogger(__name__)


class PurchaseRepository:
    @staticmethod
    def _ensure_client():
        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is unavailable",
            )

    @classmethod
    def record_authoritative_purchase(
        cls,
        store_id: str,
        user_id: str,
        party_id: Optional[str],
        vendor_name: str,
        vendor_phone: Optional[str],
        vendor_email: Optional[str],
        vendor_gstin: Optional[str],
        place_of_supply: Optional[str],
        bill_number: Optional[str],
        date: Optional[str],
        due_date: Optional[str],
        items: List[Dict[str, Any]],
        discount_amount: float,
        tax_rate: float,
        status_val: str,
        amount_paid: float,
        notes: Optional[str],
        attachment_url: Optional[str],
    ) -> Dict[str, Any]:
        cls._ensure_client()
        try:
            params = {
                "p_store_id": store_id,
                "p_user_id": user_id,
                "p_party_id": party_id,
                "p_vendor_name": vendor_name,
                "p_vendor_phone": vendor_phone,
                "p_vendor_email": vendor_email,
                "p_vendor_gstin": vendor_gstin,
                "p_place_of_supply": place_of_supply,
                "p_bill_number": bill_number,
                "p_date": date,
                "p_due_date": due_date,
                "p_items": items,
                "p_discount_amount": discount_amount,
                "p_tax_rate": tax_rate,
                "p_status": status_val,
                "p_amount_paid": amount_paid,
                "p_notes": notes,
                "p_attachment_url": attachment_url,
            }
            res = supabase_client.rpc("record_store_purchase", params).execute()
            data = getattr(res, "data", None)
            if not data or not isinstance(data, dict):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to record purchase bill",
                )
            return dict(data)
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Error executing record_store_purchase RPC")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during purchase entry: {str(exc)}",
            ) from exc

    @classmethod
    def list_purchases(
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
            supabase_client.table("purchases")
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
            query = query.ilike("vendor_name", f"%{search}%")

        res = query.execute()
        return getattr(res, "data", []) or []

    @classmethod
    def get_purchase_by_id(cls, store_id: str, purchase_id: str) -> Optional[Dict[str, Any]]:
        cls._ensure_client()
        res = (
            supabase_client.table("purchases")
            .select("*")
            .eq("id", purchase_id)
            .eq("user_id", store_id)
            .maybe_single()
            .execute()
        )
        return getattr(res, "data", None)
