from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FeatureRequestCreate(BaseModel):
    title: str
    description: str


class FeatureRequestUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class FeatureRequestResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    title: str
    description: str
    status: str
    notes: Optional[str] = None
    submitted_at: datetime
    updated_at: datetime