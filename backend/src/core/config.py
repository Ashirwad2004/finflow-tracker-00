from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinFlow SaaS API"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://localhost:8080"
    ]
    
    # Supabase credentials (loaded from env)
    VITE_SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    @property
    def SUPABASE_URL(self) -> str:
        return self.VITE_SUPABASE_URL

    @property
    def SUPABASE_KEY(self) -> str:
        return self.SUPABASE_SERVICE_ROLE_KEY
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
