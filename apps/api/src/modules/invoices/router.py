import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.api.deps import get_tenant_context
from .schemas import (
    InvoiceCreateRequest,
    InvoiceUpdateRequest,
    InvoiceResponse,
)
from .service import InvoiceService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["Invoices & Billing"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_invoice(
    request: InvoiceCreateRequest,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """
    Authoritative server-side invoice generation.
    Calculates subtotal, discounts, GST, roundoff, deducts inventory stock atomically,
    and returns authoritative invoice data.
    """
    store_id, user_id = tenant_context
    return InvoiceService.create_invoice(
        store_id=store_id,
        user_id=user_id,
        request=request,
    )


@router.get("", status_code=status.HTTP_200_OK)
async def list_invoices(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> List[Dict[str, Any]]:
    """Lists store invoices with tenant isolation and filtering."""
    store_id, _ = tenant_context
    return InvoiceService.list_invoices(
        store_id=store_id,
        limit=limit,
        offset=offset,
        status_filter=status_filter,
        search=search,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/next-number", status_code=status.HTTP_200_OK)
async def get_next_invoice_number(
    prefix: str = Query("INV-", min_length=1, max_length=20),
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, str]:
    """Generates the next sequential invoice number for this tenant."""
    store_id, _ = tenant_context
    next_num = InvoiceService.get_next_invoice_number(store_id=store_id, prefix=prefix)
    return {"invoice_number": next_num}


@router.get("/{invoice_id}", status_code=status.HTTP_200_OK)
async def get_invoice(
    invoice_id: str,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Fetches a specific invoice, enforcing tenant ownership."""
    store_id, _ = tenant_context
    return InvoiceService.get_invoice(store_id=store_id, invoice_id=invoice_id)


@router.patch("/{invoice_id}", status_code=status.HTTP_200_OK)
async def update_invoice(
    invoice_id: str,
    request: InvoiceUpdateRequest,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Updates invoice metadata (notes, payment status, contact info)."""
    store_id, _ = tenant_context
    return InvoiceService.update_invoice(
        store_id=store_id,
        invoice_id=invoice_id,
        request=request,
    )
