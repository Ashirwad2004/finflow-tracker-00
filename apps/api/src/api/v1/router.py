from fastapi import APIRouter

from src.modules.ai.router import router as ai_router
from src.modules.audit.router import router as audit_router
from src.modules.backup.router import router as backup_router
from src.modules.feature_requests.router import router as feature_requests_router
from src.modules.inventory.router import router as inventory_router
from src.modules.invoices.router import router as invoices_router
from src.modules.parties.router import router as parties_router
from src.modules.payments.router import router as payments_router
from src.modules.pos.router import router as pos_router
from src.modules.purchases.router import router as purchases_router
from src.modules.reports.router import router as reports_router
from src.modules.settings.router import router as settings_router
from src.modules.whatsapp.router import router as whatsapp_router

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