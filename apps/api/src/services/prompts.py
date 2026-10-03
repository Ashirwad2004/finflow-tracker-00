import sys
import src.modules.ai.prompts as _prompts_module

sys.modules[__name__] = _prompts_module

from src.modules.ai.prompts import *  # noqa: F401, F403
