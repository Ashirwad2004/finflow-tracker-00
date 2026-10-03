from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_current_user, require_admin
from src.modules.feature_requests.schemas import (
    FeatureRequestCreate,
    FeatureRequestUpdate,
    FeatureRequestResponse,
)
from src.modules.feature_requests.service import FeatureRequestsService

router = APIRouter(prefix="/feature-requests", tags=["Feature Requests"])


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
