import sys
import src.modules.audit.repository as _repo_module

sys.modules[__name__] = _repo_module

AuditRepository = _repo_module.AuditRepository

__all__ = ["AuditRepository"]
