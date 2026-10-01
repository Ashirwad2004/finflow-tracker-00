import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict

from src.api.deps import get_tenant_context
from src.services.settings import SettingsService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["Store Settings"])


class SalesSettingsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    show_party_pending_balance: Optional[bool] = None
    show_party_previous_balance: Optional[bool] = None
    defaultTaxRate: Optional[float] = None
    defaultStatus: Optional[str] = None
    invoiceNumberPrefix: Optional[str] = None
    defaultPaymentTermsDays: Optional[int] = None
    preventBackdating: Optional[bool] = None
    backdatingLimitDays: Optional[int] = None
    roundOffTotal: Optional[bool] = None
    gstMode: Optional[str] = None
    warnOnOutstandingBalance: Optional[bool] = None
    confirmBeforeDelete: Optional[bool] = None
    enableHsnCode: Optional[bool] = None
    defaultTermsAndConditions: Optional[str] = None
    enableQuickBilling: Optional[bool] = None
    enableItemWiseTax: Optional[bool] = None
    showItemTaxRateOnBill: Optional[bool] = None
    autoSendWhatsAppOnInvoice: Optional[bool] = None


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
