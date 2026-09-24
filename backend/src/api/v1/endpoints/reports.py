import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status

from src.core.config import settings
from src.core.limiter import limiter
from src.api.deps import get_current_user
from src.schemas.reports import (
    BalanceSheetRequest,
    BalanceSheetResponse,
    CashFlowStatementRequest,
    CashFlowStatementResponse,
    FinancialSummaryRequest,
    FinancialSummaryResponse,
    GSTR1ReportRequest,
    GSTR1ReportResponse,
    GSTR2BReportRequest,
    GSTR2BReportResponse,
    GSTR3BReportRequest,
    GSTR3BSummaryResponse,
    GSTR9AnnualReportResponse,
    GSTR9ReportRequest,
    ProfitAndLossRequest,
    ProfitAndLossResponse,
    ReceivablesAgingRequest,
    ReceivablesAgingResponse,
    TrialBalanceRequest,
    TrialBalanceResponse,
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


@router.post("/gstr2b", response_model=GSTR2BReportResponse)
@limiter.limit("30/minute")
async def generate_gstr2b_report(
    request: Request,
    payload: GSTR2BReportRequest,
    _: dict = Depends(get_current_user),
) -> GSTR2BReportResponse:
    try:
        return ReportsService.generate_gstr2b_report(
            purchases=payload.purchases,
            merchant_gstin=payload.merchant_gstin,
            period=payload.period,
        )
    except Exception as exc:
        logger.exception("Failed to generate GSTR-2B report")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate GSTR-2B ITC report",
        ) from exc


@router.post("/gstr3b", response_model=GSTR3BSummaryResponse)
@limiter.limit("30/minute")
async def generate_gstr3b_summary(
    request: Request,
    payload: GSTR3BReportRequest,
    _: dict = Depends(get_current_user),
) -> GSTR3BSummaryResponse:
    try:
        return ReportsService.generate_gstr3b_summary(
            sales=payload.sales,
            purchases=payload.purchases,
            merchant_gstin=payload.merchant_gstin,
            period=payload.period,
        )
    except Exception as exc:
        logger.exception("Failed to generate GSTR-3B summary")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate GSTR-3B summary",
        ) from exc


@router.post("/gstr9", response_model=GSTR9AnnualReportResponse)
@limiter.limit("30/minute")
async def generate_gstr9_report(
    request: Request,
    payload: GSTR9ReportRequest,
    _: dict = Depends(get_current_user),
) -> GSTR9AnnualReportResponse:
    try:
        return ReportsService.generate_gstr9_report(
            sales=payload.sales,
            purchases=payload.purchases,
            merchant_gstin=payload.merchant_gstin,
            financial_year=payload.financial_year,
        )
    except Exception as exc:
        logger.exception("Failed to generate GSTR-9 report")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate GSTR-9 annual report",
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


@router.post("/profit-and-loss", response_model=ProfitAndLossResponse)
@limiter.limit("30/minute")
async def generate_profit_and_loss(
    request: Request,
    payload: ProfitAndLossRequest,
    _: dict = Depends(get_current_user),
) -> ProfitAndLossResponse:
    try:
        return ReportsService.generate_profit_and_loss(
            sales=payload.sales,
            purchases=payload.purchases,
            expenses=payload.expenses,
            products=payload.products,
            direct_expense_categories=payload.direct_expense_categories,
        )
    except Exception as exc:
        logger.exception("Failed to generate Profit and Loss report")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Profit and Loss report",
        ) from exc


@router.post("/trial-balance", response_model=TrialBalanceResponse)
@limiter.limit("30/minute")
async def generate_trial_balance(
    request: Request,
    payload: TrialBalanceRequest,
    _: dict = Depends(get_current_user),
) -> TrialBalanceResponse:
    try:
        return ReportsService.generate_trial_balance(
            sales=payload.sales,
            purchases=payload.purchases,
            expenses=payload.expenses,
            products=payload.products,
            parties=payload.parties,
            lent=payload.lent,
            borrowed=payload.borrowed,
        )
    except Exception as exc:
        logger.exception("Failed to generate Trial Balance")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Trial Balance",
        ) from exc


@router.post("/balance-sheet", response_model=BalanceSheetResponse)
@limiter.limit("30/minute")
async def generate_balance_sheet(
    request: Request,
    payload: BalanceSheetRequest,
    _: dict = Depends(get_current_user),
) -> BalanceSheetResponse:
    try:
        return ReportsService.generate_balance_sheet(
            sales=payload.sales,
            purchases=payload.purchases,
            expenses=payload.expenses,
            products=payload.products,
            parties=payload.parties,
            lent=payload.lent,
            borrowed=payload.borrowed,
        )
    except Exception as exc:
        logger.exception("Failed to generate Balance Sheet")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Balance Sheet",
        ) from exc


@router.post("/receivables-aging", response_model=ReceivablesAgingResponse)
@limiter.limit("30/minute")
async def generate_receivables_aging(
    request: Request,
    payload: ReceivablesAgingRequest,
    _: dict = Depends(get_current_user),
) -> ReceivablesAgingResponse:
    try:
        return ReportsService.generate_receivables_aging(
            sales=payload.sales,
            ref_date=payload.ref_date,
        )
    except Exception as exc:
        logger.exception("Failed to generate Receivables Aging")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Receivables Aging",
        ) from exc


@router.post("/cash-flow", response_model=CashFlowStatementResponse)
@limiter.limit("30/minute")
async def generate_cash_flow(
    request: Request,
    payload: CashFlowStatementRequest,
    _: dict = Depends(get_current_user),
) -> CashFlowStatementResponse:
    try:
        return ReportsService.generate_cash_flow(
            sales=payload.sales,
            purchases=payload.purchases,
            expenses=payload.expenses,
            lent=payload.lent,
            borrowed=payload.borrowed,
        )
    except Exception as exc:
        logger.exception("Failed to generate Cash Flow Statement")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Cash Flow Statement",
        ) from exc
