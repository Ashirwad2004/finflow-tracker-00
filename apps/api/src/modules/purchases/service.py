import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from .repository import PurchaseRepository
from .schemas import PurchaseCreateRequest

logger = logging.getLogger(__name__)


class PurchaseService:
    @classmethod
    def record_purchase(
        cls,
        store_id: str,
        user_id: str,
        request: PurchaseCreateRequest,
    ) -> Dict[str, Any]:
        """
        Records an authoritative store purchase.
        Computes tax, discounts, and increments stock in atomic database transaction.
        """
        if not request.items or len(request.items) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Purchase must contain at least one product item",
            )

        sanitized_items = []
        for item in request.items:
            qty = max(item.quantity, 0.001)
            rate = max(item.price, 0.0)
            disc = min(max(item.discount, 0.0), 100.0)
            tax_r = max(item.tax_rate, 0.0) if item.tax_rate is not None else None

            sanitized_items.append({
                "id": item.id,
                "product_id": item.product_id,
                "name": item.name or item.description or "Item",
                "description": item.description or item.name or "Item",
                "quantity": qty,
                "price": rate,
                "discount": disc,
                "tax_rate": tax_r,
                "unit": item.unit or "pc",
            })

        return PurchaseRepository.record_authoritative_purchase(
            store_id=store_id,
            user_id=user_id,
            party_id=request.party_id,
            vendor_name=request.vendor_name,
            vendor_phone=request.vendor_phone,
            vendor_email=request.vendor_email,
            vendor_gstin=request.vendor_gstin,
            place_of_supply=request.place_of_supply,
            bill_number=request.bill_number,
            date=request.date,
            due_date=request.due_date,
            items=sanitized_items,
            discount_amount=request.discount_amount,
            tax_rate=request.tax_rate,
            status_val=request.status,
            amount_paid=request.amount_paid,
            notes=request.notes,
            attachment_url=request.attachment_url,
        )

    @classmethod
    def list_purchases(
        cls,
        store_id: str,
        limit: int = 50,
        offset: int = 0,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        return PurchaseRepository.list_purchases(
            store_id=store_id,
            limit=limit,
            offset=offset,
            status_filter=status_filter,
            search=search,
            start_date=start_date,
            end_date=end_date,
        )

    @classmethod
    def get_purchase(cls, store_id: str, purchase_id: str) -> Dict[str, Any]:
        pur = PurchaseRepository.get_purchase_by_id(store_id=store_id, purchase_id=purchase_id)
        if not pur:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase record not found or unauthorized",
            )
        return pur
