import sys
import src.modules.payments.gateway as _gateway_module

sys.modules[__name__] = _gateway_module

from src.modules.payments.gateway import *  # noqa: F401, F403
