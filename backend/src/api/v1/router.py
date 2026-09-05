from fastapi import APIRouter

from src.api.v1.endpoints.ai import router as ai_router
from src.api.v1.endpoints.backup import router as backup_router
from src.api.v1.endpoints.feature_requests import router as feature_requests_router
from src.api.v1.endpoints.payments import router as payments_router
from src.api.v1.endpoints.reports import router as reports_router

api_router = APIRouter()
api_router.include_router(ai_router)
api_router.include_router(feature_requests_router)
api_router.include_router(payments_router)
api_router.include_router(reports_router)
api_router.include_router(backup_router)