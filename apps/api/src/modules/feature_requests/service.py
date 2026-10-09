import logging
from typing import Any, Dict, List, Optional, cast
from fastapi import HTTPException, status

from src.core.supabase import supabase_client
from src.modules.feature_requests.schemas import (
    CustomBuildRequest,
    FeatureRequestCreate,
    FeatureRequestUpdate,
)
from src.modules.whatsapp.exceptions import WhatsAppInvalidPhoneException
from src.modules.whatsapp.phone_utils import normalize_indian_phone

logger = logging.getLogger(__name__)


#: Human labels for the queue title, so an admin can triage without opening
#: each request.
BUILD_TYPE_LABELS = {
    "feature": "New feature",
    "report": "Custom report",
    "integration": "Integration",
    "custom_app": "Custom app",
}


class FeatureRequestsService:
    @classmethod
    def create_custom_build(cls, payload: CustomBuildRequest) -> Dict[str, Any]:
        """Record a custom-work request from the public landing page.

        Unauthenticated, so this validates everything itself and stores the
        contact details on the row -- there is no user account to look them up
        from later.
        """
        if payload.company_website:
            # Honeypot filled: accept silently so a bot gets no signal to retry
            # with, but write nothing.
            logger.info("feature_requests.honeypot_tripped")
            return {"id": "", "spam": True}

        try:
            _, phone_display = normalize_indian_phone(payload.contact_phone)
        except WhatsAppInvalidPhoneException as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        if supabase_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is temporarily unavailable",
            )

        label = BUILD_TYPE_LABELS.get(payload.build_type, "Custom work")
        data = {
            "user_id": None,
            "user_email": str(payload.contact_email) if payload.contact_email else None,
            "title": f"{label} - {payload.business_name}",
            "description": payload.description,
            "status": "pending",
            "contact_name": payload.contact_name,
            "contact_phone": phone_display,
            "business_name": payload.business_name,
            "build_type": payload.build_type,
            "source": "landing",
        }

        try:
            res = supabase_client.table("feature_requests").insert(data).execute()
        except Exception as exc:
            logger.exception("Failed to record custom build request")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="We could not save your request. Please try again.",
            ) from exc

        rows = getattr(res, "data", None) or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="We could not save your request. Please try again.",
            )

        logger.info(
            "feature_requests.custom_build_received type=%s business=%s",
            payload.build_type,
            payload.business_name,
        )
        return cast(Dict[str, Any], rows[0])

    @classmethod
    def create_request(cls, payload: FeatureRequestCreate, user_id: str, user_email: str | None) -> Dict[str, Any]:
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
            return cast(Dict[str, Any], res.data[0])
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Failed to create feature request")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while saving the feature request.",
            ) from exc

    @classmethod
    def list_requests(cls, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
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
            return cast(List[Dict[str, Any]], res.data or [])
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Failed to retrieve feature requests")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while retrieving feature requests.",
            ) from exc

    @classmethod
    def update_request(cls, request_id: str, payload: FeatureRequestUpdate) -> Dict[str, Any]:
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
            update_data: Dict[str, Any] = {"status": payload.status}
            if payload.notes is not None:
                update_data["notes"] = payload.notes.strip()

            res = supabase_client.table("feature_requests").update(update_data).eq("id", request_id).execute()
            if not res.data or len(res.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Feature request not found",
                )
            return cast(Dict[str, Any], res.data[0])
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Failed to update feature request")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating the feature request.",
            ) from exc
