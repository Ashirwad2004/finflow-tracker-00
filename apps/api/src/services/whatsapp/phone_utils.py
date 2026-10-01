import sys
import src.modules.whatsapp.phone_utils as _mod
sys.modules[__name__] = _mod
from src.modules.whatsapp.phone_utils import *  # noqa: F401, F403
