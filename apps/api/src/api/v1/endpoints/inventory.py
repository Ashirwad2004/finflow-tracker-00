import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_tenant_context
from src.schemas.inventory import (
    InventoryAdjustmentRequest,
    InventoryMovementItem,
    InventoryValuationSummary,
)
from src.services.inventory import InventoryService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/inventory", tags=["Inventory & Stock Management"])


@router.post("/adjust", status_code=status.HTTP_200_OK)
async def adjust_stock(
    request: InventoryAdjustmentRequest,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """
    Authoritatively adjusts stock quantity for a product.
    Records inventory movement ledger and audit log atomically.
    """
    store_id, user_id = tenant_context
    return InventoryService.adjust_stock(
        store_id=store_id,
        user_id=user_id,
        request=request,
    )


@router.get("/movements", status_code=status.HTTP_200_OK)
async def list_inventory_movements(
    product_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> List[Dict[str, Any]]:
    """Retrieves immutable inventory movement audit log for this tenant."""
    store_id, _ = tenant_context
    return InventoryService.get_movements(
        store_id=store_id,
        product_id=product_id,
        limit=limit,
        offset=offset,
    )


@router.get("/valuation", response_model=InventoryValuationSummary, status_code=status.HTTP_200_OK)
async def get_inventory_valuation(
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Computes total stock units, valuation at cost and retail, and low-stock count."""
    store_id, _ = tenant_context
    return InventoryService.get_valuation(store_id=store_id)
