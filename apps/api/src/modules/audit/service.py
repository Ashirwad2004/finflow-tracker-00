import logging
from typing import Any, Dict, List, Optional

from .repository import AuditRepository

logger = logging.getLogger(__name__)


class AuditService:
    @classmethod
    def log_action(
        cls,
        store_id: str,
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ):
        AuditRepository.record_audit(
            store_id=store_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata,
            ip_address=ip_address,
        )

    @classmethod
    def get_logs(
        cls,
        store_id: str,
        limit: int = 50,
        offset: int = 0,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
    ) -> tuple[List[Dict[str, Any]], int]:
        return AuditRepository.list_logs(
            store_id=store_id,
            limit=limit,
            offset=offset,
            action=action,
            resource_type=resource_type,
        )
