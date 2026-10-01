import base64
import json
import logging
import re
from functools import lru_cache
from typing import Any

from google import genai
from google.genai import types
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from src.core.config import settings

logger = logging.getLogger(__name__)

DATA_URL_PATTERN = re.compile(r"^data:(.+);base64,(.+)$")

SAFETY_SETTINGS = [
    types.SafetySetting(
        category="HARM_CATEGORY_HARASSMENT",
        threshold="BLOCK_MEDIUM_AND_ABOVE",
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_HATE_SPEECH",
        threshold="BLOCK_MEDIUM_AND_ABOVE",
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold="BLOCK_MEDIUM_AND_ABOVE",
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold="BLOCK_MEDIUM_AND_ABOVE",
    ),
]


def is_placeholder_key(key: str | None) -> bool:
    if not key:
        return True
    cleaned = key.strip().lower()
    return (
        cleaned.startswith("your_")
        or cleaned.startswith("your-")
        or "placeholder" in cleaned
        or cleaned in {"your_gemini_api_key_here", "your-gemini-api-key", "changeme", "none", "null", "undefined"}
    )


class GeminiServiceError(Exception):
    """Raised when the Gemini provider returns an invalid or blocked response."""


class GeminiAuthError(GeminiServiceError):
    """Raised when the Gemini API key is missing, invalid, or unauthorized."""


def is_retryable_gemini_error(exc: BaseException) -> bool:
    if isinstance(exc, GeminiAuthError):
        return False
    return isinstance(exc, GeminiServiceError)


class GeminiClient:
    def __init__(self, api_key: str, default_model: str) -> None:
        if is_placeholder_key(api_key):
            raise GeminiAuthError("GEMINI_API_KEY is not configured or using a placeholder value")
        self.client = genai.Client(api_key=api_key)
        self.default_model = default_model

    @staticmethod
    def _extract_json_schema(response_format: dict[str, Any] | None) -> dict[str, Any] | None:
        if not response_format:
            return None
        return (
            response_format.get("json_schema", {}).get("schema")
            or response_format.get("schema")
        )

    def _normalize_parts(self, content: Any) -> list[types.Part]:
        if isinstance(content, str):
            return [types.Part.from_text(text=content)]

        if not isinstance(content, list):
            return [types.Part.from_text(text=str(content))]

        parts: list[types.Part] = []
        for part in content:
            if isinstance(part, str):
                parts.append(types.Part.from_text(text=part))
                continue

            if not isinstance(part, dict):
                parts.append(types.Part.from_text(text=str(part)))
                continue

            # Support inline_data format (e.g., from Gemini edge function)
            if "inline_data" in part or "inlineData" in part:
                data_obj = part.get("inline_data") or part.get("inlineData", {})
                b64_data = data_obj.get("data", "")
                mime = data_obj.get("mime_type") or data_obj.get("mimeType", "image/jpeg")
                if b64_data:
                    parts.append(
                        types.Part.from_bytes(
                            data=base64.b64decode(b64_data),
                            mime_type=mime,
                        )
                    )
                continue

            part_type = part.get("type")
            if part_type == "text":
                parts.append(types.Part.from_text(text=str(part.get("text", ""))))
                continue

            if part_type == "image" or part_type == "image_url":
                if "data" in part:
                    b64_data = part.get("data", "")
                    mime = part.get("mime_type", "image/jpeg")
                    parts.append(
                        types.Part.from_bytes(
                            data=base64.b64decode(b64_data),
                            mime_type=mime,
                        )
                    )
                    continue

                url = str(part.get("image_url", {}).get("url", ""))
                match = DATA_URL_PATTERN.match(url)
                if not match:
                    parts.append(types.Part.from_text(text="[Unsupported image URL omitted]"))
                    continue
                parts.append(
                    types.Part.from_bytes(
                        data=base64.b64decode(match.group(2)),
                        mime_type=match.group(1),
                    )
                )
                continue

            parts.append(types.Part.from_text(text=json.dumps(part)))

        return parts

    def _build_request(
        self, messages: list[dict[str, Any]]
    ) -> tuple[str | None, list[types.Content]]:
        system_messages: list[str] = []
        contents: list[types.Content] = []

        for message in messages:
            role = message.get("role")
            content = message.get("content")

            if role == "system":
                system_messages.append(str(content or ""))
                continue

            if role not in {"user", "assistant"}:
                continue

            parts = self._normalize_parts(content)
            if role == "assistant":
                contents.append(types.Content(role="model", parts=parts))
            else:
                contents.append(types.Content(role="user", parts=parts))

        return ("\n\n".join(system_messages).strip() or None, contents)

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception(is_retryable_gemini_error),
    )
    async def generate(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_output_tokens: int | None = None,
        response_format: dict[str, Any] | None = None,
    ) -> str:
        system_instruction, contents = self._build_request(messages)
        if not contents:
            raise GeminiServiceError("No user or assistant messages provided")

        schema = self._extract_json_schema(response_format)
        config_kwargs: dict[str, Any] = {
            "temperature": temperature if temperature is not None else settings.GEMINI_TEMPERATURE,
            "max_output_tokens": max_output_tokens or settings.GEMINI_MAX_OUTPUT_TOKENS,
            "safety_settings": SAFETY_SETTINGS,
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if schema:
            config_kwargs["response_mime_type"] = "application/json"
            config_kwargs["response_json_schema"] = schema

        try:
            response = await self.client.aio.models.generate_content(
                model=model or self.default_model,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )
        except Exception as exc:
            logger.exception("Gemini API request failed")
            err_msg = str(exc)
            if "API_KEY_INVALID" in err_msg or "API key not valid" in err_msg or "invalid api key" in err_msg.lower():
                raise GeminiAuthError(err_msg) from exc
            raise GeminiServiceError(err_msg) from exc

        text = (response.text or "").strip()
        if not text:
            raise GeminiServiceError("Gemini returned an empty response")
        return text

    async def generate_stream(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_output_tokens: int | None = None,
        response_format: dict[str, Any] | None = None,
    ):
        system_instruction, contents = self._build_request(messages)
        if not contents:
            raise GeminiServiceError("No user or assistant messages provided")

        schema = self._extract_json_schema(response_format)
        config_kwargs: dict[str, Any] = {
            "temperature": temperature if temperature is not None else settings.GEMINI_TEMPERATURE,
            "max_output_tokens": max_output_tokens or settings.GEMINI_MAX_OUTPUT_TOKENS,
            "safety_settings": SAFETY_SETTINGS,
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if schema:
            config_kwargs["response_mime_type"] = "application/json"
            config_kwargs["response_json_schema"] = schema

        try:
            stream = await self.client.aio.models.generate_content_stream(
                model=model or self.default_model,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            async for chunk in stream:
                yield chunk.text or ""
        except Exception as exc:
            logger.exception("Gemini API stream request failed")
            err_msg = str(exc)
            if "API_KEY_INVALID" in err_msg or "API key not valid" in err_msg or "invalid api key" in err_msg.lower():
                raise GeminiAuthError(err_msg) from exc
            raise GeminiServiceError(err_msg) from exc


@lru_cache
def get_gemini_client() -> GeminiClient:
    return GeminiClient(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)