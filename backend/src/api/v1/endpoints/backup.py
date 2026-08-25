import logging
from datetime import datetime
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from src.core.supabase import supabase_client
from src.api.deps import get_current_user
from src.core.limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/backup", tags=["Backup & Export"])


@router.get("/health")
async def backup_health():
    return {"status": "ok", "service": "FinFlow Backup & Export API"}


@router.post("/export")
@limiter.limit("5/minute")
async def export_user_data(
    request: Request,
    user_info: dict = Depends(get_current_user),
):
    user_id = user_info.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid authenticated user required for data export",
        )

    try:
        # Fetch user data across all personal & business tables
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

        backup_payload = {
            "exportedAt": datetime.utcnow().isoformat(),
            "userId": user_id,
            "userEmail": user_info.get("email"),
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

        filename = f"finflow-backup-{datetime.utcnow().strftime('%Y-%m-%d')}.json"
        return JSONResponse(
            content=backup_payload,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except Exception as exc:
        logger.exception("Failed to create data export")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate user data backup",
        ) from exc
