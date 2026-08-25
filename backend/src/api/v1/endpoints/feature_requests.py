import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.supabase import supabase_client
from src.schemas.feature_requests import (
    FeatureRequestCreate,
    FeatureRequestUpdate,
    FeatureRequestResponse,
)
from src.api.deps import get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feature-requests", tags=["Feature Requests"])


# Routes
@router.post("", response_model=FeatureRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: FeatureRequestCreate,
    user_info: dict = Depends(get_current_user),
):
    try:
        data = {
            "user_id": user_info["user_id"],
            "user_email": user_info["email"],
            "title": payload.title.strip(),
            "description": payload.description.strip(),
            "status": "pending"
        }
        res = supabase_client.table("feature_requests").insert(data).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save feature request."
            )
        return res.data[0]
    except Exception as exc:
        logger.exception("Failed to create feature request")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving the feature request."
        ) from exc


@router.get("", response_model=List[FeatureRequestResponse])
async def list_requests(
    status: Optional[str] = None,
    _: dict = Depends(require_admin),
):
    try:
        query = supabase_client.table("feature_requests").select("*").order("submitted_at", desc=True)
        if status and status != "all":
            query = query.eq("status", status)
        res = query.execute()
        return res.data or []
    except Exception as exc:
        logger.exception("Failed to retrieve feature requests")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving feature requests."
        ) from exc


@router.patch("/{request_id}", response_model=FeatureRequestResponse)
async def update_request(
    request_id: str,
    payload: FeatureRequestUpdate,
    _: dict = Depends(require_admin),
):
    # Validate status value
    allowed_statuses = {"pending", "reviewed", "approved", "declined", "completed"}
    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {allowed_statuses}"
        )

    try:
        update_data = {"status": payload.status}
        if payload.notes is not None:
            update_data["notes"] = payload.notes.strip()

        res = supabase_client.table("feature_requests").update(update_data).eq("id", request_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feature request not found"
            )
        return res.data[0]
    except Exception as exc:
        logger.exception("Failed to update feature request")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the feature request."
        ) from exc