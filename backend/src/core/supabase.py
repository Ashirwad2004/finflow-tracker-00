import logging
from supabase import Client, create_client
from src.core.config import settings

logger = logging.getLogger(__name__)

url = settings.SUPABASE_URL or "https://placeholder-project.supabase.co"
key = settings.SUPABASE_KEY or "placeholder-anon-key-12345"

# Initialize Supabase client using Service Role to bypass RLS
supabase_client: Client = create_client(url, key)
