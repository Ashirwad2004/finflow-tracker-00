import logging
from typing import Any, Dict
from src.core.supabase import supabase_client

logger = logging.getLogger(__name__)


class SettingsService:
    @classmethod
    def get_sales_settings(cls, store_id: str) -> Dict[str, Any]:
        """
        Fetches store-level sales settings.
        Enforces tenant isolation by store_id.
        """
        defaults: Dict[str, Any] = {
            "show_party_pending_balance": True,
            "show_party_previous_balance": True,
        }

        if supabase_client is None:
            return defaults

        try:
            res = (
                supabase_client.table("user_settings")
                .select("show_party_pending_balance, sales_settings")
                .eq("user_id", store_id)
                .maybe_single()
                .execute()
            )
            row = getattr(res, "data", None)
            if row and isinstance(row, dict):
                show_bal = row.get("show_party_pending_balance")
                stored_settings = row.get("sales_settings") or {}

                if show_bal is None and isinstance(stored_settings, dict):
                    show_bal = stored_settings.get("show_party_pending_balance")
                    if show_bal is None:
                        show_bal = stored_settings.get("show_party_previous_balance")

                effective_bal = bool(show_bal) if show_bal is not None else True
                merged = {
                    **defaults,
                    **stored_settings,
                    "show_party_pending_balance": effective_bal,
                    "show_party_previous_balance": effective_bal,
                }
                return merged
        except Exception as exc:
            logger.warning("Failed to fetch user_settings for store %s: %s", store_id, exc)

        return defaults

    @classmethod
    def update_sales_settings(cls, store_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists store-level sales settings to database (public.user_settings).
        Ensures tenant boundary security.
        """
        if supabase_client is None:
            return {**payload, "show_party_pending_balance": payload.get("show_party_pending_balance", True)}

        show_bal = payload.get("show_party_pending_balance")
        if show_bal is None:
            show_bal = payload.get("show_party_previous_balance")

        update_payload: Dict[str, Any] = {
            "sales_settings": payload,
        }
        if show_bal is not None:
            update_payload["show_party_pending_balance"] = bool(show_bal)

        try:
            # Try updating existing record
            res = (
                supabase_client.table("user_settings")
                .update(update_payload)
                .eq("user_id", store_id)
                .execute()
            )
            data = getattr(res, "data", [])
            if not data:
                # If row did not exist, upsert
                upsert_payload = {
                    "user_id": store_id,
                    **update_payload,
                }
                supabase_client.table("user_settings").upsert(upsert_payload).execute()
        except Exception as exc:
            logger.warning("Failed to update user_settings for store %s: %s", store_id, exc)
            # Fallback attempt: if column does not exist yet in DB schema, update without column
            try:
                supabase_client.table("user_settings").update({
                    "sales_settings": payload
                }).eq("user_id", store_id).execute()
            except Exception as nested_exc:
                logger.warning("Fallback update also failed for store %s: %s", store_id, nested_exc)

        return cls.get_sales_settings(store_id)
