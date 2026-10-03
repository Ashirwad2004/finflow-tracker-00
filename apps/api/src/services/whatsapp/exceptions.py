import sys
import src.modules.whatsapp.exceptions as _mod
sys.modules[__name__] = _mod
from src.modules.whatsapp.exceptions import *  # noqa: F401, F403
