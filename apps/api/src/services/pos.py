import sys
import src.modules.pos.service as _service_module

sys.modules[__name__] = _service_module

POSService = _service_module.POSService

__all__ = ["POSService"]
