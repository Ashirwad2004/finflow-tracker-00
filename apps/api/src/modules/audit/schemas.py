from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AuditLogItem(BaseModel):
    id: str
    store_id: str
    user_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: str


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogItem]
    total: int
