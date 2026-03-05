from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinFlow SaaS API"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    # DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/finflow"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
