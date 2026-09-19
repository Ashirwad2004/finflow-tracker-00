import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from src.api.deps import get_current_user
from src.core.supabase import supabase_client
from src.schemas.pos import (
    POSSaleCreateRequest,
    POSReturnRequest,
    POSShiftOpenRequest,
    POSShiftCloseRequest,
    POSCashMovementRequest,
    BarcodeGenerateRequest,
    BarcodeBulkGenerateRequest,
    BarcodeValidateRequest,
)
from src.services.pos import POSService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pos", tags=["Point of Sale (POS)"])


def _resolve_tenant_context(user_info: dict) -> tuple[str, str]:
    """
    Resolves the store_id (tenant owner) and cashier_id (authenticated user).
    If the user is a salesman, store_id points to the salesman's assigned store.
    """
    user_id = user_info.get("user_id")
    email = user_info.get("email")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    store_id = user_id
    if supabase_client and email:
        try:
            sm_res: Any = (
                supabase_client.table("store_salesmen")
                .select("store_id, is_active")
                .eq("salesman_email", email.lower())
                .maybe_single()
                .execute()
            )
            sm_data = getattr(sm_res, "data", None)
            if isinstance(sm_data, dict):
                if sm_data.get("is_active") is not False and sm_data.get("store_id"):
                    store_id = str(sm_data["store_id"])
        except Exception:
            pass

    return store_id, user_id


@router.get("/health")
async def pos_health():
    return {"status": "ok", "service": "FinFlow Retail POS & Barcode Engine"}


@router.post("/sales", status_code=status.HTTP_201_CREATED)
async def complete_pos_sale(
    request: POSSaleCreateRequest,
    user_info: dict = Depends(get_current_user),
):
    """Executes single server-controlled atomic POS sale transaction."""
    store_id, cashier_id = _resolve_tenant_context(user_info)
    return POSService.complete_sale(store_id=store_id, cashier_id=cashier_id, request=request)


@router.post("/sales/{sale_id}/return")
async def process_pos_return(
    sale_id: str,
    request: POSReturnRequest,
    user_info: dict = Depends(get_current_user),
):
    """Processes formal sales return, Credit Note creation, and inventory restock."""
    store_id, cashier_id = _resolve_tenant_context(user_info)
    if request.sale_id != sale_id:
        request.sale_id = sale_id
    return POSService.process_return(store_id=store_id, cashier_id=cashier_id, request=request)


@router.post("/shifts/open", status_code=status.HTTP_201_CREATED)
async def open_pos_shift(
    request: POSShiftOpenRequest,
    user_info: dict = Depends(get_current_user),
):
    """Opens a cashier register shift with starting cash float."""
    store_id, cashier_id = _resolve_tenant_context(user_info)
    return POSService.open_shift(store_id=store_id, cashier_id=cashier_id, request=request)


@router.post("/shifts/{shift_id}/close")
async def close_pos_shift(
    shift_id: str,
    request: POSShiftCloseRequest,
    user_info: dict = Depends(get_current_user),
):
    """Closes an active cashier shift, computing discrepancy against immutable transactions."""
    store_id, _ = _resolve_tenant_context(user_info)
    return POSService.close_shift(store_id=store_id, shift_id=shift_id, request=request)


@router.get("/shifts/current")
async def get_current_shift(
    user_info: dict = Depends(get_current_user),
):
    """Retrieves active open shift for the current cashier."""
    store_id, cashier_id = _resolve_tenant_context(user_info)
    if not supabase_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")

    res: Any = (
        supabase_client.table("pos_shifts")
        .select("*")
        .eq("store_id", store_id)
        .eq("cashier_id", cashier_id)
        .eq("status", "open")
        .order("opened_at", desc=True)
        .limit(1)
        .execute()
    )
    res_data = getattr(res, "data", None)
    if not isinstance(res_data, list) or len(res_data) == 0:
        return {"active_shift": None}

    shift_item = res_data[0]
    if not isinstance(shift_item, dict):
        return {"active_shift": None}

    shift_id = str(shift_item.get("id", ""))
    summary = None
    try:
        summary = POSService.get_shift_summary(shift_id)
    except Exception as exc:
        logger.warning("Could not compute dynamic summary for shift %s: %s", shift_id, exc)
        summary = {
            "shift_id": shift_id,
            "opening_cash": float(shift_item.get("opening_cash", 0.0) or 0.0),
            "expected_cash": float(shift_item.get("expected_cash", 0.0) or shift_item.get("opening_cash", 0.0) or 0.0),
            "total_sales": 0.0,
            "cash_sales": 0.0,
            "upi_sales": 0.0,
            "card_sales": 0.0,
            "sales_count": 0,
            "cash_in": 0.0,
            "cash_out": 0.0,
            "cash_refunds": 0.0,
        }
    return {"active_shift": shift_item, "summary": summary}


@router.get("/shifts/{shift_id}/summary")
async def get_shift_summary_endpoint(
    shift_id: str,
    user_info: dict = Depends(get_current_user),
):
    """Dynamically calculates shift totals from immutable sales and cash transactions."""
    return POSService.get_shift_summary(shift_id)


@router.post("/cash-movements", status_code=status.HTTP_201_CREATED)
async def record_cash_movement_endpoint(
    request: POSCashMovementRequest,
    user_info: dict = Depends(get_current_user),
):
    """Records petty cash addition or cash drop expense during active shift."""
    store_id, cashier_id = _resolve_tenant_context(user_info)
    return POSService.record_cash_movement(store_id=store_id, cashier_id=cashier_id, request=request)


@router.post("/barcodes/generate")
async def generate_barcode_endpoint(
    request: BarcodeGenerateRequest,
    user_info: dict = Depends(get_current_user),
):
    """Generates a valid, collision-free internal store barcode."""
    store_id, _ = _resolve_tenant_context(user_info)
    return POSService.generate_barcode(store_id=store_id, request=request)


@router.post("/barcodes/bulk-generate")
async def bulk_generate_barcodes_endpoint(
    request: BarcodeBulkGenerateRequest,
    user_info: dict = Depends(get_current_user),
):
    """Bulk generates internal barcodes for products lacking them."""
    store_id, _ = _resolve_tenant_context(user_info)
    return POSService.bulk_generate_barcodes(store_id=store_id, request=request)


@router.post("/barcodes/validate")
async def validate_barcode_endpoint(
    request: BarcodeValidateRequest,
    user_info: dict = Depends(get_current_user),
):
    """Validates barcode format, check digit, and tenant uniqueness."""
    store_id, _ = _resolve_tenant_context(user_info)
    return POSService.validate_barcode(store_id=store_id, request=request)
