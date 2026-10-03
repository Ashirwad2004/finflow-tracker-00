"""
Backward-compatibility re-export shim.
Canonical implementation located in src.modules.settings.router.
"""
from src.modules.settings.router import (
    router,
    get_sales_settings,
    update_sales_settings,
    SalesSettingsUpdateRequest,
)

__all__ = [
    "router",
    "get_sales_settings",
    "update_sales_settings",
    "SalesSettingsUpdateRequest",
]
