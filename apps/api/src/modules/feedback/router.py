from typing import List, Optional
from fastapi import APIRouter, Query, Request, status
from src.core.limiter import limiter
from src.modules.feedback.schemas import (
    FeedbackCreate,
    FeedbackItemResponse,
    FeedbackSubmitResponse,
    HelpfulVoteResponse,
)
from src.modules.feedback.service import FeedbackService

router = APIRouter(prefix="/feedback", tags=["User Feedback"])


@router.get("", response_model=List[FeedbackItemResponse])
async def list_feedback(
    category: Optional[str] = Query(None, description="Category filter (pos, inventory, gst, khata, general)"),
):
    """Retrieve all approved public user feedback and reviews."""
    return FeedbackService.list_feedback(category=category)


@router.post("", response_model=FeedbackSubmitResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/hour")
async def submit_feedback(request: Request, payload: FeedbackCreate):
    """Public intake for user feedback & reviews from the landing page.

    Rate-limited per IP, protected by honeypot, unauthenticated so prospective and
    active shop owners can submit reviews without barrier.
    """
    row = FeedbackService.create_feedback(payload=payload)
    return FeedbackSubmitResponse(
        success=True,
        id=str(row.get("id")),
        message="Thank you! Your feedback has been recorded successfully.",
        feedback=FeedbackItemResponse(**row),
    )


@router.post("/{feedback_id}/helpful", response_model=HelpfulVoteResponse)
@limiter.limit("30/hour")
async def mark_helpful(request: Request, feedback_id: str):
    """Increment the helpful counter for a review."""
    count = FeedbackService.mark_helpful(feedback_id=feedback_id)
    return HelpfulVoteResponse(success=True, id=feedback_id, helpful_count=count)
