"""Tests for the public custom-build intake endpoint.

The endpoint is unauthenticated on purpose, so its validation and abuse
handling are the only things standing between the queue and the open internet.
"""

from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from src.core.limiter import limiter
from src.modules.feature_requests.schemas import CustomBuildRequest
from src.modules.feature_requests.service import FeatureRequestsService

ENDPOINT = "/api/v1/feature-requests/custom-build"

VALID = {
    "business_name": "Sharma Tyre House",
    "contact_name": "Ramesh Sharma",
    "contact_phone": "9876543210",
    "build_type": "report",
    "description": "I need a stock report grouped by tyre size so I can reorder from my distributor.",
}


@pytest.fixture(autouse=True)
def _reset_limiter():
    """The endpoint is limited to 5/hour per IP, which would otherwise leak
    across tests in this module."""
    limiter.reset()
    yield
    limiter.reset()


def _insert_ok(row_id: str = "11112222-3333-4444-5555-666677778888"):
    """Stand in for the Supabase client, returning one inserted row."""
    client = MagicMock()
    client.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": row_id}]
    )
    return client


# ---------------------------------------------------------------------------
# Payload validation
# ---------------------------------------------------------------------------


def test_description_must_be_substantial():
    """A two-word request cannot be scoped or costed."""
    with pytest.raises(ValidationError):
        CustomBuildRequest(**{**VALID, "description": "make app"})


def test_filler_description_is_rejected():
    """Length alone is not a requirement; this is what spam submits."""
    with pytest.raises(ValidationError):
        CustomBuildRequest(**{**VALID, "description": "aaaaaaaaaaaaaaaaaaaaaaaaaaaa"})


def test_build_type_is_constrained():
    with pytest.raises(ValidationError):
        CustomBuildRequest(**{**VALID, "build_type": "blockchain"})


@pytest.mark.parametrize("build_type", ["feature", "report", "integration", "custom_app"])
def test_every_build_type_is_accepted(build_type):
    assert CustomBuildRequest(**{**VALID, "build_type": build_type}).build_type == build_type


def test_whitespace_is_stripped():
    payload = CustomBuildRequest(**{**VALID, "business_name": "  Sharma Tyre House  "})
    assert payload.business_name == "Sharma Tyre House"


def test_blank_business_name_is_rejected():
    with pytest.raises(ValidationError):
        CustomBuildRequest(**{**VALID, "business_name": "   "})


def test_email_is_optional():
    assert CustomBuildRequest(**VALID).contact_email is None


def test_blank_email_is_treated_as_absent():
    """An untouched optional input posts "" rather than null."""
    assert CustomBuildRequest(**{**VALID, "contact_email": "  "}).contact_email is None


def test_malformed_email_is_rejected():
    with pytest.raises(ValidationError):
        CustomBuildRequest(**{**VALID, "contact_email": "not-an-email"})


# ---------------------------------------------------------------------------
# Phone handling
# ---------------------------------------------------------------------------


def test_phone_is_normalised_for_display(client):
    """The admin has to be able to dial what is stored."""
    fake = _insert_ok()
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        response = client.post(ENDPOINT, json={**VALID, "contact_phone": "09876543210"})

    assert response.status_code == 201
    stored = fake.table.return_value.insert.call_args.args[0]
    assert stored["contact_phone"] == "+91 98765 43210"


def test_invalid_indian_mobile_is_rejected_with_a_usable_message(client):
    fake = _insert_ok()
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        response = client.post(ENDPOINT, json={**VALID, "contact_phone": "1234567890"})

    assert response.status_code == 400
    assert "6, 7, 8, or 9" in response.json()["detail"]
    fake.table.return_value.insert.assert_not_called()


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


def test_request_is_stored_as_an_anonymous_landing_lead(client):
    fake = _insert_ok()
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        response = client.post(ENDPOINT, json=VALID)

    assert response.status_code == 201
    stored = fake.table.return_value.insert.call_args.args[0]

    assert stored["user_id"] is None, "a landing visitor has no account"
    assert stored["source"] == "landing"
    assert stored["status"] == "pending"
    assert stored["business_name"] == "Sharma Tyre House"
    assert stored["contact_name"] == "Ramesh Sharma"
    assert stored["build_type"] == "report"
    assert stored["description"] == VALID["description"]
    # The title is what the admin queue lists, so it must identify the lead.
    assert stored["title"] == "Custom report - Sharma Tyre House"


def test_email_is_stored_when_supplied(client):
    fake = _insert_ok()
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        client.post(ENDPOINT, json={**VALID, "contact_email": "ramesh@sharmatyre.in"})

    stored = fake.table.return_value.insert.call_args.args[0]
    assert stored["user_email"] == "ramesh@sharmatyre.in"


def test_response_returns_a_short_reference(client):
    fake = _insert_ok("abcdef12-3456-7890-abcd-ef1234567890")
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        response = client.post(ENDPOINT, json=VALID)

    body = response.json()
    assert body["success"] is True
    assert body["reference"] == "ABCDEF12"
    assert body["message"]


def test_response_does_not_leak_the_stored_row(client):
    """An unauthenticated caller gets a confirmation, not a record."""
    fake = _insert_ok()
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        body = client.post(ENDPOINT, json=VALID).json()

    assert set(body) == {"success", "reference", "message"}


def test_database_outage_reports_503(client):
    with patch("src.modules.feature_requests.service.supabase_client", None):
        response = client.post(ENDPOINT, json=VALID)
    assert response.status_code == 503


def test_insert_failure_does_not_claim_success(client):
    fake = MagicMock()
    fake.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        response = client.post(ENDPOINT, json=VALID)
    assert response.status_code == 500


# ---------------------------------------------------------------------------
# Abuse handling
# ---------------------------------------------------------------------------


def test_honeypot_writes_nothing_but_looks_successful(client):
    """A bot must get no signal that it was detected, or it just retries."""
    fake = _insert_ok()
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        response = client.post(ENDPOINT, json={**VALID, "company_website": "http://spam.example"})

    assert response.status_code == 201
    assert response.json()["success"] is True
    fake.table.return_value.insert.assert_not_called()


def test_endpoint_is_rate_limited_per_ip(client):
    fake = _insert_ok()
    statuses = []
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        for _ in range(7):
            statuses.append(client.post(ENDPOINT, json=VALID).status_code)

    assert statuses[:5] == [201] * 5
    assert 429 in statuses, "an unauthenticated write endpoint must be capped"


# ---------------------------------------------------------------------------
# Service-level behaviour
# ---------------------------------------------------------------------------


def test_service_labels_each_build_type_for_the_queue():
    fake = _insert_ok()
    labels = {}
    with patch("src.modules.feature_requests.service.supabase_client", fake):
        for build_type in ["feature", "report", "integration", "custom_app"]:
            FeatureRequestsService.create_custom_build(
                CustomBuildRequest(**{**VALID, "build_type": build_type})
            )
            labels[build_type] = fake.table.return_value.insert.call_args.args[0]["title"]

    assert labels["feature"].startswith("New feature")
    assert labels["report"].startswith("Custom report")
    assert labels["integration"].startswith("Integration")
    assert labels["custom_app"].startswith("Custom app")
