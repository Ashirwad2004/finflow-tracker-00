import sys
import src.modules.whatsapp.service as _mod
sys.modules[__name__] = _mod
from src.modules.whatsapp.service import *  # noqa: F401, F403
