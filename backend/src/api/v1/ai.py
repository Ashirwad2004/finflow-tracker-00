import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from src.ai.client import GeminiServiceError, get_gemini_client
from src.ai.schemas import (
    BusinessInsightRequest,
    BusinessInsightResponse,
    CompletionRequest,
    CompletionResponse,
    FinanceInsightRequest,
    FinanceInsightResponse,
    ProductContentRequest,
    ProductContentResponse,
    ProductSearchRequest,
    ProductSearchResponse,
)
from src.ai.services import CatalogService, InsightService
from src.core.config import settings
from src.core.limiter import limiter
from src.core.security import require_ai_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI"])


def _ensure_ai_configured() -> None:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured on the server",
        )


@router.post("/completions", response_model=CompletionResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def create_completion(
    request: Request,
    payload: CompletionRequest,
    _: str | None = Depends(require_ai_user),
) -> CompletionResponse:
    _ensure_ai_configured()

    try:
        client = get_gemini_client()
        text = await client.generate(
            [message.model_dump() for message in payload.messages],
            model=payload.model,
            temperature=payload.temperature,
            max_output_tokens=payload.maxOutputTokens,
            response_format=payload.response_format,
        )
    except GeminiServiceError as exc:
        logger.exception("Gemini completion failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return CompletionResponse(
        text=text,
        choices=[{"message": {"content": text}}],
    )


@router.post("/insights/finance", response_model=FinanceInsightResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def finance_insights(
    request: Request,
    payload: FinanceInsightRequest,
    _: str | None = Depends(require_ai_user),
) -> FinanceInsightResponse:
    _ensure_ai_configured()
    service = InsightService(get_gemini_client())
    try:
        return await service.generate_finance_insight(payload)
    except (GeminiServiceError, ValueError) as exc:
        logger.exception("Finance insight generation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post("/insights/business", response_model=BusinessInsightResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def business_insights(
    request: Request,
    payload: BusinessInsightRequest,
    _: str | None = Depends(require_ai_user),
) -> BusinessInsightResponse:
    _ensure_ai_configured()
    service = InsightService(get_gemini_client())
    try:
        return await service.generate_business_insight(payload)
    except (GeminiServiceError, ValueError) as exc:
        logger.exception("Business insight generation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post("/products/search", response_model=ProductSearchResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def product_search(
    request: Request,
    payload: ProductSearchRequest,
    _: str | None = Depends(require_ai_user),
) -> ProductSearchResponse:
    _ensure_ai_configured()
    service = CatalogService(get_gemini_client())
    try:
        return await service.parse_product_search(payload)
    except (GeminiServiceError, ValueError) as exc:
        logger.exception("Product search parsing failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post("/products/content", response_model=ProductContentResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def product_content(
    request: Request,
    payload: ProductContentRequest,
    _: str | None = Depends(require_ai_user),
) -> ProductContentResponse:
    _ensure_ai_configured()
    service = CatalogService(get_gemini_client())
    try:
        return await service.generate_product_content(payload)
    except (GeminiServiceError, ValueError) as exc:
        logger.exception("Product content generation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
