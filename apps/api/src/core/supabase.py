from typing import cast
import logging
from fastapi import HTTPException, status
from supabase import Client, create_client
from src.core.config import settings

logger = logging.getLogger(__name__)

_raw_client: Client | None = (
    create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    if settings.SUPABASE_URL and settings.SUPABASE_KEY
    else None
)

supabase_client: Client = cast(Client, _raw_client)

def get_supabase_client() -> Client:
    """Returns the configured Supabase client or raises 503 if not configured."""
    if _raw_client is None:
        logger.error("Supabase client is not configured: SUPABASE_URL or SUPABASE_KEY is missing.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service client is not configured on the server."
        )
    return _raw_client