"""
Backward-compatibility re-export shim.
Canonical implementation located in src.modules.backup.router.
"""
from src.modules.backup.router import router, backup_health, export_user_data

__all__ = ["router", "backup_health", "export_user_data"]
