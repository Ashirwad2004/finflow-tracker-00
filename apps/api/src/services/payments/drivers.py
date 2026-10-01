import sys
import src.modules.payments.drivers as _drivers_module

sys.modules[__name__] = _drivers_module

from src.modules.payments.drivers import *  # noqa: F401, F403
