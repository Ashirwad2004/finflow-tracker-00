import sys
import src.modules.whatsapp.openwa_provider as _mod
sys.modules[__name__] = _mod
from src.modules.whatsapp.openwa_provider import *  # noqa: F401, F403
