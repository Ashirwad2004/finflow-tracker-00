import sys
import src.modules.settings.service as _service_module

# Forward all module attributes and alias in sys.modules for mock.patch compatibility
sys.modules[__name__] = _service_module

SettingsService = _service_module.SettingsService
supabase_client = _service_module.supabase_client

__all__ = ["SettingsService", "supabase_client"]
