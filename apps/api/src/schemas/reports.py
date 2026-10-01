import sys
import src.modules.reports.schemas as _schemas_module

sys.modules[__name__] = _schemas_module

from src.modules.reports.schemas import *  # noqa: F401, F403
