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
