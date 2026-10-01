import sys
import src.modules.whatsapp.openwa_client as _mod
sys.modules[__name__] = _mod
from src.modules.whatsapp.openwa_client import *  # noqa: F401, F403
