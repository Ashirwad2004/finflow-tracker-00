import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, status

from src.api.deps import get_tenant_context
from src.modules.settings.schemas import SalesSettingsUpdateRequest
from src.modules.settings.service import SettingsService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["Store Settings"])


@router.get("/sales", status_code=status.HTTP_200_OK)
async def get_sales_settings(
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Retrieves store-authoritative sales settings."""
    store_id, _ = tenant_context
    return SettingsService.get_sales_settings(store_id=store_id)


@router.patch("/sales", status_code=status.HTTP_200_OK)
async def update_sales_settings(
    request: SalesSettingsUpdateRequest,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Updates store sales settings (including Show Party Pending Balance toggle)."""
    store_id, _ = tenant_context
    payload = {k: v for k, v in request.model_dump().items() if v is not None}
    return SettingsService.update_sales_settings(store_id=store_id, payload=payload)
