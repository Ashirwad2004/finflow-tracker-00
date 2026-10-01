"""
Backward-compatibility re-export shim.
Canonical implementation located in src.modules.feature_requests.router.
"""
from src.modules.feature_requests.router import (
    router,
    create_request,
    list_requests,
    update_request,
)

__all__ = [
    "router",
    "create_request",
    "list_requests",
    "update_request",
]