import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.api.deps import get_tenant_context
from src.schemas.purchases import PurchaseCreateRequest, PurchaseResponse
from src.services.purchases import PurchaseService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/purchases", tags=["Purchases & Inward Goods"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def record_purchase(
    request: PurchaseCreateRequest,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """
    Authoritative server-side purchase recording.
    Calculates tax, discounts, and increments stock in atomic database transaction.
    """
    store_id, user_id = tenant_context
    return PurchaseService.record_purchase(
        store_id=store_id,
        user_id=user_id,
        request=request,
    )


@router.get("", status_code=status.HTTP_200_OK)
async def list_purchases(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> List[Dict[str, Any]]:
    """Lists store purchases with tenant isolation and filtering."""
    store_id, _ = tenant_context
    return PurchaseService.list_purchases(
        store_id=store_id,
        limit=limit,
        offset=offset,
        status_filter=status_filter,
        search=search,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/{purchase_id}", status_code=status.HTTP_200_OK)
async def get_purchase(
    purchase_id: str,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Fetches a specific purchase, enforcing tenant ownership."""
    store_id, _ = tenant_context
    return PurchaseService.get_purchase(store_id=store_id, purchase_id=purchase_id)
