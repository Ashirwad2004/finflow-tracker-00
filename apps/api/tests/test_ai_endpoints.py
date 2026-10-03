import pytest
from unittest.mock import patch, AsyncMock
from src.main import app
from src.api.deps import require_ai_user
from src.core.ai_client import (
    is_placeholder_key,
    GeminiClient,
    GeminiAuthError,
)
from src.core.config import settings


def test_is_placeholder_key():
    assert is_placeholder_key("") is True
    assert is_placeholder_key(None) is True
    assert is_placeholder_key("your_gemini_api_key_here") is True
    assert is_placeholder_key("your-gemini-api-key") is True
    assert is_placeholder_key("your_api_key") is True
    assert is_placeholder_key("my_placeholder_key") is True
    assert is_placeholder_key("changeme") is True
    assert is_placeholder_key("AIzaSyDummyRealLookingKey12345678") is False


def test_gemini_client_rejects_placeholder_key():
    with pytest.raises(GeminiAuthError) as exc_info:
        GeminiClient("your_gemini_api_key_here", "gemini-2.5-flash")
    assert "not configured or using a placeholder" in str(exc_info.value)


def test_completions_endpoint_returns_503_on_placeholder_key(client):
    app.dependency_overrides[require_ai_user] = lambda: "test_user"
    try:
        with patch.object(settings, "GEMINI_API_KEY", "your_gemini_api_key_here"):
            response = client.post(
                "/api/v1/ai/completions",
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                },
            )
            assert response.status_code == 503
            assert "placeholder" in response.json()["detail"].lower() or "not configured" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(require_ai_user, None)


def test_completions_endpoint_returns_503_on_gemini_auth_error(client):
    app.dependency_overrides[require_ai_user] = lambda: "test_user"
    try:
        with patch.object(settings, "GEMINI_API_KEY", "AIzaSyValidFormatKey12345678"):
            mock_client = AsyncMock()
            mock_client.generate.side_effect = GeminiAuthError("API key not valid")
            with patch("src.api.v1.endpoints.ai.get_gemini_client", return_value=mock_client):
                response = client.post(
                    "/api/v1/ai/completions",
                    json={
                        "messages": [{"role": "user", "content": "Hello"}],
                    },
                )
                assert response.status_code == 503
                assert "invalid or unauthorized" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(require_ai_user, None)
