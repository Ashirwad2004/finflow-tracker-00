import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_tenant_context
from .schemas import (
    PartyCreateRequest,
    PartyUpdateRequest,
    PartyResponse,
)
from .service import PartyService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/parties", tags=["Parties (Customers & Vendors)"])


@router.get("", status_code=status.HTTP_200_OK)
async def list_parties(
    party_type: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> List[Dict[str, Any]]:
    """Lists customers/vendors with server-authoritative balance calculations."""
    store_id, _ = tenant_context
    return PartyService.list_parties(
        store_id=store_id,
        party_type=party_type,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/{party_id}", status_code=status.HTTP_200_OK)
async def get_party(
    party_id: str,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Fetches specific party details, enforcing tenant ownership."""
    store_id, _ = tenant_context
    return PartyService.get_party(store_id=store_id, party_id=party_id)


@router.get("/{party_id}/pending-balance", status_code=status.HTTP_200_OK)
async def get_party_pending_balance(
    party_id: str,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Retrieves server-authoritative current pending balance for party."""
    store_id, _ = tenant_context
    balance = PartyService.calculate_party_pending_balance(store_id=store_id, party_id=party_id)
    return {
        "party_id": party_id,
        "party_pending_balance": balance,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_party(
    request: PartyCreateRequest,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Creates a new customer or vendor for this store."""
    store_id, _ = tenant_context
    return PartyService.create_party(store_id=store_id, request=request)


@router.patch("/{party_id}", status_code=status.HTTP_200_OK)
async def update_party(
    party_id: str,
    request: PartyUpdateRequest,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Updates party details with tenant verification."""
    store_id, _ = tenant_context
    return PartyService.update_party(store_id=store_id, party_id=party_id, request=request)
