import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from src.core.supabase import supabase_client

logger = logging.getLogger(__name__)


class InventoryRepository:
    @staticmethod
    def _ensure_client():
        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is unavailable",
            )

    @classmethod
    def adjust_inventory(
        cls,
        store_id: str,
        user_id: str,
        product_id: str,
        adjustment_type: str,
        quantity: float,
        notes: Optional[str],
    ) -> Dict[str, Any]:
        cls._ensure_client()
        try:
            params = {
                "p_store_id": store_id,
                "p_user_id": user_id,
                "p_product_id": product_id,
                "p_adjustment_type": adjustment_type,
                "p_quantity": quantity,
                "p_notes": notes or "Manual stock adjustment",
            }
            res = supabase_client.rpc("adjust_store_inventory", params).execute()
            data = getattr(res, "data", None)
            if not data or not isinstance(data, dict):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to adjust inventory",
                )
            return dict(data)
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Error executing adjust_store_inventory RPC")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during stock adjustment: {str(exc)}",
            ) from exc

    @classmethod
    def list_movements(
        cls,
        store_id: str,
        product_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        cls._ensure_client()
        query = (
            supabase_client.table("inventory_movements")
            .select("*, products(name, unit)")
            .eq("store_id", store_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if product_id:
            query = query.eq("product_id", product_id)

        res = query.execute()
        raw_rows = getattr(res, "data", []) or []
        formatted = []
        for r in raw_rows:
            prod_info = r.get("products") if isinstance(r.get("products"), dict) else {}
            formatted.append({
                "id": str(r.get("id")),
                "product_id": str(r.get("product_id")),
                "product_name": prod_info.get("name") or "Product",
                "type": r.get("type"),
                "quantity": float(r.get("quantity") or 0),
                "previous_stock": float(r.get("previous_stock") or 0),
                "resulting_stock": float(r.get("resulting_stock") or 0),
                "reference_type": r.get("reference_type"),
                "reference_id": str(r.get("reference_id")) if r.get("reference_id") else None,
                "notes": r.get("notes"),
                "created_at": str(r.get("created_at")),
            })
        return formatted

    @classmethod
    def get_valuation_summary(cls, store_id: str) -> Dict[str, Any]:
        cls._ensure_client()
        res = (
            supabase_client.table("products")
            .select("id, name, stock_quantity, price, cost_price, min_stock_level")
            .eq("user_id", store_id)
            .execute()
        )
        products = getattr(res, "data", []) or []

        total_units = 0.0
        total_retail = 0.0
        total_cost = 0.0
        low_stock_count = 0

        for p in products:
            qty = float(p.get("stock_quantity") or 0)
            price = float(p.get("price") or 0)
            cost = float(p.get("cost_price") or price)
            min_thresh = float(p.get("min_stock_level") or 10)

            total_units += qty
            total_retail += qty * price
            total_cost += qty * cost
            if qty <= min_thresh:
                low_stock_count += 1

        return {
            "total_products": len(products),
            "total_stock_units": round(total_units, 2),
            "total_retail_value": round(total_retail, 2),
            "total_cost_value": round(total_cost, 2),
            "low_stock_count": low_stock_count,
        }
