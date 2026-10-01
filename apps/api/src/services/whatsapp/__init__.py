"""WhatsApp service legacy compatibility package."""

def __getattr__(name: str):
    if name == "WhatsAppService":
        from src.modules.whatsapp.service import WhatsAppService
        return WhatsAppService
    if name == "WhatsAppProvider":
        from src.modules.whatsapp.provider import WhatsAppProvider
        return WhatsAppProvider
    if name == "OpenWAProvider":
        from src.modules.whatsapp.openwa_provider import OpenWAProvider
        return OpenWAProvider
    if name == "OpenWAClient":
        from src.modules.whatsapp.openwa_client import OpenWAClient
        return OpenWAClient
    raise AttributeError(f"module 'src.services.whatsapp' has no attribute '{name}'")

__all__ = ["WhatsAppService", "WhatsAppProvider", "OpenWAProvider", "OpenWAClient"]
