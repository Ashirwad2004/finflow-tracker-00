import jwt
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.config import settings
from src.core.supabase import supabase_client

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )
    if supabase_client is None:
        # Fallback to local JWT decode if secret is provided
        if settings.SUPABASE_JWT_SECRET:
            try:
                payload = jwt.decode(
                    credentials.credentials,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated",
                )
                user_id = payload.get("sub")
                if user_id:
                    return {"user_id": user_id, "email": payload.get("email")}
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authorization token",
                ) from exc
        logger.error("Supabase client is not configured on the backend.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable",
        )

    try:
        # Verify token and fetch user details directly from Supabase API
        res = supabase_client.auth.get_user(credentials.credentials)
        user = getattr(res, "user", None) if res else None
        user_id = getattr(user, "id", None) if user else None
        if not user or not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization token",
            )
        return {"user_id": str(user_id), "email": getattr(user, "email", None)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token or session expired",
        ) from exc


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    if credentials is None:
        return None
    return await get_current_user(credentials)


async def require_admin(
    user_info: dict = Depends(get_current_user),
) -> dict:
    user_id = user_info["user_id"]

    if supabase_client is None:
        logger.error("Supabase client is not configured on the backend.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin verification service is temporarily unavailable",
        )

    # Check profiles database table for admin privileges
    try:
        res = supabase_client.table("profiles").select("is_admin").eq("user_id", user_id).execute()
        if res.data and isinstance(res.data, list) and len(res.data) > 0:
            row = res.data[0]
            if isinstance(row, dict) and row.get("is_admin") is True:
                return user_info
    except Exception as exc:
        logger.exception("Failed to check admin status in profiles")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin status verification failed",
        ) from exc

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required",
    )


async def require_ai_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str | None:
    if not settings.AI_AUTH_REQUIRED:
        return None

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    # 1. Primary: Verify token via Supabase client auth API
    if supabase_client is not None:
        try:
            res = supabase_client.auth.get_user(credentials.credentials)
            user = getattr(res, "user", None) if res else None
            user_id = getattr(user, "id", None) if user else None
            if user_id:
                return str(user_id)
        except Exception:
            logger.debug("Supabase auth verification failed, checking local JWT fallback")

    # 2. Secondary fallback: Decode JWT locally if SUPABASE_JWT_SECRET is configured
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                credentials.credentials,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            sub = payload.get("sub")
            if sub:
                return str(sub)
        except jwt.PyJWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization token",
            ) from exc

    # If neither Supabase client nor JWT secret worked, reject
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authorization token or session expired",
    )