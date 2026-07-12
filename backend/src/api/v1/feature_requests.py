import logging
from typing import Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from pydantic import BaseModel

from src.core.config import settings
from supabase import create_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feature-requests", tags=["Feature Requests"])

# Initialize Supabase client using Service Role to bypass RLS
supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
bearer_scheme = HTTPBearer(auto_error=False)

# Schemas
class FeatureRequestCreate(BaseModel):
    title: str
    description: str

class FeatureRequestUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class FeatureRequestResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    title: str
    description: str
    status: str
    notes: Optional[str] = None
    submitted_at: datetime
    updated_at: datetime

# Authentication Helpers
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )
    try:
        # Verify token and fetch user details directly from Supabase API
        res = supabase_client.auth.get_user(credentials.credentials)
        user = res.user
        if not user or not user.id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization token",
            )
        return {"user_id": user.id, "email": user.email}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token or session expired",
        ) from exc

async def require_admin(
    user_info: dict = Depends(get_current_user),
) -> dict:
    user_id = user_info["user_id"]
    email = user_info["email"] or ""

    # 1. Fallback email whitelist
    if "admin@" in email.lower() or "ashirwad" in email.lower():
        return user_info

    # 2. Check profiles db
    try:
        res = supabase_client.table("profiles").select("is_admin").eq("user_id", user_id).execute()
        if res.data and len(res.data) > 0:
            if res.data[0].get("is_admin") is True:
                return user_info
    except Exception as exc:
        logger.exception("Failed to check admin status in profiles")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Admin status verification failed: {str(exc)}",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required",
    )

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
            detail=f"Database error: {str(exc)}"
        )

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
            detail=f"Database error: {str(exc)}"
        )

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
            detail=f"Database error: {str(exc)}"
        )
