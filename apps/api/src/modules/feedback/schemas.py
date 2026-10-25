from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator

FeedbackCategory = Literal["pos", "inventory", "gst", "khata", "general"]


class FeedbackCreate(BaseModel):
    author_name: str = Field(min_length=2, max_length=100)
    business_name: str = Field(min_length=2, max_length=120)
    business_type: Optional[str] = Field(default=None, max_length=100)
    city: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=80)
    rating: int = Field(ge=1, le=5, default=5)
    category: FeedbackCategory = "pos"
    feedback_text: str = Field(min_length=10, max_length=2000)
    recommend: bool = True
    contact_phone: Optional[str] = Field(default=None, max_length=25)
    website_honeypot: Optional[str] = Field(default=None, max_length=200)

    @field_validator("author_name", "business_name", "feedback_text")
    @classmethod
    def _strip_strings(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or pure whitespace.")
        return cleaned


class FeedbackItemResponse(BaseModel):
    id: str
    author_name: str
    business_name: str
    business_type: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    rating: int
    category: str
    feedback_text: str
    highlight_figure: Optional[str] = None
    highlight_label: Optional[str] = None
    is_verified: bool = True
    helpful_count: int = 0
    recommend: bool = True
    created_at: str


class FeedbackSubmitResponse(BaseModel):
    success: bool = True
    id: str
    message: str
    feedback: Optional[FeedbackItemResponse] = None


class HelpfulVoteResponse(BaseModel):
    success: bool = True
    id: str
    helpful_count: int
