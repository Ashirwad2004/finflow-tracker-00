import sys
import src.modules.ai.schemas as _schemas_module

sys.modules[__name__] = _schemas_module

from src.modules.ai.schemas import *  # noqa: F401, F403
