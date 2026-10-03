import sys
import src.modules.payments.schemas as _schemas_module

sys.modules[__name__] = _schemas_module

from src.modules.payments.schemas import *  # noqa: F401, F403
