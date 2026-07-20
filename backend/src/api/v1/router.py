from fastapi import APIRouter

from src.api.v1.ai import router as ai_router

from src.api.v1.feature_requests import router as feature_requests_router

api_router = APIRouter()
api_router.include_router(ai_router)

api_router.include_router(feature_requests_router)
