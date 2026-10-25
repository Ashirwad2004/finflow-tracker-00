import os

# Unit tests must never initialize clients from a developer's real credentials.
for name in (
    "VITE_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "GEMINI_API_KEY",
    "OPENWA_WEBHOOK_SECRET",
):
    os.environ[name] = ""

import pytest
from fastapi.testclient import TestClient
from src.main import app


@pytest.fixture(scope="module")
def client():
    """
    Fixture providing a TestClient configured with our FastAPI app.
    """
    with TestClient(app) as c:
        yield c
