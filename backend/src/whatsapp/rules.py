from datetime import datetime, timezone
import pytz
from supabase import create_client
from src.core.config import settings

# Initialize Supabase client using Service Role key to bypass RLS policies
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def is_within_allowed_hours(customer_id: str, timezone_str: str) -> bool:
    """Check if current local time is outside DND quiet hours window."""
    try:
        # Load customer's DND times from notification_settings
        result = supabase.table("notification_settings") \
            .select("dnd_start", "dnd_end") \
            .eq("customer_id", customer_id) \
            .execute()
        
        if result.data and len(result.data) > 0:
            dnd_start_str = result.data[0].get("dnd_start") or "21:00"
            dnd_end_str = result.data[0].get("dnd_end") or "09:00"
        else:
            # If no settings exist, default to DND disabled (allow all hours)
            return True
        
        # Parse hours
        start_hour = int(dnd_start_str.split(":")[0])
        end_hour = int(dnd_end_str.split(":")[0])
        
        tz = pytz.timezone(timezone_str)
        local_hour = datetime.now(tz).hour
        
        if start_hour > end_hour:
            # Overnight window, e.g. 21:00 to 09:00
            if local_hour >= start_hour or local_hour < end_hour:
                return False
        else:
            # Same day window, e.g. 09:00 to 17:00
            if start_hour <= local_hour < end_hour:
                return False
        return True
    except Exception:
        # Default allow if anything fails or timezone is unknown
        return True

def has_opted_in(customer_id: str, event_type: str) -> bool:
    """Check if customer opted in to WhatsApp notifications globally and for this specific event type."""
    try:
        result = supabase.table("notification_settings") \
            .select("*") \
            .eq("customer_id", customer_id) \
            .execute()
            
        if not result.data or len(result.data) == 0:
            # Default to opted-in if no settings record exists (out of the box compatibility)
            return True
            
        settings_data = result.data[0]
        
        # Check master switch first (overrides all specific event toggles)
        if not settings_data.get("master", True):
            return False
            
        # Check if the specific event type is enabled
        return settings_data.get(event_type, True)
    except Exception as e:
        print(f"Error checking opt-in status (defaulting to True): {e}")
        return True

def daily_limit_reached(customer_id: str) -> bool:
    """Check if customer already received maximum daily messages today."""
    try:
        # Use UTC today for daily limit window
        today = datetime.now(timezone.utc).date().isoformat()
        result = supabase.table("notification_log") \
            .select("id") \
            .eq("customer_id", customer_id) \
            .eq("status", "sent") \
            .gte("created_at", today) \
            .execute()
        
        return len(result.data or []) >= settings.MAX_DAILY_MESSAGES
    except Exception as e:
        print(f"Error checking daily limit (defaulting to False): {e}")
        return False
