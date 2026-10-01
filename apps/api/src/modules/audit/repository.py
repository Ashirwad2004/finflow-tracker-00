import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from postgrest import CountMethod

from src.core.supabase import supabase_client

logger = logging.getLogger(__name__)


class AuditRepository:
    @staticmethod
    def _ensure_client():
        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is unavailable",
            )

    @classmethod
    def record_audit(
        cls,
        store_id: str,
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ):
        cls._ensure_client()
        try:
            supabase_client.table("audit_logs").insert({
                "store_id": store_id,
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "metadata": metadata or {},
                "ip_address": ip_address,
            }).execute()
        except Exception as exc:
            # Audit logging failure should not abort business transactions but must be logged
            logger.warning("Failed to record audit log: %s", exc)

    @classmethod
    def list_logs(
        cls,
        store_id: str,
        limit: int = 50,
        offset: int = 0,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
    ) -> tuple[List[Dict[str, Any]], int]:
        cls._ensure_client()
        query = (
            supabase_client.table("audit_logs")
            .select("*", count=CountMethod.exact)
            .eq("store_id", store_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if action:
            query = query.eq("action", action)
        if resource_type:
            query = query.eq("resource_type", resource_type)

        res = query.execute()
        rows = getattr(res, "data", []) or []
        count = getattr(res, "count", 0) or len(rows)
        return rows, count
