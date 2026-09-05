from supabase import Client, create_client
from src.core.config import settings

supabase_client: Client | None = (
    create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    if settings.SUPABASE_URL and settings.SUPABASE_KEY
    else None
)