import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status

from src.core.config import settings
from src.core.limiter import limiter
from src.api.deps import get_current_user
from src.schemas.reports import (
    FinancialSummaryRequest,
    FinancialSummaryResponse,
    GSTR1ReportRequest,
    GSTR1ReportResponse,
)
from src.services.reports import ReportsService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/gstr1", response_model=GSTR1ReportResponse)
@limiter.limit("30/minute")
async def generate_gstr1_report(
    request: Request,
    payload: GSTR1ReportRequest,
    _: dict = Depends(get_current_user),
) -> GSTR1ReportResponse:
    try:
        return ReportsService.generate_gstr1_report(payload)
    except Exception as exc:
        logger.exception("Failed to generate GSTR-1 report")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate GSTR-1 tax report",
        ) from exc


@router.post("/financial-summary", response_model=FinancialSummaryResponse)
@limiter.limit("30/minute")
async def get_financial_summary(
    request: Request,
    payload: FinancialSummaryRequest,
    _: dict = Depends(get_current_user),
) -> FinancialSummaryResponse:
    try:
        return ReportsService.generate_financial_summary(payload)
    except Exception as exc:
        logger.exception("Failed to calculate financial summary")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate financial summary",
        ) from exc
