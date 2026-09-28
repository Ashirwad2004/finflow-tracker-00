import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from src.repositories.invoice_repository import InvoiceRepository
from src.schemas.invoices import (
    InvoiceCreateRequest,
    InvoiceUpdateRequest,
    InvoiceResponse,
)

logger = logging.getLogger(__name__)


class InvoiceService:
    @classmethod
    def create_invoice(
        cls,
        store_id: str,
        user_id: str,
        request: InvoiceCreateRequest,
    ) -> Dict[str, Any]:
        """
        Creates an authoritative store invoice.
        All pricing, taxes, roundoffs, and inventory deductions are server-authoritative.
        """
        if not request.items or len(request.items) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice must contain at least one item",
            )

        # Map and sanitize items
        sanitized_items = []
        for item in request.items:
            qty = max(item.quantity, 0.001)
            price = max(item.price, 0.0)
            disc = min(max(item.discount, 0.0), 100.0)
            tax_r = max(item.tax_rate, 0.0) if item.tax_rate is not None else None

            sanitized_items.append({
                "id": item.id,
                "product_id": item.product_id,
                "name": item.name or item.description or "Item",
                "description": item.description or item.name or "Item",
                "quantity": qty,
                "price": price,
                "discount": disc,
                "tax_rate": tax_r,
                "unit": item.unit or "pc",
                "hsn_code": item.hsn_code or "",
            })

        result = InvoiceRepository.create_authoritative_invoice(
            store_id=store_id,
            user_id=user_id,
            party_id=request.party_id,
            customer_name=request.customer_name or "Cash Customer",
            customer_phone=request.customer_phone,
            customer_email=request.customer_email,
            customer_gstin=request.customer_gstin,
            place_of_supply=request.place_of_supply,
            date=request.date,
            due_date=request.due_date,
            items=sanitized_items,
            overall_discount=request.overall_discount,
            tax_rate=request.tax_rate,
            is_item_wise_tax=request.is_item_wise_tax,
            round_off=request.round_off,
            status_val=request.status,
            amount_paid=request.amount_paid,
            payment_method=request.payment_method,
            notes=request.notes,
            document_type=request.document_type or "invoice",
            invoice_number_prefix=request.invoice_number_prefix,
            custom_invoice_number=request.custom_invoice_number,
        )

        return result

    @classmethod
    def list_invoices(
        cls,
        store_id: str,
        limit: int = 50,
        offset: int = 0,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        return InvoiceRepository.list_invoices(
            store_id=store_id,
            limit=limit,
            offset=offset,
            status_filter=status_filter,
            search=search,
            start_date=start_date,
            end_date=end_date,
        )

    @classmethod
    def get_invoice(cls, store_id: str, invoice_id: str) -> Dict[str, Any]:
        invoice = InvoiceRepository.get_invoice_by_id(store_id=store_id, invoice_id=invoice_id)
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found or unauthorized",
            )
        return invoice

    @classmethod
    def get_next_invoice_number(cls, store_id: str, prefix: str = "INV-") -> str:
        return InvoiceRepository.get_next_invoice_number(store_id=store_id, prefix=prefix)

    @classmethod
    def update_invoice(
        cls,
        store_id: str,
        invoice_id: str,
        request: InvoiceUpdateRequest,
    ) -> Dict[str, Any]:
        update_data = {k: v for k, v in request.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields provided for update",
            )

        updated = InvoiceRepository.update_invoice(
            store_id=store_id,
            invoice_id=invoice_id,
            payload=update_data,
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found or unauthorized",
            )
        return updated
