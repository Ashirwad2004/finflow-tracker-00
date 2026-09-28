import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_tenant_context
from src.schemas.audit import AuditLogListResponse
from src.services.audit import AuditService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit", tags=["Audit Logging"])


@router.get("/logs", response_model=AuditLogListResponse, status_code=status.HTTP_200_OK)
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    tenant_context: tuple[str, str] = Depends(get_tenant_context),
) -> Dict[str, Any]:
    """Retrieves immutable audit logs for this tenant."""
    store_id, _ = tenant_context
    logs, total = AuditService.get_logs(
        store_id=store_id,
        limit=limit,
        offset=offset,
        action=action,
        resource_type=resource_type,
    )
    return {
        "logs": logs,
        "total": total,
    }
