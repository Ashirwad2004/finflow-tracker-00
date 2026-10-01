import sys
import src.modules.ai.service as _service_module

sys.modules[__name__] = _service_module

from src.modules.ai.service import *  # noqa: F401, F403
