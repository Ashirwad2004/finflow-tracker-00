import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from src.api.deps import get_current_user
from src.core.limiter import limiter
from src.modules.backup.service import BackupService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/backup", tags=["Backup & Export"])


@router.get("/health")
async def backup_health():
    return {"status": "ok", "service": "FinFlow Backup & Export API"}


@router.post("/export")
@limiter.limit("5/minute")
async def export_user_data(
    request: Request,
    user_info: dict = Depends(get_current_user),
):
    user_id = user_info.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid authenticated user required for data export",
        )

    backup_payload, filename = BackupService.export_user_data(
        user_id=user_id,
        user_email=user_info.get("email"),
    )

    return JSONResponse(
        content=backup_payload,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
