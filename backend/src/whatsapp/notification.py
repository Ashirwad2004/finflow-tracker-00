from supabase import create_client
from src.core.config import settings
from src.whatsapp.rules import is_within_allowed_hours, has_opted_in, daily_limit_reached
from src.whatsapp.whatsapp import build_payload, send_whatsapp, TEMPLATES
from src.whatsapp.models import BillingEvent
from datetime import datetime, timezone

# Initialize Supabase client using Service Role key
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

async def process_billing_event(event: BillingEvent):
    if event.event_type not in TEMPLATES:
        return {"status": "failed", "error": f"Unknown event type: {event.event_type}"}

    log = {
        "customer_id": event.customer_id,
        "event_type": event.event_type,
        "template_name": TEMPLATES[event.event_type]["name"],
        "status": None,
        "skip_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    # --- Rule Checks ---
    if not has_opted_in(event.customer_id, event.event_type):
        log["status"] = "skipped"
        log["skip_reason"] = "not_opted_in"
        try:
            supabase.table("notification_log").insert(log).execute()
        except Exception:
            pass
        return {"skipped": True, "reason": "Customer not opted in"}

    if not is_within_allowed_hours(event.customer_id, event.customer_timezone):
        log["status"] = "skipped"
        log["skip_reason"] = "dnd_hours"
        try:
            supabase.table("notification_log").insert(log).execute()
        except Exception:
            pass
        return {"skipped": True, "reason": "DND hours active"}

    if daily_limit_reached(event.customer_id):
        log["status"] = "skipped"
        log["skip_reason"] = "daily_limit_reached"
        try:
            supabase.table("notification_log").insert(log).execute()
        except Exception:
            pass
        return {"skipped": True, "reason": "Daily message limit reached"}

    # --- Use the event/customer phone for customer-facing notifications. ---
    # notification_settings belongs to the signed-in merchant and should not
    # override the target customer on invoices.
    phone = event.customer_phone
    if not phone or not "".join(filter(str.isdigit, phone)):
        log["status"] = "skipped"
        log["skip_reason"] = "missing_customer_phone"
        try:
            supabase.table("notification_log").insert(log).execute()
        except Exception:
            pass
        return {"skipped": True, "reason": "Customer phone number is missing"}

    # --- Build & Send ---
    payload = build_payload(phone, event.event_type, event)
    result = await send_whatsapp(payload)

    log["status"] = result.get("status", "failed")
    if log["status"] == "sent":
        log["message_id"] = result.get("data", {}).get("messages", [{}])[0].get("id")
    else:
        log["skip_reason"] = "api_error"
        
    try:
        supabase.table("notification_log").insert(log).execute()
    except Exception:
        pass

    return result
