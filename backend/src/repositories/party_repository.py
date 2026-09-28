import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from src.core.supabase import supabase_client

logger = logging.getLogger(__name__)


class PartyRepository:
    @staticmethod
    def _ensure_client():
        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is unavailable",
            )

    @classmethod
    def list_parties(
        cls,
        store_id: str,
        party_type: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        cls._ensure_client()
        query = (
            supabase_client.table("parties")
            .select("*")
            .eq("user_id", store_id)
            .order("name", desc=False)
            .range(offset, offset + limit - 1)
        )
        if party_type:
            query = query.or_(f"type.eq.{party_type},type.eq.both")
        if search:
            query = query.ilike("name", f"%{search}%")

        res = query.execute()
        return getattr(res, "data", []) or []

    @classmethod
    def get_party_by_id(cls, store_id: str, party_id: str) -> Optional[Dict[str, Any]]:
        cls._ensure_client()
        res = (
            supabase_client.table("parties")
            .select("*")
            .eq("id", party_id)
            .eq("user_id", store_id)
            .maybe_single()
            .execute()
        )
        return getattr(res, "data", None)

    @classmethod
    def create_party(cls, store_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        cls._ensure_client()
        payload["user_id"] = store_id
        res = supabase_client.table("parties").insert(payload).execute()
        data = getattr(res, "data", [])
        if not data or not isinstance(data, list) or len(data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create party",
            )
        return data[0]

    @classmethod
    def update_party(cls, store_id: str, party_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        cls._ensure_client()
        existing = cls.get_party_by_id(store_id, party_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Party not found or unauthorized",
            )
        res = (
            supabase_client.table("parties")
            .update(payload)
            .eq("id", party_id)
            .eq("user_id", store_id)
            .execute()
        )
        data = getattr(res, "data", [])
        return data[0] if isinstance(data, list) and len(data) > 0 else existing
