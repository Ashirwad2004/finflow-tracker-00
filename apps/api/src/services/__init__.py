"""Business logic and services layer."""

def __getattr__(name: str):
    if name == "InvoiceService":
        from src.modules.invoices.service import InvoiceService
        return InvoiceService
    if name == "PurchaseService":
        from src.modules.purchases.service import PurchaseService
        return PurchaseService
    if name == "InventoryService":
        from src.modules.inventory.service import InventoryService
        return InventoryService
    if name == "PartyService":
        from src.modules.parties.service import PartyService
        return PartyService
    if name == "AuditService":
        from src.modules.audit.service import AuditService
        return AuditService
    if name == "ReportsService":
        from src.modules.reports.service import ReportsService
        return ReportsService
    if name == "POSService":
        from src.modules.pos.service import POSService
        return POSService
    raise AttributeError(f"module 'src.services' has no attribute '{name}'")

__all__ = [
    "InvoiceService",
    "PurchaseService",
    "InventoryService",
    "PartyService",
    "AuditService",
    "ReportsService",
    "POSService",
]
