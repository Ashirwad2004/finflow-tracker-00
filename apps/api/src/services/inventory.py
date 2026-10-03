import sys
import src.modules.inventory.service as _service_module

sys.modules[__name__] = _service_module

InventoryService = _service_module.InventoryService

__all__ = ["InventoryService"]
