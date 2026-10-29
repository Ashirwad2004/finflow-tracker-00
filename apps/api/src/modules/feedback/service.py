import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from src.core.supabase import supabase_client
from src.modules.feedback.schemas import FeedbackCreate

logger = logging.getLogger(__name__)

# Reviews live only in the database. There is no seed list and no in-memory
# fallback: if the store is unreachable the endpoint says so, because the
# landing page must never show a review no merchant wrote.


def _require_client():
    if supabase_client is None:
        logger.error("FeedbackService: Supabase client unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Feedback store is unavailable. Please try again shortly.",
        )
    return supabase_client


def _row_to_item(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(row.get("id")),
        "author_name": row.get("author_name", "Anonymous"),
        "business_name": row.get("business_name", ""),
        "business_type": row.get("business_type"),
        "city": row.get("city"),
        "state": row.get("state"),
        "rating": int(row.get("rating") or 5),
        "category": row.get("category", "pos"),
        "feedback_text": row.get("feedback_text", ""),
        "highlight_figure": row.get("highlight_figure"),
        "highlight_label": row.get("highlight_label"),
        "is_verified": bool(row.get("is_verified", False)),
        "helpful_count": int(row.get("helpful_count") or 0),
        "recommend": bool(row.get("recommend", True)),
        "created_at": str(row.get("created_at") or datetime.now(timezone.utc).isoformat()),
    }


class FeedbackService:
    @classmethod
    def list_feedback(cls, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return approved merchant reviews, newest first."""
        client = _require_client()
        try:
            query = (
                client.table("user_feedback")
                .select("*")
                .eq("status", "approved")
                .order("created_at", desc=True)
            )
            if category and category != "all":
                query = query.eq("category", category)

            res = query.execute()
        except Exception as exc:
            logger.exception("FeedbackService: failed to list feedback: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not load reviews right now. Please try again shortly.",
            ) from exc

        rows = getattr(res, "data", None) or []
        return [_row_to_item(row) for row in rows]

    @classmethod
    def create_feedback(
        cls,
        payload: FeedbackCreate,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record one merchant's review."""
        client = _require_client()

        data: Dict[str, Any] = {
            "author_name": payload.author_name,
            "business_name": payload.business_name,
            "business_type": payload.business_type,
            "city": payload.city,
            "state": payload.state,
            "rating": payload.rating,
            "category": payload.category,
            "feedback_text": payload.feedback_text,
            "recommend": payload.recommend,
            "is_verified": False,
            "helpful_count": 0,
            "status": "approved",
            "contact_phone": payload.contact_phone,
            "user_id": user_id,
        }

        try:
            res = client.table("user_feedback").insert(data).execute()
        except Exception as exc:
            logger.exception("FeedbackService: failed to insert feedback: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not save your review right now. Please try again shortly.",
            ) from exc

        rows = getattr(res, "data", None) or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not save your review right now. Please try again shortly.",
            )
        return _row_to_item(rows[0])

    @classmethod
    def mark_helpful(cls, feedback_id: str) -> int:
        """Increment the helpful counter on one review and return the new count."""
        client = _require_client()
        try:
            res = (
                client.table("user_feedback")
                .select("helpful_count")
                .eq("id", feedback_id)
                .eq("status", "approved")
                .execute()
            )
            rows = getattr(res, "data", None) or []
            if not rows:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Review not found.",
                )

            new_count = int(rows[0].get("helpful_count") or 0) + 1
            client.table("user_feedback").update({"helpful_count": new_count}).eq(
                "id", feedback_id
            ).execute()
            return new_count
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("FeedbackService: failed to mark feedback helpful: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not record your vote right now. Please try again shortly.",
            ) from exc
