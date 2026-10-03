import logging
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import HTTPException, status
from src.core.supabase import supabase_client

logger = logging.getLogger(__name__)


class BackupService:
    @classmethod
    def export_user_data(cls, user_id: str, user_email: str | None = None) -> tuple[Dict[str, Any], str]:
        """
        Fetches all user data across personal & business domains for export.
        Returns the backup payload dict and recommended filename.
        """
        if supabase_client is None:
            logger.error("Supabase client is not configured on the backend.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is temporarily unavailable",
            )

        try:
            expenses_res = supabase_client.table("expenses").select("*").eq("user_id", user_id).execute()
            budgets_res = supabase_client.table("budgets").select("*").eq("user_id", user_id).execute()
            lent_res = supabase_client.table("lent_money").select("*").eq("user_id", user_id).execute()
            borrowed_res = supabase_client.table("borrowed_money").select("*").eq("user_id", user_id).execute()
            sales_res = supabase_client.table("sales").select("*").eq("user_id", user_id).execute()
            purchases_res = supabase_client.table("purchases").select("*").eq("user_id", user_id).execute()
            products_res = supabase_client.table("products").select("*").eq("user_id", user_id).execute()
            parties_res = supabase_client.table("parties").select("*").eq("user_id", user_id).execute()
            profile_res = supabase_client.table("profiles").select("*").eq("user_id", user_id).execute()

            profile_data = profile_res.data[0] if profile_res.data else None
            now_dt = datetime.now(timezone.utc)

            backup_payload = {
                "exportedAt": now_dt.isoformat(),
                "userId": user_id,
                "userEmail": user_email,
                "profile": profile_data,
                "expenses": expenses_res.data or [],
                "budgets": budgets_res.data or [],
                "lentMoney": lent_res.data or [],
                "borrowedMoney": borrowed_res.data or [],
                "sales": sales_res.data or [],
                "purchases": purchases_res.data or [],
                "products": products_res.data or [],
                "parties": parties_res.data or [],
            }

            filename = f"finflow-backup-{now_dt.strftime('%Y-%m-%d')}.json"
            return backup_payload, filename
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Failed to create data export for user %s", user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate user data backup",
            ) from exc
