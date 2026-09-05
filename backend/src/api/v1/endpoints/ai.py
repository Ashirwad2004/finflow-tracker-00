import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from src.core.ai_client import GeminiServiceError, get_gemini_client
from src.schemas.ai import (
    BusinessInsightRequest,
    BusinessInsightResponse,
    CompletionRequest,
    CompletionResponse,
    FinanceInsightRequest,
    FinanceInsightResponse,
    MagicAddParseRequest,
    MagicAddParseResponse,
    ProductContentRequest,
    ProductContentResponse,
    ProductSearchRequest,
    ProductSearchResponse,
    ScanBillRequest,
    ScanBillResponse,
    SmartExpenseParseRequest,
    SmartExpenseParseResponse,
)
from src.services.ai import (
    BillOcrService,
    CatalogService,
    ExpenseParserService,
    InsightService,
)
from src.core.config import settings
from src.core.limiter import limiter
from src.api.deps import require_ai_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI"])


def _ensure_ai_configured() -> None:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured on the server",
        )


@router.post("/completions")
@limiter.limit(settings.AI_RATE_LIMIT)
async def create_completion(
    request: Request,
    payload: CompletionRequest,
    _: str | None = Depends(require_ai_user),
):
    _ensure_ai_configured()

    client = get_gemini_client()

    if payload.stream:
        async def event_generator():
            try:
                async for chunk in client.generate_stream(
                    [message.model_dump() for message in payload.messages],
                    model=payload.model,
                    temperature=payload.temperature,
                    max_output_tokens=payload.maxOutputTokens,
                    response_format=payload.response_format,
                ):
                    chunk_data = {
                        "candidates": [{
                            "content": {
                                "parts": [{
                                    "text": chunk
                                }]
                            }
                        }]
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                yield "data: [DONE]\n\n"
            except Exception:
                logger.exception("Gemini stream completion failed")
                yield f"data: {json.dumps({'error': 'AI provider request failed'})}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    try:
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
            detail="AI provider request failed",
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
            detail="AI provider request failed",
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
            detail="AI provider request failed",
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
            detail="AI provider request failed",
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
            detail="AI provider request failed",
        ) from exc


@router.post("/parse-expense", response_model=SmartExpenseParseResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def parse_expense(
    request: Request,
    payload: SmartExpenseParseRequest,
    _: str | None = Depends(require_ai_user),
) -> SmartExpenseParseResponse:
    _ensure_ai_configured()
    service = ExpenseParserService(get_gemini_client())
    try:
        return await service.parse_smart_expense(payload)
    except (GeminiServiceError, ValueError) as exc:
        logger.exception("Smart expense parsing failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider request failed",
        ) from exc


@router.post("/magic-add", response_model=MagicAddParseResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def magic_add(
    request: Request,
    payload: MagicAddParseRequest,
    _: str | None = Depends(require_ai_user),
) -> MagicAddParseResponse:
    _ensure_ai_configured()
    service = ExpenseParserService(get_gemini_client())
    try:
        return await service.parse_magic_add(payload)
    except (GeminiServiceError, ValueError) as exc:
        logger.exception("Magic add parsing failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider request failed",
        ) from exc


@router.post("/scan-bill", response_model=ScanBillResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def scan_bill(
    request: Request,
    payload: ScanBillRequest,
    _: str | None = Depends(require_ai_user),
) -> ScanBillResponse:
    _ensure_ai_configured()
    service = BillOcrService(get_gemini_client())
    try:
        return await service.scan_bill(payload)
    except (GeminiServiceError, ValueError) as exc:
        logger.exception("Bill OCR scanning failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider request failed",
        ) from exc