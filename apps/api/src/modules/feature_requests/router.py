from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, status

from src.api.deps import get_current_user, require_admin
from src.core.limiter import limiter
from src.modules.feature_requests.schemas import (
    CustomBuildRequest,
    CustomBuildResponse,
    FeatureRequestCreate,
    FeatureRequestUpdate,
    FeatureRequestResponse,
)
from src.modules.feature_requests.service import FeatureRequestsService

router = APIRouter(prefix="/feature-requests", tags=["Feature Requests"])


@router.post(
    "/custom-build",
    response_model=CustomBuildResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("5/hour")
async def create_custom_build(request: Request, payload: CustomBuildRequest):
    """Public intake for custom-work requests from the landing page.

    Deliberately unauthenticated: the whole point is to hear from shop owners
    who have not signed up yet. Abuse is held off by a per-IP hourly limit, a
    honeypot field, and the description validators -- not by a login.
    """
    row = FeatureRequestsService.create_custom_build(payload)

    # A tripped honeypot returns the same success shape, so a bot learns nothing.
    reference = str(row.get("id") or "")
    return CustomBuildResponse(
        success=True,
        reference=reference[:8].upper() if reference else "",
        message="Request received. We'll call you on this number within two working days.",
    )


@router.post("", response_model=FeatureRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: FeatureRequestCreate,
    user_info: dict = Depends(get_current_user),
):
    return FeatureRequestsService.create_request(
        payload=payload,
        user_id=user_info["user_id"],
        user_email=user_info.get("email"),
    )


@router.get("", response_model=List[FeatureRequestResponse])
async def list_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    _: dict = Depends(require_admin),
):
    return FeatureRequestsService.list_requests(status_filter=status_filter)


@router.patch("/{request_id}", response_model=FeatureRequestResponse)
async def update_request(
    request_id: str,
    payload: FeatureRequestUpdate,
    _: dict = Depends(require_admin),
):
    return FeatureRequestsService.update_request(request_id=request_id, payload=payload)
