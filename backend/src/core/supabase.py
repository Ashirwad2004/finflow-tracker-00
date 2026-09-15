from typing import cast
from supabase import Client, create_client
from src.core.config import settings

_raw_client: Client | None = (
    create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    if settings.SUPABASE_URL and settings.SUPABASE_KEY
    else None
)

supabase_client: Client = cast(Client, _raw_client)