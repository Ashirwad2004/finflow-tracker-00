import sys
import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

def win_proactor_loop():
    return getattr(asyncio, "ProactorEventLoop")()

if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.api.v1.router import api_router
from src.core.config import settings
from src.core.limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if (settings.ENVIRONMENT == "development" or settings.SHOW_DOCS) else None,
    docs_url="/docs" if (settings.ENVIRONMENT == "development" or settings.SHOW_DOCS) else None,
    redoc_url="/redoc" if (settings.ENVIRONMENT == "development" or settings.SHOW_DOCS) else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self' https://*.supabase.co; script-src 'self'; style-src 'self' 'unsafe-inline';"
    return response


app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
@limiter.limit("5/minute")
async def health_check(request: Request):
    return {"status": "ok", "message": "Backend runtime initialized!"}
