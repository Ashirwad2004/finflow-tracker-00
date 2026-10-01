import sys
import src.modules.audit.service as _service_module

sys.modules[__name__] = _service_module

AuditService = _service_module.AuditService

__all__ = ["AuditService"]
