from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FinFlow SaaS API"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ]

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_TEMPERATURE: float = 0.2
    GEMINI_MAX_OUTPUT_TOKENS: int = 2048
    AI_RATE_LIMIT: str = "30/minute"
    AI_AUTH_REQUIRED: bool = False
    SUPABASE_JWT_SECRET: str = ""

    ENVIRONMENT: str = "production"
    SHOW_DOCS: bool = False

    # Supabase service role settings (bypass RLS)
    VITE_SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Payments Gateway Settings
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    PAYMENT_GATEWAY_PROVIDER: str = "mock"


    @property
    def SUPABASE_URL(self) -> str:
        return self.VITE_SUPABASE_URL

    @property
    def SUPABASE_KEY(self) -> str:
        return self.SUPABASE_SERVICE_ROLE_KEY


    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(".env", "../.env", ".env.local", "../.env.local"),
        extra="ignore",
    )


settings = Settings()