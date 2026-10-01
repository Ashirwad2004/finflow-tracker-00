import logging
from typing import List, Optional
from fastapi import HTTPException, status

from src.core.supabase import supabase_client
from src.modules.feature_requests.schemas import (
    FeatureRequestCreate,
    FeatureRequestUpdate,
)

logger = logging.getLogger(__name__)


class FeatureRequestsService:
    @classmethod
    def create_request(cls, payload: FeatureRequestCreate, user_id: str, user_email: str | None) -> dict:
        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is temporarily unavailable",
            )
        try:
            data = {
                "user_id": user_id,
                "user_email": user_email,
                "title": payload.title.strip(),
                "description": payload.description.strip(),
                "status": "pending",
            }
            res = supabase_client.table("feature_requests").insert(data).execute()
            if not res.data or len(res.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to save feature request.",
                )
            return res.data[0]
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Failed to create feature request")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while saving the feature request.",
            ) from exc

    @classmethod
    def list_requests(cls, status_filter: Optional[str] = None) -> List[dict]:
        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is temporarily unavailable",
            )
        try:
            query = supabase_client.table("feature_requests").select("*").order("submitted_at", desc=True)
            if status_filter and status_filter != "all":
                query = query.eq("status", status_filter)
            res = query.execute()
            return res.data or []
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Failed to retrieve feature requests")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while retrieving feature requests.",
            ) from exc

    @classmethod
    def update_request(cls, request_id: str, payload: FeatureRequestUpdate) -> dict:
        allowed_statuses = {"pending", "reviewed", "approved", "declined", "completed"}
        if payload.status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of {allowed_statuses}",
            )

        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is temporarily unavailable",
            )

        try:
            update_data = {"status": payload.status}
            if payload.notes is not None:
                update_data["notes"] = payload.notes.strip()

            res = supabase_client.table("feature_requests").update(update_data).eq("id", request_id).execute()
            if not res.data or len(res.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Feature request not found",
                )
            return res.data[0]
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Failed to update feature request")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating the feature request.",
            ) from exc
