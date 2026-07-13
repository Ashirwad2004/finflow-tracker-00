import sys
import asyncio

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
from src.whatsapp.client import WhatsAppPlaywrightClient

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly start Playwright browser context in the background
    client = WhatsAppPlaywrightClient.get_instance()
    asyncio.create_task(client.start())
    yield
    # Clean up on shutdown
    await client.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self' * 'unsafe-inline' 'unsafe-eval' data: blob:;"
    return response


app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
@limiter.limit("5/minute")
async def health_check(request: Request):
    return {"status": "ok", "message": "Backend runtime initialized!"}