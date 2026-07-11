from fastapi import APIRouter
from src.api.v1 import feature_requests

api_router = APIRouter()
api_router.include_router(feature_requests.router)
