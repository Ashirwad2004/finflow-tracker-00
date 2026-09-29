from fastapi import APIRouter

from src.api.v1.endpoints.ai import router as ai_router
from src.api.v1.endpoints.audit import router as audit_router
from src.api.v1.endpoints.backup import router as backup_router
from src.api.v1.endpoints.feature_requests import router as feature_requests_router
from src.api.v1.endpoints.inventory import router as inventory_router
from src.api.v1.endpoints.invoices import router as invoices_router
from src.api.v1.endpoints.parties import router as parties_router
from src.api.v1.endpoints.payments import router as payments_router
from src.api.v1.endpoints.pos import router as pos_router
from src.api.v1.endpoints.purchases import router as purchases_router
from src.api.v1.endpoints.reports import router as reports_router
from src.api.v1.endpoints.settings import router as settings_router
from src.api.v1.endpoints.whatsapp import router as whatsapp_router

api_router = APIRouter()
api_router.include_router(invoices_router)
api_router.include_router(purchases_router)
api_router.include_router(inventory_router)
api_router.include_router(parties_router)
api_router.include_router(audit_router)
api_router.include_router(ai_router)
api_router.include_router(feature_requests_router)
api_router.include_router(payments_router)
api_router.include_router(pos_router)
api_router.include_router(reports_router)
api_router.include_router(settings_router)
api_router.include_router(backup_router)
api_router.include_router(whatsapp_router)