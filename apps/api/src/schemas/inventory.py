from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InventoryAdjustmentRequest(BaseModel):
    product_id: str
    adjustment_type: str = Field(pattern="^(addition|deduction|set_exact|damage|audit)$")
    quantity: float = Field(gt=0)
    notes: Optional[str] = None


class InventoryMovementItem(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    type: str
    quantity: float
    previous_stock: float
    resulting_stock: float
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: str


class InventoryValuationSummary(BaseModel):
    total_products: int
    total_stock_units: float
    total_retail_value: float
    total_cost_value: float
    low_stock_count: int
