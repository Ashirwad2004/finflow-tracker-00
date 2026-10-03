import sys
import src.modules.parties.service as _service_module

# Forward all module attributes and alias in sys.modules for mock.patch compatibility
sys.modules[__name__] = _service_module

PartyService = _service_module.PartyService
supabase_client = _service_module.supabase_client

__all__ = ["PartyService", "supabase_client"]
