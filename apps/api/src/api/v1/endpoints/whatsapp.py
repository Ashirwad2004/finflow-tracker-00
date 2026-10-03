import sys
import types
from src.modules.whatsapp.router import router

_mod = sys.modules["src.modules.whatsapp.router"]

class _ModuleWrapper(types.ModuleType):
    def __getattr__(self, name):
        return getattr(_mod, name)

    def __setattr__(self, name, value):
        setattr(_mod, name, value)
        super().__setattr__(name, value)

sys.modules[__name__].__class__ = _ModuleWrapper
__all__ = ["router"]
