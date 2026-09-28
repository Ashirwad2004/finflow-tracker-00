import logging
from typing import Any, Dict, List, Optional

from src.repositories.inventory_repository import InventoryRepository
from src.schemas.inventory import (
    InventoryAdjustmentRequest,
    InventoryMovementItem,
    InventoryValuationSummary,
)

logger = logging.getLogger(__name__)


class InventoryService:
    @classmethod
    def adjust_stock(
        cls,
        store_id: str,
        user_id: str,
        request: InventoryAdjustmentRequest,
    ) -> Dict[str, Any]:
        return InventoryRepository.adjust_inventory(
            store_id=store_id,
            user_id=user_id,
            product_id=request.product_id,
            adjustment_type=request.adjustment_type,
            quantity=request.quantity,
            notes=request.notes,
        )

    @classmethod
    def get_movements(
        cls,
        store_id: str,
        product_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        return InventoryRepository.list_movements(
            store_id=store_id,
            product_id=product_id,
            limit=limit,
            offset=offset,
        )

    @classmethod
    def get_valuation(cls, store_id: str) -> Dict[str, Any]:
        return InventoryRepository.get_valuation_summary(store_id=store_id)
