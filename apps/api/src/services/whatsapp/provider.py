import sys
import src.modules.whatsapp.provider as _mod
sys.modules[__name__] = _mod
from src.modules.whatsapp.provider import *  # noqa: F401, F403
