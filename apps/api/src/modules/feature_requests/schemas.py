import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

# Email is an optional convenience here -- phone is the channel this audience
# actually uses -- so it is shape-checked rather than pulling in the
# `email-validator` dependency that pydantic's EmailStr requires.
_EMAIL_SHAPE = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$")

#: What kind of work is being asked for. Kept in sync with the DB CHECK
#: constraint in 20261007000000_custom_build_requests.sql.
BuildType = Literal["feature", "report", "integration", "custom_app"]


class FeatureRequestCreate(BaseModel):
    title: str
    description: str


class CustomBuildRequest(BaseModel):
    """A custom-work request from the public landing page.

    The visitor is not signed in, so the contact details are the only way to
    reach them and are therefore required rather than optional.
    """

    business_name: str = Field(min_length=2, max_length=120)
    contact_name: str = Field(min_length=2, max_length=120)
    contact_phone: str = Field(min_length=6, max_length=24)
    build_type: BuildType
    description: str = Field(min_length=20, max_length=4000)
    contact_email: Optional[str] = Field(default=None, max_length=200)

    #: Hidden field no human fills in. Bots complete every input they find, so a
    #: non-empty value here is the cheapest possible spam signal.
    company_website: Optional[str] = Field(default=None, max_length=200)

    @field_validator("business_name", "contact_name", "description")
    @classmethod
    def _strip(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be blank.")
        return cleaned

    @field_validator("contact_email")
    @classmethod
    def _check_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if not _EMAIL_SHAPE.match(cleaned):
            raise ValueError("Enter a valid email address, or leave it blank.")
        return cleaned

    @field_validator("description")
    @classmethod
    def _reject_filler(cls, value: str) -> str:
        # 20 characters of "aaaaaaaaaaaaaaaaaaaa" passes a length check but
        # carries no requirement to scope, and it is what spam submits.
        if len(set(value.lower().replace(" ", ""))) < 6:
            raise ValueError(
                "Please describe what the software should do, in your own words."
            )
        return value


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

    # Present on landing-page requests, absent on in-app ones.
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    business_name: Optional[str] = None
    build_type: Optional[str] = None
    source: str = "app"


class CustomBuildResponse(BaseModel):
    """What the landing page shows back to the visitor.

    Deliberately not the whole row: an unauthenticated caller should get a
    confirmation, not a record.
    """

    success: bool = True
    reference: str
    message: str
