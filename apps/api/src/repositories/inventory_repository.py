import sys
import src.modules.inventory.repository as _repo_module

sys.modules[__name__] = _repo_module

InventoryRepository = _repo_module.InventoryRepository

__all__ = ["InventoryRepository"]
