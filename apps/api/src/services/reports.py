import sys
import src.modules.reports.service as _service_module

sys.modules[__name__] = _service_module

ReportsService = _service_module.ReportsService

__all__ = ["ReportsService"]
